import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AnalysisResponse } from './api.models';

/** Base de la API: siempre relativa (proxy en desarrollo, mismo origen en producción). */
export const API_BASE = '/api';

/**
 * Operaciones que modifican datos (POST / DELETE) y el detalle de un análisis.
 * Las lecturas de listados (historial, estadísticas, reglas, health) se hacen
 * con httpResource directamente en cada página.
 */
@Service()
export class UrlSentinelApi {
  private readonly http = inject(HttpClient);

  analyze(url: string): Observable<AnalysisResponse> {
    return this.http.post<AnalysisResponse>(`${API_BASE}/analyses`, { url });
  }

  get(id: string): Observable<AnalysisResponse> {
    return this.http.get<AnalysisResponse>(`${API_BASE}/analyses/${encodeURIComponent(id)}`);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/analyses/${encodeURIComponent(id)}`);
  }

  clearHistory(): Observable<number> {
    return this.http
      .delete<{ deleted: number }>(`${API_BASE}/analyses`, { params: { confirm: 'true' } })
      .pipe(map((r) => r.deleted));
  }
}
