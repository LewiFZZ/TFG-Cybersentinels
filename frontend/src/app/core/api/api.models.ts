/**
 * Tipos de la API de URLSentinel.
 * Copiados de docs/API-FRONTEND.md (apartado 3): coinciden con lo que devuelve el backend.
 * La especificación formal está en docs/openapi.json.
 */

export type RiskClassification = 'safe' | 'suspicious' | 'malicious';
export type AnalysisStatus = 'pending' | 'completed' | 'partial' | 'failed';

export interface TriggeredRule {
  code: string; // 'BRAND_IMPERSONATION', 'IP_HOST'...
  weight: number; // puntos que suma al score
  description: string; // texto para el usuario, en castellano
  details: Record<string, unknown> | null; // evidencia
}

export type ReputationSource = 'virustotal' | 'google_safe_browsing' | 'phishtank';
export type CheckStatus = 'ok' | 'timeout' | 'rate_limited' | 'error';

/** Resultado de una fuente externa de reputación (VirusTotal, Safe Browsing). */
export interface ReputationCheck {
  source: ReputationSource;
  status: CheckStatus; // 'ok' o el motivo del fallo
  malicious: boolean | null; // true peligrosa · false limpia · null sin datos/error
  weight: number; // puntos que suma al score (0 si falló)
  details: Record<string, unknown> | null; // evidencia; con fallo, { error }
  responseTimeMs: number | null;
  cached: boolean; // reutilizado de un análisis reciente de la misma URL
}

export interface ScoreBreakdown {
  heuristics: number; // suma de pesos de las reglas propias
  reputation: number; // suma de pesos de las fuentes externas
}

export interface AnalysisResponse {
  id: string;
  url: string; // tal cual la escribió el usuario
  normalizedUrl: string; // forma canónica
  domain: string; // host analizado (lo que hay que mostrar destacado)
  score: number; // 0–100 = min(100, heuristics + reputation)
  scoreBreakdown: ScoreBreakdown;
  classification: RiskClassification;
  status: AnalysisStatus; // 'partial' si alguna fuente externa no respondió
  summary: string | null;
  heuristics: TriggeredRule[]; // ordenadas por peso desc. Vacío = nada sospechoso
  reputation: ReputationCheck[]; // vacío si no hay API keys configuradas
  durationMs: number | null;
  createdAt: string; // ISO 8601 UTC
}

export interface ReputationSourceInfo {
  source: ReputationSource;
  name: string; // 'VirusTotal', 'Google Safe Browsing'
  configured: boolean; // false = sin API key, no se consulta
}

export interface AnalysisListItem {
  id: string;
  url: string;
  domain: string;
  score: number | null;
  classification: RiskClassification | null;
  status: AnalysisStatus;
  createdAt: string;
}

export interface AnalysisPage {
  items: AnalysisListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatsTotals {
  analyses: number;
  safe: number;
  suspicious: number;
  malicious: number;
  averageScore: number;
}

export interface DailyStat {
  date: string; // 'YYYY-MM-DD' (UTC), un elemento por día, también los días a 0
  total: number;
  safe: number;
  suspicious: number;
  malicious: number;
}

export interface TopRule {
  code: string;
  description: string;
  count: number;
}

export interface TopDomain {
  domain: string;
  count: number;
  maxScore: number;
}

export interface RecentThreat {
  id: string;
  url: string;
  score: number;
  classification: Exclude<RiskClassification, 'safe'>;
  createdAt: string;
}

export interface StatsResponse {
  days: number;
  since: string;
  totals: StatsTotals;
  daily: DailyStat[];
  topRules: TopRule[];
  topDomains: TopDomain[];
  recentThreats: RecentThreat[];
}

export interface HeuristicRule {
  code: string;
  weight: number;
  description: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[]; // ¡puede ser texto o lista!
}
