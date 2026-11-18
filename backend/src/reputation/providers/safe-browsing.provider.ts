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

/** Puntos si la URL aparece en las listas de Google (alta fiabilidad). */
export const SAFE_BROWSING_WEIGHT = 70;

const THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
  'POTENTIALLY_HARMFUL_APPLICATION',
];

/** Google Safe Browsing Lookup API v4 (threatMatches:find). */
@Injectable()
export class SafeBrowsingProvider implements ReputationProvider {
  readonly source = ReputationSource.GOOGLE_SAFE_BROWSING;
  readonly label = 'Google Safe Browsing';

  constructor(
    @Inject(REPUTATION_CONFIG) private readonly config: ReputationConfig,
    @Inject(HTTP_FETCH) private readonly http: HttpFetch,
  ) {}

  get configured(): boolean {
    return this.config.safeBrowsingApiKey.length > 0;
  }

  async check(
    url: NormalizedUrl,
    signal: AbortSignal,
  ): Promise<ReputationVerdict> {
    const endpoint = new URL(
      '/v4/threatMatches:find',
      this.config.safeBrowsingBaseUrl,
    );
    endpoint.searchParams.set('key', this.config.safeBrowsingApiKey);

    const res = await this.http(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'urlsentinel', clientVersion: '0.1.0' },
        threatInfo: {
          threatTypes: THREAT_TYPES,
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: url.normalized }],
        },
      }),
      signal,
    });
    if (!res.ok) throw httpError(this.label, res.status);

    const body = (await res.json()) as { matches?: { threatType?: string }[] };
    const matches = body.matches ?? [];
    const threatTypes = [
      ...new Set(matches.map((m) => m.threatType).filter(Boolean)),
    ] as string[];

    return matches.length
      ? {
          malicious: true,
          weight: SAFE_BROWSING_WEIGHT,
          details: { threatTypes },
          raw: { matches },
        }
      : { malicious: false, weight: 0, details: { threatTypes: [] }, raw: {} };
  }
}
