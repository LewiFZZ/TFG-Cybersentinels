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

export interface AnalysisResponse {
  id: string;
  url: string; // tal cual la escribió el usuario
  normalizedUrl: string; // forma canónica
  domain: string; // host analizado (lo que hay que mostrar destacado)
  score: number; // 0–100
  classification: RiskClassification;
  status: AnalysisStatus;
  summary: string | null;
  heuristics: TriggeredRule[]; // ordenadas por peso desc. Vacío = nada sospechoso
  durationMs: number | null;
  createdAt: string; // ISO 8601 UTC
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
