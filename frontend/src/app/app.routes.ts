import { Routes } from '@angular/router';

const analyzePage = () => import('./features/analyze/analyze-page').then((m) => m.AnalyzePage);

export const routes: Routes = [
  { path: '', loadComponent: analyzePage, title: 'URLSentinel · Analizar URL' },
  { path: 'analisis/:id', loadComponent: analyzePage, title: 'URLSentinel · Resultado' },
  {
    path: 'historial',
    loadComponent: () => import('./features/history/history-page').then((m) => m.HistoryPage),
    title: 'URLSentinel · Historial',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
    title: 'URLSentinel · Dashboard',
  },
  {
    path: 'reglas',
    loadComponent: () => import('./features/rules/rules-page').then((m) => m.RulesPage),
    title: 'URLSentinel · Cómo funciona',
  },
  { path: '**', redirectTo: '' },
];
