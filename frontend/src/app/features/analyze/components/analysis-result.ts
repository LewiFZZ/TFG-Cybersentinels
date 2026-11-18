import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { AnalysisResponse } from '../../../core/api/api.models';
import { CLASSIFICATION_HINTS, detailPairs } from '../../../core/models/labels';
import { DefangPipe } from '../../../shared/defang.pipe';
import { RiskBadge } from '../../../shared/risk-badge';

/** Resultado del análisis: score y clasificación (RF-04) y reglas explicadas (RF-05). */
@Component({
  selector: 'app-analysis-result',
  imports: [DatePipe, DefangPipe, RiskBadge],
  templateUrl: './analysis-result.html',
})
export class AnalysisResult {
  readonly analysis = input.required<AnalysisResponse>();

  protected readonly hints = CLASSIFICATION_HINTS;
  protected readonly detailPairs = detailPairs;

  protected readonly totalWeight = computed(() =>
    this.analysis().heuristics.reduce((sum, r) => sum + r.weight, 0),
  );

  /** Solo se muestra la forma normalizada si difiere de lo que escribió el usuario. */
  protected readonly showNormalized = computed(
    () => this.analysis().normalizedUrl !== this.analysis().url,
  );
}
