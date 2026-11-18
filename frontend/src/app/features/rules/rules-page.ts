import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { HeuristicRule } from '../../core/api/api.models';
import { API_BASE } from '../../core/api/url-sentinel-api';
import { toUserMessage } from '../../core/utils/api-error';

/** "Cómo funciona": catálogo de reglas heurísticas (GET /api/heuristics/rules). */
@Component({
  selector: 'app-rules-page',
  template: `
    <h1>Cómo funciona</h1>
    <p class="lead">
      Cada URL pasa por {{ rules.hasValue() ? rules.value().length : 'las' }} reglas heurísticas.
      Cada regla que se activa suma sus puntos; la suma (máximo 100) decide la clasificación.
    </p>

    <ol class="steps">
      <li><strong>Seguro</strong> · 0–39 puntos</li>
      <li><strong>Sospechoso</strong> · 40–69 puntos</li>
      <li><strong>Malicioso</strong> · 70–100 puntos</li>
    </ol>

    @if (rules.error()) {
      <div class="alert alert--error" role="alert">{{ errorText() }}</div>
    } @else if (rules.hasValue()) {
      <div class="card table-card">
        <table class="table">
          <caption class="visually-hidden">Reglas heurísticas y sus pesos</caption>
          <thead>
            <tr>
              <th scope="col">Regla</th>
              <th scope="col">Qué detecta</th>
              <th scope="col" class="num">Puntos</th>
            </tr>
          </thead>
          <tbody>
            @for (rule of sorted(); track rule.code) {
              <tr>
                <td class="mono nowrap">{{ rule.code }}</td>
                <td>{{ rule.description }}</td>
                <td class="num mono">+{{ rule.weight }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="muted">Cargando reglas…</p>
    }
  `,
})
export class RulesPage {
  protected readonly rules = httpResource<HeuristicRule[]>(() => `${API_BASE}/heuristics/rules`);

  protected readonly sorted = computed(() =>
    this.rules.hasValue() ? [...this.rules.value()].sort((a, b) => b.weight - a.weight) : [],
  );

  protected readonly errorText = computed(() => toUserMessage(this.rules.error()));
}
