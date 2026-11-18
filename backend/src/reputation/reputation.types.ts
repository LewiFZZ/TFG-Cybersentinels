import type { NormalizedUrl } from '../heuristics/url-normalizer.js';
import {
  CheckStatus,
  ReputationSource,
} from '../url-analysis/entities/reputation-check.entity.js';

export const REPUTATION_PROVIDERS = Symbol('REPUTATION_PROVIDERS');
export const REPUTATION_CONFIG = Symbol('REPUTATION_CONFIG');
export const HTTP_FETCH = Symbol('HTTP_FETCH');

export type HttpFetch = typeof fetch;

export interface ReputationConfig {
  virusTotalApiKey: string;
  safeBrowsingApiKey: string;
  /** Tiempo máximo por API (ms). */
  timeoutMs: number;
  /** Horas que se reutiliza un resultado para la misma URL. */
  cacheHours: number;
  /** Solo para pruebas: URL base alternativa de cada API. */
  virusTotalBaseUrl: string;
  safeBrowsingBaseUrl: string;
}

/** Resultado de consultar una fuente de reputación. */
export interface ReputationVerdict {
  /** true = la fuente la considera peligrosa, false = limpia, null = sin datos. */
  malicious: boolean | null;
  /** Puntos que suma al score de riesgo (0–100). */
  weight: number;
  /** Evidencia resumida para el usuario. */
  details: Record<string, unknown> | null;
  /** Respuesta relevante de la API (se guarda en BD). */
  raw: Record<string, unknown> | null;
}

export interface ReputationOutcome extends ReputationVerdict {
  source: ReputationSource;
  status: CheckStatus;
  responseTimeMs: number | null;
  /** Reutilizado de un análisis reciente de la misma URL. */
  cached: boolean;
}

export interface ReputationProvider {
  readonly source: ReputationSource;
  readonly label: string;
  /** false si no hay API key: no se consulta. */
  readonly configured: boolean;
  check(url: NormalizedUrl, signal: AbortSignal): Promise<ReputationVerdict>;
}

/** Error controlado de una API externa, con el estado que se guardará. */
export class ReputationError extends Error {
  constructor(
    readonly status: CheckStatus,
    message: string,
  ) {
    super(message);
  }
}

/** Traduce un código HTTP de error de una API externa a ReputationError. */
export function httpError(label: string, status: number): ReputationError {
  if (status === 429) {
    return new ReputationError(
      CheckStatus.RATE_LIMITED,
      `${label}: cuota de peticiones agotada (429)`,
    );
  }
  if (status === 401 || status === 403) {
    return new ReputationError(
      CheckStatus.ERROR,
      `${label}: API key no válida o sin permisos (${status})`,
    );
  }
  return new ReputationError(
    CheckStatus.ERROR,
    `${label}: respuesta inesperada (${status})`,
  );
}
