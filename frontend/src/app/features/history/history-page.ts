import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysisListItem, AnalysisPage } from '../../core/api/api.models';
import { API_BASE, UrlSentinelApi } from '../../core/api/url-sentinel-api';
import { AnalysisStore } from '../../core/services/analysis-store';
import { toUserMessage } from '../../core/utils/api-error';
import { DefangPipe } from '../../shared/defang.pipe';
import { RiskBadge } from '../../shared/risk-badge';

const PAGE_SIZE = 20;

/** Historial paginado (GET /api/analyses) con borrado individual y total (RF-06). */
@Component({
  selector: 'app-history-page',
  imports: [RouterLink, DatePipe, DefangPipe, RiskBadge],
  templateUrl: './history-page.html',
})
export class HistoryPage {
  private readonly api = inject(UrlSentinelApi);
  private readonly store = inject(AnalysisStore);

  protected readonly page = signal(0);
  protected readonly message = signal<string | null>(null);
  protected readonly confirmingClear = signal(false);
  protected readonly busyId = signal<string | null>(null);

  protected readonly history = httpResource<AnalysisPage>(() => {
    this.store.revision(); // recarga tras analizar o borrar
    return {
      url: `${API_BASE}/analyses`,
      params: { limit: PAGE_SIZE, offset: this.page() * PAGE_SIZE },
    };
  });

  protected readonly totalPages = computed(() =>
    this.history.hasValue() ? Math.max(1, Math.ceil(this.history.value().total / PAGE_SIZE)) : 1,
  );

  protected readonly errorText = computed(() => {
    const err = this.history.error();
    return err ? toUserMessage(err) : null;
  });

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(0, page), this.totalPages() - 1));
  }

  protected remove(item: AnalysisListItem): void {
    this.busyId.set(item.id);
    this.api.remove(item.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set(`Se ha borrado el análisis de ${item.domain}.`);
        // Si era el último de la página, retrocede una.
        if (this.history.hasValue() && this.history.value().items.length === 1 && this.page() > 0) {
          this.page.update((p) => p - 1);
        }
        this.store.notifyDeleted(item.id);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.message.set(toUserMessage(err));
      },
    });
  }

  protected clearAll(): void {
    this.api.clearHistory().subscribe({
      next: (deleted) => {
        this.confirmingClear.set(false);
        this.page.set(0);
        this.message.set(`Historial vaciado: ${deleted} análisis eliminados.`);
        this.store.notifyDeleted();
      },
      error: (err: unknown) => {
        this.confirmingClear.set(false);
        this.message.set(toUserMessage(err));
      },
    });
  }
}
