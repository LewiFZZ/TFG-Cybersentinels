import { Inject, Injectable } from '@nestjs/common';
import { RiskClassification } from '../url-analysis/entities/analysis-result.entity.js';
import type { HeuristicRule } from './rules/heuristic-rule.js';
import { type NormalizedUrl, normalizeUrl } from './url-normalizer.js';

export const HEURISTIC_RULES = Symbol('HEURISTIC_RULES');

export interface TriggeredRule {
  code: string;
  weight: number;
  description: string;
  details: Record<string, unknown> | null;
}

export interface HeuristicReport {
  url: NormalizedUrl;
  score: number;
  classification: RiskClassification;
  triggered: TriggeredRule[];
}

/** Rangos de la memoria técnica (apartado 3.6). */
export function classify(score: number): RiskClassification {
  if (score >= 70) return RiskClassification.MALICIOUS;
  if (score >= 40) return RiskClassification.SUSPICIOUS;
  return RiskClassification.SAFE;
}

@Injectable()
export class HeuristicsService {
  private readonly byCode: Map<string, HeuristicRule>;

  constructor(
    @Inject(HEURISTIC_RULES) private readonly rules: HeuristicRule[],
  ) {
    this.byCode = new Map(rules.map((r) => [r.code, r]));
  }

  /** Normaliza y analiza. Lanza InvalidUrlError si la URL no es válida. */
  analyze(input: string): HeuristicReport {
    return this.analyzeNormalized(normalizeUrl(input));
  }

  analyzeNormalized(url: NormalizedUrl): HeuristicReport {
    const triggered: TriggeredRule[] = [];

    for (const rule of this.rules) {
      let match;
      try {
        match = rule.evaluate(url);
      } catch {
        continue; // una regla defectuosa no debe tumbar el análisis
      }
      if (!match) continue;
      triggered.push({
        code: rule.code,
        weight: match.weight ?? rule.weight,
        description: rule.description,
        details: match.details ?? null,
      });
    }

    triggered.sort((a, b) => b.weight - a.weight);
    const score = Math.min(
      100,
      triggered.reduce((sum, r) => sum + r.weight, 0),
    );

    return { url, score, classification: classify(score), triggered };
  }

  /** Descripción de una regla por su código (para reconstruir resultados guardados). */
  describe(code: string): string {
    return this.byCode.get(code)?.description ?? code;
  }

  listRules(): Pick<HeuristicRule, 'code' | 'weight' | 'description'>[] {
    return this.rules.map(({ code, weight, description }) => ({
      code,
      weight,
      description,
    }));
  }
}
