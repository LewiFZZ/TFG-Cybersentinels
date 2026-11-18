import type { NormalizedUrl } from '../url-normalizer.js';

export interface RuleMatch {
  /** Peso aplicado. Si se omite se usa el `weight` de la regla. */
  weight?: number;
  /** Evidencia concreta que justifica el resultado (se guarda en BD como JSONB). */
  details?: Record<string, unknown>;
}

export interface HeuristicRule {
  /** Identificador estable, en MAYÚSCULAS. Se guarda en heuristic_results.rule_code. */
  code: string;
  /** Peso por defecto (0–100) que suma al score si la regla se activa. */
  weight: number;
  /** Explicación para el usuario final. */
  description: string;
  /** Devuelve null si la regla no se activa. */
  evaluate(url: NormalizedUrl): RuleMatch | null;
}
