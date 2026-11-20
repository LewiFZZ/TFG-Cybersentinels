import { httpResource } from '@angular/common/http';
import { Component, effect, inject, input, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AnalysisPage } from '../../core/api/api.models';
import { API_BASE } from '../../core/api/url-sentinel-api';
import { AnalysisStore } from '../../core/services/analysis-store';
import { AnalysisResult } from './components/analysis-result';
import { RecentList } from './components/recent-list';
import { UrlForm } from './components/url-form';

/**
 * Página principal: formulario (RF-01) y resultado (RF-04, RF-05).
 * Rutas: "/" y "/analisis/:id". El estado del análisis vive en AnalysisStore.
 */
@Component({
  selector: 'app-analyze-page',
  imports: [UrlForm, AnalysisResult, RecentList, RouterLink],
  templateUrl: './analyze-page.html',
})
export class AnalyzePage {
  private readonly router = inject(Router);
  protected readonly store = inject(AnalysisStore);

  /** Parámetro :id de la ruta (gracias a withComponentInputBinding). */
  readonly id = input<string>();

  /** Últimos análisis guardados; se recarga cuando cambia store.revision(). */
  protected readonly recent = httpResource<AnalysisPage>(() => {
    this.store.revision();
    return { url: `${API_BASE}/analyses`, params: { limit: 6, offset: 0 } };
  });

  constructor() {
    // "/analisis/:id" -> muestra ese análisis · "/" -> pantalla limpia.
    effect(() => {
      const id = this.id();
      untracked(() => (id ? this.store.open(id) : this.store.reset()));
    });
  }

  protected analyze(url: string): void {
    this.store.analyze(url, (analysis) => void this.router.navigate(['/analisis', analysis.id]));
  }
}
