import { inject, Service, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AnalysisResponse } from '../api/api.models';
import { UrlSentinelApi } from '../api/url-sentinel-api';
import { toUserMessage } from '../utils/api-error';

/**
 * Estado del análisis que se está mostrando (resultado, carga y error).
 * Tras el POST ya tenemos el resultado completo: lo guardamos aquí y al navegar a
 * /analisis/:id no se repite la petición. Solo se llama al GET si se entra
 * directamente por URL, desde el historial o al recargar.
 */
@Service()
export class AnalysisStore {
  private readonly api = inject(UrlSentinelApi);

  private readonly resultSignal = signal<AnalysisResponse | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  /** Se incrementa cada vez que cambian los datos guardados (para refrescar listados). */
  private readonly revisionSignal = signal(0);

  readonly result = this.resultSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly revision = this.revisionSignal.asReadonly();

  private request?: Subscription;

  analyze(url: string, onSuccess?: (analysis: AnalysisResponse) => void): void {
    this.run(this.api.analyze(url), (analysis) => {
      this.revisionSignal.update((r) => r + 1);
      onSuccess?.(analysis);
    });
  }

  open(id: string): void {
    if (this.resultSignal()?.id === id) return;
    this.run(this.api.get(id));
  }

  /** Avisa de que se han borrado análisis (desde el historial). */
  notifyDeleted(id?: string): void {
    if (!id || this.resultSignal()?.id === id) this.resultSignal.set(null);
    this.revisionSignal.update((r) => r + 1);
  }

  reset(): void {
    this.request?.unsubscribe();
    this.resultSignal.set(null);
    this.errorSignal.set(null);
    this.loadingSignal.set(false);
  }

  private run(
    source: Observable<AnalysisResponse>,
    onSuccess?: (analysis: AnalysisResponse) => void,
  ): void {
    this.request?.unsubscribe();
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.request = source.subscribe({
      next: (analysis) => {
        this.resultSignal.set(analysis);
        this.loadingSignal.set(false);
        onSuccess?.(analysis);
      },
      error: (err: unknown) => {
        this.errorSignal.set(toUserMessage(err));
        this.loadingSignal.set(false);
      },
    });
  }
}
