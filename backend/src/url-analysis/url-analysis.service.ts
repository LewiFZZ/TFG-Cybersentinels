import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { performance } from 'node:perf_hooks';
import { DataSource, Repository } from 'typeorm';
import {
  HeuristicReport,
  HeuristicsService,
} from '../heuristics/heuristics.service.js';
import { InvalidUrlError } from '../heuristics/url-normalizer.js';
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
import { AnalysisStatus, UrlAnalysis } from './entities/url-analysis.entity.js';

const LABELS: Record<RiskClassification, string> = {
  [RiskClassification.SAFE]: 'Seguro',
  [RiskClassification.SUSPICIOUS]: 'Sospechoso',
  [RiskClassification.MALICIOUS]: 'Malicioso',
};

@Injectable()
export class UrlAnalysisService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly heuristics: HeuristicsService,
    @InjectRepository(UrlAnalysis)
    private readonly analyses: Repository<UrlAnalysis>,
  ) {}

  /** Analiza la URL con la heurística propia y guarda la operación. */
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

    const durationMs = Math.round(performance.now() - start);
    const summary = this.buildSummary(report);

    // Una sola transacción: o se guarda el análisis completo o nada.
    const saved = await this.dataSource.transaction(async (em) => {
      const analysis = await em.save(
        em.create(UrlAnalysis, {
          url: report.url.original,
          normalizedUrl: report.url.normalized,
          urlHash: report.url.hash,
          domain: report.url.hostname,
          status: AnalysisStatus.COMPLETED,
          score: report.score,
          durationMs,
        }),
      );

      const result = await em.save(
        em.create(AnalysisResult, {
          analysisId: analysis.id,
          classification: report.classification,
          score: report.score,
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

      return { analysis, result };
    });

    return {
      id: saved.analysis.id,
      url: saved.analysis.url,
      normalizedUrl: saved.analysis.normalizedUrl,
      domain: saved.analysis.domain,
      score: report.score,
      classification: report.classification,
      status: saved.analysis.status,
      summary,
      heuristics: report.triggered,
      durationMs,
      createdAt: saved.analysis.createdAt,
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
      relations: { result: true, heuristicResults: true },
    });
    if (!a) throw new NotFoundException('Análisis no encontrado');

    return {
      id: a.id,
      url: a.url,
      normalizedUrl: a.normalizedUrl,
      domain: a.domain,
      score: a.score ?? 0,
      classification: a.result?.classification ?? RiskClassification.SAFE,
      status: a.status,
      summary: a.result?.summary ?? null,
      heuristics: a.heuristicResults
        .sort((x, y) => y.weight - x.weight)
        .map((h) => ({
          code: h.ruleCode,
          weight: h.weight,
          description: this.heuristics.describe(h.ruleCode),
          details: h.details,
        })),
      durationMs: a.durationMs,
      createdAt: a.createdAt,
    };
  }

  /** Borra un análisis (y en cascada su resultado y reglas). */
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

  private buildSummary(report: HeuristicReport): string {
    const label = LABELS[report.classification];
    const n = report.triggered.length;
    if (n === 0)
      return `${label}: no se ha detectado ningún indicador de riesgo`;
    const codes = report.triggered.map((r) => r.code).join(', ');
    return `${label}: ${n} indicador${n === 1 ? '' : 'es'} de riesgo (${codes})`;
  }
}
