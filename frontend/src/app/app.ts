import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HealthResponse } from './core/api/api.models';
import { API_BASE } from './core/api/url-sentinel-api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** GET /api/health al arrancar: si la API o la BD no responden se muestra un aviso. */
  protected readonly health = httpResource<HealthResponse>(() => `${API_BASE}/health`);

  protected readonly links = [
    { path: '/', label: 'Analizar', exact: true },
    { path: '/historial', label: 'Historial', exact: false },
    { path: '/dashboard', label: 'Dashboard', exact: false },
    { path: '/reglas', label: 'Cómo funciona', exact: false },
  ];
}
