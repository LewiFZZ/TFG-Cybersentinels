import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysisListItem } from '../../../core/api/api.models';
import { CLASSIFICATION_LABELS } from '../../../core/models/labels';

/** Lista compacta de análisis recientes que enlaza a /analisis/:id. */
@Component({
  selector: 'app-recent-list',
  imports: [RouterLink, DatePipe],
  template: `
    <ul class="recent">
      @for (item of items(); track item.id) {
        <li>
          <a
            class="recent__link"
            [class.recent__link--active]="item.id === currentId()"
            [routerLink]="['/analisis', item.id]"
            [attr.aria-current]="item.id === currentId() ? 'page' : null"
          >
            <span class="dot" [class]="'dot--' + (item.classification ?? 'none')" aria-hidden="true"></span>
            <span class="recent__text">
              <span class="mono recent__domain">{{ item.domain }}</span>
              <span class="muted">
                {{ item.classification ? labels[item.classification] : 'Sin resultado' }}
                · {{ item.score ?? '—' }}/100 · {{ item.createdAt | date: 'dd/MM HH:mm' }}
              </span>
            </span>
          </a>
        </li>
      } @empty {
        <li class="muted">Aún no se ha analizado ninguna URL.</li>
      }
    </ul>
  `,
})
export class RecentList {
  readonly items = input.required<AnalysisListItem[]>();
  readonly currentId = input<string>();
  protected readonly labels = CLASSIFICATION_LABELS;
}
