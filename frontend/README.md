# URLSentinel · Frontend

SPA en Angular 22 para analizar URLs, consultar el historial y ver estadísticas.
Contrato con el backend: `docs/API-FRONTEND.md` y `docs/openapi.json` (rama del backend).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm start` | Desarrollo en http://localhost:4200 · `/api` → `http://localhost:3000` (backend con `npm run start:dev`) |
| `npm run start:docker` | Igual, pero `/api` → `http://localhost:8080` (backend con `docker compose up -d`) |
| `npm test` | Tests unitarios (Vitest) |
| `npm run build` | Build de producción en `dist/frontend/browser` |

El código usa siempre rutas relativas `/api/...`: en desarrollo las reenvía el proxy de Angular
(`proxy.conf.json` / `proxy.docker.conf.json`) y en producción NestJS sirve web y API en el mismo origen.

## Estructura

```
src/app/
├── core/
│   ├── api/            # api.models.ts (tipos del backend) y url-sentinel-api.ts (POST/DELETE/GET id)
│   ├── services/       # analysis-store.ts: análisis actual + aviso de cambios a los listados
│   ├── models/         # textos de clasificación y de la evidencia de cada regla
│   └── utils/          # validación de URL, defang, mensajes de error
├── shared/             # risk-badge, pipe defang
└── features/
    ├── analyze/        # "/" y "/analisis/:id": formulario, resultado y últimos análisis
    ├── history/        # "/historial": tabla paginada, borrar uno, vaciar con confirmación
    ├── dashboard/      # "/dashboard": totales, gráfica diaria (SVG propio), reglas, dominios, amenazas
    └── rules/          # "/reglas": catálogo de reglas heurísticas
```

Las lecturas usan `httpResource` (signals) y se recargan solas cuando se analiza o se borra algo.

## Requisitos cubiertos

| Requisito | Dónde |
|---|---|
| RF-01 Enviar URL | `url-form.ts` (Reactive Forms, http/https, dominio completo, máx. 2048) |
| RF-03/RF-05 Reglas y explicación | `analysis-result` (descripción, código, peso y evidencia de cada regla) |
| RF-04 Score y clasificación | `analysis-result` (etiqueta, score 0–100 y barra con umbrales 40/70) |
| RF-06 Historial | `history-page` (paginación, borrado individual y total) |
| RF-07 Errores | `api-error.ts` (400 con lista o texto, 404, 429 con `Retry-After`, 503) y aviso de `/api/health` |
| Dashboard | `dashboard-page` con `GET /api/stats?days=7|30|90` |

## Seguridad en el frontend

- Nada de `innerHTML` ni `bypassSecurityTrust*`: todo se pinta con interpolación.
- La URL analizada nunca es un enlace: se muestra "desactivada" (`hxxp://dominio[.]com`).
- Compatible con la CSP del backend: sin CDNs, sin scripts ni estilos `style="…"` inline,
  gráfica en SVG propio y `optimization.styles.inlineCritical: false` en `angular.json`
  (no cambiarlo: Angular generaría un `onload` inline que la CSP bloquea).
- `<meta name="referrer" content="no-referrer">`.
