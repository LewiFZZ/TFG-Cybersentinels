import { Inject, Injectable } from '@nestjs/common';
import type { NormalizedUrl } from '../../heuristics/url-normalizer.js';
import { ReputationSource } from '../../url-analysis/entities/reputation-check.entity.js';
import {
  HTTP_FETCH,
  type HttpFetch,
  httpError,
  REPUTATION_CONFIG,
  type ReputationConfig,
  type ReputationProvider,
  type ReputationVerdict,
} from '../reputation.types.js';

interface AnalysisStats {
  malicious?: number;
  suspicious?: number;
  harmless?: number;
  undetected?: number;
  timeout?: number;
}

/** Puntos según cuántos motores antivirus marcan la URL. */
export function virusTotalWeight(stats: AnalysisStats): number {
  const malicious = stats.malicious ?? 0;
  const suspicious = stats.suspicious ?? 0;
  if (malicious >= 5) return 60;
  if (malicious >= 2) return 40;
  if (malicious === 1 || suspicious >= 2) return 20;
  return 0;
}

/** Identificador de URL de VirusTotal: base64url sin relleno. */
export function virusTotalUrlId(url: string): string {
  return Buffer.from(url).toString('base64url');
}

/**
 * VirusTotal API v3: consulta el informe existente de una URL.
 * Solo se PREGUNTA por la URL (GET), no se envía a analizar: así la consulta
 * es inmediata y la URL no se comparte con la comunidad de VirusTotal.
 */
@Injectable()
export class VirusTotalProvider implements ReputationProvider {
  readonly source = ReputationSource.VIRUSTOTAL;
  readonly label = 'VirusTotal';

  constructor(
    @Inject(REPUTATION_CONFIG) private readonly config: ReputationConfig,
    @Inject(HTTP_FETCH) private readonly http: HttpFetch,
  ) {}

  get configured(): boolean {
    return this.config.virusTotalApiKey.length > 0;
  }

  async check(
    url: NormalizedUrl,
    signal: AbortSignal,
  ): Promise<ReputationVerdict> {
    const id = virusTotalUrlId(url.normalized);
    const res = await this.http(
      `${this.config.virusTotalBaseUrl}/api/v3/urls/${id}`,
      {
        headers: {
          'x-apikey': this.config.virusTotalApiKey,
          accept: 'application/json',
        },
        signal,
      },
    );

    // 404: VirusTotal nunca ha analizado esta URL -> sin datos, no suma.
    if (res.status === 404) {
      return {
        malicious: null,
        weight: 0,
        details: { known: false },
        raw: null,
      };
    }
    if (!res.ok) throw httpError(this.label, res.status);

    const body = (await res.json()) as {
      data?: { attributes?: Record<string, unknown> };
    };
    const attrs = body.data?.attributes ?? {};
    const stats = (attrs.last_analysis_stats ?? {}) as AnalysisStats;
    const engines = Object.values(stats).reduce<number>(
      (sum, n) => sum + (typeof n === 'number' ? n : 0),
      0,
    );

    return {
      malicious: (stats.malicious ?? 0) > 0,
      weight: virusTotalWeight(stats),
      details: {
        known: true,
        malicious: stats.malicious ?? 0,
        suspicious: stats.suspicious ?? 0,
        harmless: stats.harmless ?? 0,
        engines,
        link: `https://www.virustotal.com/gui/url/${id}`,
      },
      raw: {
        last_analysis_stats: stats,
        last_analysis_date: attrs.last_analysis_date ?? null,
        reputation: attrs.reputation ?? null,
        total_votes: attrs.total_votes ?? null,
      },
    };
  }
}
