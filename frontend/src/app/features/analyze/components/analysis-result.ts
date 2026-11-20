import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { AnalysisResponse } from '../../../core/api/api.models';
import {
  CLASSIFICATION_HINTS,
  detailPairs,
  reputationText,
  SOURCE_LABELS,
  virusTotalLink,
} from '../../../core/models/labels';
import { DefangPipe } from '../../../shared/defang.pipe';
import { RiskBadge } from '../../../shared/risk-badge';

/**
 * Resultado del análisis: score y clasificación (RF-04), reputación externa (RF-02)
 * y reglas explicadas (RF-03, RF-05).
 */
@Component({
  selector: 'app-analysis-result',
  imports: [DatePipe, DefangPipe, RiskBadge],
  templateUrl: './analysis-result.html',
})
export class AnalysisResult {
  readonly analysis = input.required<AnalysisResponse>();

  protected readonly hints = CLASSIFICATION_HINTS;
  protected readonly detailPairs = detailPairs;
  protected readonly sourceLabels = SOURCE_LABELS;
  protected readonly reputationText = reputationText;
  protected readonly virusTotalLink = virusTotalLink;


  /** Solo se muestra la forma normalizada si difiere de lo que escribió el usuario. */
  protected readonly showNormalized = computed(
    () => this.analysis().normalizedUrl !== this.analysis().url,
  );
}
