import { Component, input } from '@angular/core';
import { RiskClassification } from '../core/api/api.models';
import { CLASSIFICATION_LABELS } from '../core/models/labels';

/** Etiqueta de riesgo: color + texto (nunca solo color, por accesibilidad). */
@Component({
  selector: 'app-risk-badge',
  template: `
    @let c = classification();
    @if (c) {
      <span class="risk-badge" [class]="'risk-badge--' + c" [class.risk-badge--sm]="small()">
        {{ labels[c] }}
      </span>
    } @else {
      <span class="risk-badge risk-badge--sm risk-badge--none">Sin resultado</span>
    }
  `,
})
export class RiskBadge {
  readonly classification = input.required<RiskClassification | null>();
  readonly small = input(false);
  protected readonly labels = CLASSIFICATION_LABELS;
}
