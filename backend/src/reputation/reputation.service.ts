import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { performance } from 'node:perf_hooks';
import { DataSource, Repository } from 'typeorm';
import type { NormalizedUrl } from '../heuristics/url-normalizer.js';
import {
  Incident,
  IncidentSeverity,
  IncidentType,
} from '../incidents/entities/incident.entity.js';
import {
  CheckStatus,
  ReputationSource,
} from '../url-analysis/entities/reputation-check.entity.js';
import {
  REPUTATION_CONFIG,
  REPUTATION_PROVIDERS,
  ReputationError,
  type ReputationConfig,
  type ReputationOutcome,
  type ReputationProvider,
} from './reputation.types.js';

/** Cómo se guarda cada consulta en reputation_checks.raw_response. */
export interface StoredReputation {
  details: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  cached: boolean;
}

interface CachedRow {
  source: ReputationSource;
  malicious: boolean | null;
  score: number | null;
  raw_response: StoredReputation | null;
  response_time_ms: number | null;
}

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    @Inject(REPUTATION_PROVIDERS)
    private readonly providers: ReputationProvider[],
    @Inject(REPUTATION_CONFIG) private readonly config: ReputationConfig,
    private readonly dataSource: DataSource,
    @InjectRepository(Incident)
    private readonly incidents: Repository<Incident>,
  ) {}

  /** Fuentes disponibles y si tienen API key configurada. */
  sources() {
    return this.providers.map((p) => ({
      source: p.source,
      name: p.label,
      configured: p.configured,
    }));
  }

  /**
   * Consulta en paralelo las fuentes configuradas. Nunca lanza: si una API
   * falla, su resultado lleva status timeout/rate_limited/error y peso 0.
   */
  async check(url: NormalizedUrl): Promise<ReputationOutcome[]> {
    const active = this.providers.filter((p) => p.configured);
    if (!active.length) return [];

    const cached = await this.fromCache(
      url.hash,
      active.map((p) => p.source),
    );
    const outcomes = await Promise.all(
      active.map(async (p) => cached.get(p.source) ?? this.query(p, url)),
    );

    await this.recordIncidents(outcomes, url);
    return outcomes;
  }

  private async query(
    provider: ReputationProvider,
    url: NormalizedUrl,
  ): Promise<ReputationOutcome> {
    const start = performance.now();
    const elapsed = () => Math.round(performance.now() - start);
    try {
      const verdict = await provider.check(
        url,
        AbortSignal.timeout(this.config.timeoutMs),
      );
      return {
        ...verdict,
        source: provider.source,
        status: CheckStatus.OK,
        responseTimeMs: elapsed(),
        cached: false,
      };
    } catch (err) {
      const isTimeout =
        err instanceof Error &&
        (err.name === 'TimeoutError' || err.name === 'AbortError');
      const status = isTimeout
        ? CheckStatus.TIMEOUT
        : err instanceof ReputationError
          ? err.status
          : CheckStatus.ERROR;
      const message = isTimeout
        ? `${provider.label}: sin respuesta en ${this.config.timeoutMs} ms`
        : err instanceof Error
          ? err.message
          : String(err);
      this.logger.warn(message);
      return {
        source: provider.source,
        status,
        malicious: null,
        weight: 0,
        details: { error: message },
        raw: null,
        responseTimeMs: elapsed(),
        cached: false,
      };
    }
  }

  /** Último resultado correcto de cada fuente para la misma URL dentro del TTL. */
  private async fromCache(
    urlHash: string,
    sources: ReputationSource[],
  ): Promise<Map<ReputationSource, ReputationOutcome>> {
    const map = new Map<ReputationSource, ReputationOutcome>();
    if (this.config.cacheHours <= 0) return map;

    const rows = await this.dataSource.query<CachedRow[]>(
      `SELECT DISTINCT ON (c.source)
              c.source, c.malicious, c.score, c.raw_response, c.response_time_ms
         FROM reputation_checks c
         JOIN url_analyses a ON a.id = c.analysis_id
        WHERE a.url_hash = $1
          AND c.status = 'ok'
          AND c.source = ANY($2::reputation_source[])
          AND c.created_at >= now() - make_interval(hours => $3)
        ORDER BY c.source, c.created_at DESC`,
      [urlHash, sources, this.config.cacheHours],
    );

    for (const r of rows) {
      map.set(r.source, {
        source: r.source,
        status: CheckStatus.OK,
        malicious: r.malicious,
        weight: r.score ?? 0,
        details: r.raw_response?.details ?? null,
        raw: r.raw_response?.response ?? null,
        responseTimeMs: r.response_time_ms,
        cached: true,
      });
    }
    return map;
  }

  /** Cada fallo de una API externa queda registrado como incidencia. */
  private async recordIncidents(
    outcomes: ReputationOutcome[],
    url: NormalizedUrl,
  ): Promise<void> {
    const failed = outcomes.filter((o) => o.status !== CheckStatus.OK);
    if (!failed.length) return;

    const type: Record<string, IncidentType> = {
      [CheckStatus.TIMEOUT]: IncidentType.API_TIMEOUT,
      [CheckStatus.RATE_LIMITED]: IncidentType.RATE_LIMIT,
      [CheckStatus.ERROR]: IncidentType.API_ERROR,
    };
    try {
      await this.incidents.insert(
        failed.map((o) => ({
          type: type[o.status] ?? IncidentType.API_ERROR,
          severity:
            o.status === CheckStatus.ERROR
              ? IncidentSeverity.MEDIUM
              : IncidentSeverity.LOW,
          source: o.source,
          message:
            typeof o.details?.error === 'string' ? o.details.error : o.status,
          // Solo el dominio: no se guarda la URL completa en las incidencias.
          metadata: { domain: url.hostname, status: o.status },
        })),
      );
    } catch (err) {
      this.logger.error(`No se pudo registrar la incidencia: ${String(err)}`);
    }
  }
}
