import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { performance } from 'node:perf_hooks';
import { DataSource, Repository } from 'typeorm';
import {
  classify,
  HeuristicReport,
  HeuristicsService,
} from '../heuristics/heuristics.service.js';
import { InvalidUrlError } from '../heuristics/url-normalizer.js';
import type { ReputationCheckDto } from '../reputation/dto/reputation.dto.js';
import {
  ReputationService,
  type StoredReputation,
} from '../reputation/reputation.service.js';
import type { ReputationOutcome } from '../reputation/reputation.types.js';
import type {
  AnalysisListItemDto,
  AnalysisPageDto,
  AnalysisResponseDto,
} from './dto/analysis-response.dto.js';
import {
  AnalysisResult,
  RiskClassification,
} from './entities/analysis-result.entity.js';
import { HeuristicResult } from './entities/heuristic-result.entity.js';
import {
  CheckStatus,
  ReputationCheck,
  ReputationSource,
} from './entities/reputation-check.entity.js';
import { AnalysisStatus, UrlAnalysis } from './entities/url-analysis.entity.js';

const LABELS: Record<RiskClassification, string> = {
  [RiskClassification.SAFE]: 'Seguro',
  [RiskClassification.SUSPICIOUS]: 'Sospechoso',
  [RiskClassification.MALICIOUS]: 'Malicioso',
};

const SOURCE_NAMES: Record<ReputationSource, string> = {
  [ReputationSource.VIRUSTOTAL]: 'VirusTotal',
  [ReputationSource.GOOGLE_SAFE_BROWSING]: 'Google Safe Browsing',
  [ReputationSource.PHISHTANK]: 'PhishTank',
};

const sumWeights = (items: { weight: number }[]) =>
  items.reduce((sum, i) => sum + i.weight, 0);

@Injectable()
export class UrlAnalysisService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly heuristics: HeuristicsService,
    private readonly reputation: ReputationService,
    @InjectRepository(UrlAnalysis)
    private readonly analyses: Repository<UrlAnalysis>,
  ) {}

  /**
   * Analiza la URL y guarda la operación.
   * Score = heurística propia + reputación externa (VirusTotal, Safe Browsing),
   * con tope en 100. Si alguna API falla, el resultado se marca como parcial.
   */
  async analyze(rawUrl: string): Promise<AnalysisResponseDto> {
    const start = performance.now();

    let report: HeuristicReport;
    try {
      report = this.heuristics.analyze(rawUrl);
    } catch (err) {
      if (err instanceof InvalidUrlError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const reputation = await this.reputation.check(report.url);

    const heuristicsScore = report.score;
    const reputationScore = sumWeights(reputation);
    const score = Math.min(100, heuristicsScore + reputationScore);
    const classification = classify(score);
    const status = reputation.some((r) => r.status !== CheckStatus.OK)
      ? AnalysisStatus.PARTIAL
      : AnalysisStatus.COMPLETED;
    const durationMs = Math.round(performance.now() - start);
    const summary = this.buildSummary(report, reputation, classification);

    // Una sola transacción: o se guarda el análisis completo o nada.
    const saved = await this.dataSource.transaction(async (em) => {
      const analysis = await em.save(
        em.create(UrlAnalysis, {
          url: report.url.original,
          normalizedUrl: report.url.normalized,
          urlHash: report.url.hash,
          domain: report.url.hostname,
          status,
          score,
          durationMs,
        }),
      );

      await em.save(
        em.create(AnalysisResult, {
          analysisId: analysis.id,
          classification,
          score,
          summary,
        }),
      );

      if (report.triggered.length) {
        await em.save(
          em.create(
            HeuristicResult,
            report.triggered.map((r) => ({
              analysisId: analysis.id,
              ruleCode: r.code,
              weight: r.weight,
              details: r.details,
            })),
          ),
        );
      }

      if (reputation.length) {
        await em.save(
          em.create(
            ReputationCheck,
            reputation.map((r) => ({
              analysisId: analysis.id,
              source: r.source,
              status: r.status,
              malicious: r.malicious,
              score: r.weight,
              rawResponse: {
                details: r.details,
                response: r.raw,
                cached: r.cached,
              } satisfies StoredReputation as Record<string, unknown>,
              responseTimeMs: r.responseTimeMs,
            })),
          ),
        );
      }

      return analysis;
    });

    return {
      id: saved.id,
      url: saved.url,
      normalizedUrl: saved.normalizedUrl,
      domain: saved.domain,
      score,
      scoreBreakdown: {
        heuristics: heuristicsScore,
        reputation: reputationScore,
      },
      classification,
      status: saved.status,
      summary,
      heuristics: report.triggered,
      reputation: reputation.map((r) => this.toReputationDto(r)),
      durationMs,
      createdAt: saved.createdAt,
    };
  }

  /** Historial paginado, del más reciente al más antiguo. */
  async findRecent(limit: number, offset: number): Promise<AnalysisPageDto> {
    const [rows, total] = await this.analyses
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.result', 'r')
      .orderBy('a.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    const items: AnalysisListItemDto[] = rows.map((a) => ({
      id: a.id,
      url: a.url,
      domain: a.domain,
      score: a.score,
      classification: a.result?.classification ?? null,
      status: a.status,
      createdAt: a.createdAt,
    }));
    return { items, total, limit, offset };
  }

  async findOne(id: string): Promise<AnalysisResponseDto> {
    const a = await this.analyses.findOne({
      where: { id },
      relations: {
        result: true,
        heuristicResults: true,
        reputationChecks: true,
      },
    });
    if (!a) throw new NotFoundException('Análisis no encontrado');

    const heuristics = a.heuristicResults
      .sort((x, y) => y.weight - x.weight)
      .map((h) => ({
        code: h.ruleCode,
        weight: h.weight,
        description: this.heuristics.describe(h.ruleCode),
        details: h.details,
      }));
    const reputation = a.reputationChecks
      .sort((x, y) => x.source.localeCompare(y.source))
      .map((c) => {
        const stored = c.rawResponse as StoredReputation | null;
        return {
          source: c.source,
          status: c.status,
          malicious: c.malicious,
          weight: c.score ?? 0,
          details: stored?.details ?? null,
          responseTimeMs: c.responseTimeMs,
          cached: stored?.cached ?? false,
        };
      });

    return {
      id: a.id,
      url: a.url,
      normalizedUrl: a.normalizedUrl,
      domain: a.domain,
      score: a.score ?? 0,
      scoreBreakdown: {
        heuristics: sumWeights(heuristics),
        reputation: sumWeights(reputation),
      },
      classification: a.result?.classification ?? RiskClassification.SAFE,
      status: a.status,
      summary: a.result?.summary ?? null,
      heuristics,
      reputation,
      durationMs: a.durationMs,
      createdAt: a.createdAt,
    };
  }

  /** Borra un análisis (y en cascada su resultado, reglas y reputación). */
  async remove(id: string): Promise<void> {
    const { affected } = await this.analyses.delete({ id });
    if (!affected) throw new NotFoundException('Análisis no encontrado');
  }

  /** Vacía todo el historial. Devuelve cuántos análisis se borraron. */
  async clear(): Promise<number> {
    const { affected } = await this.analyses
      .createQueryBuilder()
      .delete()
      .execute();
    return affected ?? 0;
  }

  private toReputationDto(r: ReputationOutcome): ReputationCheckDto {
    return {
      source: r.source,
      status: r.status,
      malicious: r.malicious,
      weight: r.weight,
      details: r.details,
      responseTimeMs: r.responseTimeMs,
      cached: r.cached,
    };
  }

  private buildSummary(
    report: HeuristicReport,
    reputation: ReputationOutcome[],
    classification: RiskClassification,
  ): string {
    const parts: string[] = [];
    const n = report.triggered.length;
    if (n) {
      const codes = report.triggered.map((r) => r.code).join(', ');
      parts.push(`${n} indicador${n === 1 ? '' : 'es'} de riesgo (${codes})`);
    }
    for (const r of reputation.filter((x) => x.malicious)) {
      parts.push(`${SOURCE_NAMES[r.source]} la marca como peligrosa`);
    }
    const failed = reputation.filter((r) => r.status !== CheckStatus.OK);
    const partial = failed.length
      ? ` (sin respuesta de ${failed.map((r) => SOURCE_NAMES[r.source]).join(' y ')})`
      : '';

    const label = LABELS[classification];
    if (!parts.length) {
      return `${label}: no se ha detectado ningún indicador de riesgo${partial}`;
    }
    return `${label}: ${parts.join('; ')}${partial}`;
  }
}
