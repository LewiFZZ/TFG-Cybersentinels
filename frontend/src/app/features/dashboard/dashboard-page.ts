import { httpResource } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RiskClassification, StatsResponse } from '../../core/api/api.models';
import { API_BASE } from '../../core/api/url-sentinel-api';
import { AnalysisStore } from '../../core/services/analysis-store';
import { toUserMessage } from '../../core/utils/api-error';
import { DefangPipe } from '../../shared/defang.pipe';
import { RiskBadge } from '../../shared/risk-badge';
import { DailyChart } from './daily-chart';

/** Dashboard con las estadísticas de GET /api/stats?days=N. */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, DatePipe, DecimalPipe, DefangPipe, RiskBadge, DailyChart],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly store = inject(AnalysisStore);

  protected readonly ranges = [7, 30, 90];
  protected readonly days = signal(30);

  protected readonly stats = httpResource<StatsResponse>(() => {
    this.store.revision();
    return { url: `${API_BASE}/stats`, params: { days: this.days() } };
  });

  protected readonly errorText = computed(() => {
    const err = this.stats.error();
    return err ? toUserMessage(err) : null;
  });

  /** Máximo de la lista de reglas, para escalar las barras horizontales. */
  protected readonly maxRuleCount = computed(() =>
    this.stats.hasValue() ? Math.max(1, ...this.stats.value().topRules.map((r) => r.count)) : 1,
  );

  protected percent(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  protected classify(score: number): RiskClassification {
    if (score >= 70) return 'malicious';
    if (score >= 40) return 'suspicious';
    return 'safe';
  }
}
