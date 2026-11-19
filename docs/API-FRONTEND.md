# URLSentinel · Guía de la API para el frontend

Guía para construir el frontend Angular (`frontend/`) contra la API de URLSentinel.
La especificación completa y formal está en [`openapi.json`](openapi.json) (OpenAPI 3).
Las pruebas de Postman están en [`backend/postman/`](../backend/postman/README.md).

> **Para Claude (o cualquier asistente) que trabaje en el frontend**
> 1. Usa siempre rutas **relativas** `/api/...`. Nunca `http://localhost:3000` ni `:8080` en el código.
> 2. Configura el proxy de desarrollo del apartado 1 (no hace falta CORS).
> 3. Copia los tipos del apartado 3 tal cual: coinciden con lo que devuelve la API.
> 4. Respeta las restricciones de la CSP (apartado 7): nada de CDNs ni scripts inline.
> 5. No modifiques nada en `backend/`. Si falta algo en la API, anótalo y pídelo.

---

## 0. Qué es la aplicación

Herramienta **local** (se distribuye con Docker) que analiza URLs para detectar phishing con un
motor heurístico propio, opcionalmente reforzado con la reputación de **VirusTotal** y
**Google Safe Browsing** (solo si hay API key configurada). **No hay usuarios ni login.** Cada
análisis se guarda en PostgreSQL y alimenta un historial y un dashboard.

**Score = heurística + reputación externa, con tope en 100.**

En producción, NestJS sirve **en el mismo puerto** la web compilada (`/`) y la API (`/api`).

### Vistas previstas

| Vista | Ruta sugerida | Endpoints |
|---|---|---|
| Analizar | `/` | `POST /api/analyses` |
| Resultado | `/analisis/:id` | `GET /api/analyses/:id` (o la respuesta del POST) |
| Historial | `/historial` | `GET /api/analyses`, `DELETE /api/analyses/:id`, `DELETE /api/analyses?confirm=true` |
| Dashboard | `/dashboard` | `GET /api/stats` |
| (opcional) Cómo funciona | `/reglas` | `GET /api/heuristics/rules` |

---

## 1. Entorno de desarrollo

### Levantar la API

Opción rápida (todo en Docker, desde la raíz del repo):

```bash
cp .env.example .env      # solo la primera vez
docker compose up -d      # API en http://localhost:8080/api
```

Opción con Swagger (documentación interactiva en `http://localhost:3000/api/docs`):

```bash
docker compose up -d db
cd backend && npm install && npm run start:dev    # API en http://localhost:3000/api
```

### Proxy de Angular (obligatorio)

Crea `frontend/proxy.conf.json`. El `target` depende de la opción anterior (`8080` con Docker, `3000` con `start:dev`):

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

Y en `frontend/angular.json` → `projects.frontend.architect.serve.options`:

```json
"proxyConfig": "proxy.conf.json"
```

Con esto `ng serve` (puerto 4200) reenvía `/api/*` al backend y el código usa `/api/...` igual que en producción.

### Para probar el build real dentro de la app

```bash
docker compose up -d --build     # compila Angular + Nest en una imagen
# abrir http://localhost:8080
```

---

## 2. Resumen de endpoints

Base: `/api` · Formato: JSON · Sin autenticación · Fechas en ISO 8601 UTC · IDs en UUID

| Método | Ruta | Para qué | Éxito |
|---|---|---|---|
| `POST` | `/api/analyses` | Analizar una URL (y guardarla) | `201` `AnalysisResponse` |
| `GET` | `/api/analyses?limit=20&offset=0` | Historial paginado | `200` `AnalysisPage` |
| `GET` | `/api/analyses/:id` | Detalle de un análisis | `200` `AnalysisResponse` |
| `DELETE` | `/api/analyses/:id` | Borrar un análisis | `204` sin cuerpo |
| `DELETE` | `/api/analyses?confirm=true` | Vaciar todo el historial | `200` `{ deleted }` |
| `GET` | `/api/stats?days=30` | Datos del dashboard | `200` `StatsResponse` |
| `GET` | `/api/heuristics/rules` | Catálogo de reglas | `200` `HeuristicRule[]` |
| `GET` | `/api/reputation/sources` | Fuentes externas y si están configuradas | `200` `ReputationSourceInfo[]` |
| `GET` | `/api/health` | Estado de API y BD | `200` / `503` |

---

## 3. Tipos TypeScript

Pégalos en `frontend/src/app/core/api.models.ts` (o donde prefieras):

```ts
export type RiskClassification = 'safe' | 'suspicious' | 'malicious';
export type AnalysisStatus = 'pending' | 'completed' | 'partial' | 'failed';

export interface TriggeredRule {
  code: string;                                // 'BRAND_IMPERSONATION', 'IP_HOST'...
  weight: number;                              // puntos que suma al score
  description: string;                         // texto para el usuario, en castellano
  details: Record<string, unknown> | null;     // evidencia (ver apartado 6)
}

export type ReputationSource = 'virustotal' | 'google_safe_browsing' | 'phishtank';
export type CheckStatus = 'ok' | 'timeout' | 'rate_limited' | 'error';

export interface ReputationCheck {
  source: ReputationSource;
  status: CheckStatus;                         // 'ok' o el motivo del fallo
  malicious: boolean | null;                   // true peligrosa · false limpia · null sin datos/error
  weight: number;                              // puntos que suma al score (0 si falló)
  details: Record<string, unknown> | null;     // evidencia (ver apartado 6)
  responseTimeMs: number | null;
  cached: boolean;                             // reutilizado de un análisis reciente de la misma URL
}

export interface ScoreBreakdown {
  heuristics: number;   // suma de pesos de las reglas propias
  reputation: number;   // suma de pesos de las fuentes externas
}

export interface AnalysisResponse {
  id: string;
  url: string;              // tal cual la escribió el usuario
  normalizedUrl: string;    // forma canónica
  domain: string;           // host analizado (lo que hay que mostrar destacado)
  score: number;            // 0–100 = min(100, heuristics + reputation)
  scoreBreakdown: ScoreBreakdown;
  classification: RiskClassification;
  status: AnalysisStatus;   // 'completed' o 'partial' (alguna fuente externa no respondió)
  summary: string | null;   // frase resumen ya redactada
  heuristics: TriggeredRule[];     // ordenadas por peso desc. Vacío = nada sospechoso
  reputation: ReputationCheck[];   // vacío si no hay API keys configuradas
  durationMs: number | null;
  createdAt: string;        // ISO 8601 UTC
}

export interface ReputationSourceInfo {
  source: ReputationSource;
  name: string;          // 'VirusTotal', 'Google Safe Browsing'
  configured: boolean;   // false = sin API key, no se consulta
}

export interface AnalysisListItem {
  id: string;
  url: string;
  domain: string;
  score: number | null;
  classification: RiskClassification | null;
  status: AnalysisStatus;
  createdAt: string;
}

export interface AnalysisPage {
  items: AnalysisListItem[];
  total: number;   // total de análisis guardados (para la paginación)
  limit: number;
  offset: number;
}

export interface StatsTotals {
  analyses: number;
  safe: number;
  suspicious: number;
  malicious: number;
  averageScore: number;
}

export interface DailyStat {
  date: string;    // 'YYYY-MM-DD' (UTC). Hay un elemento por día, también los días a 0
  total: number;
  safe: number;
  suspicious: number;
  malicious: number;
}

export interface TopRule { code: string; description: string; count: number; }
export interface TopDomain { domain: string; count: number; maxScore: number; }

export interface RecentThreat {
  id: string;
  url: string;
  score: number;
  classification: Exclude<RiskClassification, 'safe'>;
  createdAt: string;
}

export interface StatsResponse {
  days: number;
  since: string;            // inicio de la ventana (ISO UTC)
  totals: StatsTotals;
  daily: DailyStat[];       // `days` elementos, del más antiguo al de hoy
  topRules: TopRule[];      // máx. 10
  topDomains: TopDomain[];  // máx. 10
  recentThreats: RecentThreat[]; // máx. 5, solo sospechosos/maliciosos
}

export interface HeuristicRule { code: string; weight: number; description: string; }

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];   // ¡puede ser texto o lista!
}
```

---

## 4. Endpoints en detalle

### `POST /api/analyses` — analizar una URL

Petición:

```json
{ "url": "http://paypal-secure-login-verify.xyz/account/update" }
```

- `url`: obligatoria, texto, máximo 2048 caracteres. Sin esquema se asume `http://` (`example.com` es válida).
- Solo se aceptan `http`/`https` y dominios completos (`localhost` no vale).
- **No se admite ningún otro campo** (la API responde 400 si mandas campos de más).
- La API **no visita** la URL. Sin API keys el análisis es instantáneo (`durationMs` ≈ 0–5).
  Con VirusTotal / Safe Browsing configurados tarda lo que respondan esas APIs, **como máximo
  ~4 s** (si una no responde, se corta y el análisis sale con `status: "partial"`).
  **Muestra un indicador de carga** mientras dura la petición.

Respuesta `201` (real):

```json
{
  "id": "01a1eb93-a8cd-7717-9dad-a4a5451c7462",
  "url": "http://paypal-secure-login-verify.xyz/account/update",
  "normalizedUrl": "http://paypal-secure-login-verify.xyz/account/update",
  "domain": "paypal-secure-login-verify.xyz",
  "score": 80,
  "classification": "malicious",
  "status": "completed",
  "summary": "Malicioso: 5 indicadores de riesgo (BRAND_IMPERSONATION, SUSPICIOUS_TLD, PHISHING_KEYWORDS, MANY_HYPHENS, NO_HTTPS)",
  "heuristics": [
    {
      "code": "BRAND_IMPERSONATION",
      "weight": 35,
      "description": "El dominio menciona una marca conocida pero no pertenece a ella",
      "details": { "brand": "paypal", "domain": "paypal-secure-login-verify.xyz" }
    },
    {
      "code": "SUSPICIOUS_TLD",
      "weight": 15,
      "description": "Extensión de dominio habitual en campañas de phishing",
      "details": { "tld": "xyz" }
    },
    {
      "code": "PHISHING_KEYWORDS",
      "weight": 15,
      "description": "Contiene palabras típicas de phishing (login, verify, account, bank...)",
      "details": { "keywords": ["login", "secure", "account", "verify", "update"] }
    },
    {
      "code": "MANY_HYPHENS",
      "weight": 10,
      "description": "Muchos guiones en el dominio (ej. secure-login-paypal-verify.com)",
      "details": { "hyphens": 3 }
    },
    {
      "code": "NO_HTTPS",
      "weight": 5,
      "description": "No usa HTTPS: la conexión no está cifrada",
      "details": null
    }
  ],
  "durationMs": 0,
  "createdAt": "2026-11-17T22:14:45.196Z"
}
```

Una URL legítima devuelve `score: 0`, `classification: "safe"`, `heuristics: []` y
`summary: "Seguro: no se ha detectado ningún indicador de riesgo"`.

**Límite: 20 análisis por minuto.** A partir del 21 la API responde `429` (ver apartado 5).
Desactiva el botón mientras la petición esté en curso.

### `GET /api/analyses` — historial

Query (opcionales): `limit` 1–100 (por defecto 20), `offset` ≥ 0 (por defecto 0).
Orden: del más reciente al más antiguo.

```json
{
  "items": [
    {
      "id": "01a1eb93-a8dc-7088-ab42-93248684e970",
      "url": "https://www.google.com",
      "domain": "www.google.com",
      "score": 0,
      "classification": "safe",
      "status": "completed",
      "createdAt": "2026-11-17T22:14:45.211Z"
    }
  ],
  "total": 82,
  "limit": 20,
  "offset": 0
}
```

Páginas: `totalPages = Math.ceil(total / limit)`, página `n` (desde 0) → `offset = n * limit`.

### `GET /api/analyses/:id` — detalle

Misma forma que la respuesta del POST (`AnalysisResponse`). `404` si no existe y `400` si el id no es un UUID.

> Truco: tras el POST ya tienes el resultado completo; navega a `/analisis/:id` pasándolo por
> el estado del router y llama al GET solo si se entra directamente por URL o se recarga.

### `DELETE /api/analyses/:id` — borrar uno

`204` sin cuerpo. `404` si no existe. Borra también sus reglas asociadas.

### `DELETE /api/analyses?confirm=true` — vaciar historial

```json
{ "deleted": 82 }
```

Sin `?confirm=true` → `400` con `"Añade ?confirm=true para vaciar el historial"`.
**Pide confirmación al usuario en la UI** antes de llamarlo: es irreversible.

### `GET /api/stats` — dashboard

Query: `days` 1–365 (por defecto 30). **Todas** las secciones se calculan sobre esa ventana.

```json
{
  "days": 3,
  "since": "2026-11-15T00:00:00.000Z",
  "totals": { "analyses": 82, "safe": 72, "suspicious": 3, "malicious": 7, "averageScore": 15 },
  "daily": [
    { "date": "2026-11-15", "total": 0, "safe": 0, "suspicious": 0, "malicious": 0 },
    { "date": "2026-11-16", "total": 0, "safe": 0, "suspicious": 0, "malicious": 0 },
    { "date": "2026-11-17", "total": 82, "safe": 72, "suspicious": 3, "malicious": 7 }
  ],
  "topRules": [
    { "code": "NO_HTTPS", "count": 62, "description": "No usa HTTPS: la conexión no está cifrada" },
    { "code": "PHISHING_KEYWORDS", "count": 14, "description": "Contiene palabras típicas de phishing (login, verify, account, bank...)" }
  ],
  "topDomains": [
    { "domain": "example.com", "count": 58, "maxScore": 25 },
    { "domain": "paypal-secure-login-verify.xyz", "count": 4, "maxScore": 80 }
  ],
  "recentThreats": [
    {
      "id": "01a1eb93-a8cd-7717-9dad-a4a5451c7462",
      "url": "http://paypal-secure-login-verify.xyz/account/update",
      "score": 80,
      "classification": "malicious",
      "createdAt": "2026-11-17T22:14:45.196Z"
    }
  ]
}
```

Ideas de widgets:
- 4 tarjetas: total, seguros, sospechosos, maliciosos (+ score medio).
- Barras apiladas por día con `daily` (safe/suspicious/malicious). Ya viene sin huecos.
- Ranking de reglas (`topRules`, barras horizontales con `description`).
- Tabla de dominios (`topDomains`, coloreando `maxScore`).
- Lista de amenazas recientes (`recentThreats`) que enlace a `/analisis/:id`.
- Selector 7 / 30 / 90 días que cambie `days`.

### `GET /api/heuristics/rules` — catálogo de reglas

```json
[
  { "code": "IP_HOST", "weight": 30, "description": "Usa una dirección IP en lugar de un nombre de dominio" },
  { "code": "USERINFO_IN_URL", "weight": 25, "description": "Contiene \"usuario@\" antes del dominio, técnica para ocultar el destino real" }
]
```

Son 14 reglas. Útil para una página "Cómo funciona" o para tooltips.

### `GET /api/reputation/sources` — fuentes externas

```json
[
  { "source": "virustotal", "name": "VirusTotal", "configured": false },
  { "source": "google_safe_browsing", "name": "Google Safe Browsing", "configured": false }
]
```

`configured: false` = no hay API key y esa fuente no se consulta. Útil para mostrar en la pantalla
de análisis qué fuentes están activas.

### `GET /api/health`

`200 {"status":"ok","database":"up","timestamp":"..."}` · `503` si la base de datos no responde.

---

## 5. Errores

Todos los errores tienen esta forma (**`message` puede ser texto o lista**):

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["url should not be empty"] }
{ "statusCode": 400, "error": "Bad Request", "message": "Solo se admiten URLs http o https" }
{ "statusCode": 404, "error": "Not Found",   "message": "Análisis no encontrado" }
```

Normalízalo así:

```ts
import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(err: HttpErrorResponse): string {
  if (err.status === 0) return 'No se puede conectar con el servidor';
  if (err.status === 429) return 'Demasiados análisis seguidos. Espera un minuto.';
  const m = (err.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(m)) return m.join('. ');
  return m ?? 'Error inesperado';
}
```

| Código | Cuándo | Qué mostrar |
|---|---|---|
| `400` | URL vacía, mal formada, protocolo no http/https, campo extra, parámetro fuera de rango | El `message` junto al campo |
| `404` | Análisis no encontrado | "Este análisis no existe o se ha borrado" |
| `429` | Más de 20 análisis/minuto (o 60 peticiones/minuto en general) | "Espera un minuto". Cabecera `Retry-After` = segundos |
| `503` | `/health` con la BD caída | Banner de servicio no disponible |
| `0` | API apagada | "No se puede conectar con el servidor" |

Los mensajes de validación de tipo (`url should not be empty`, `url must be a string`) vienen en
inglés: conviene validar antes en el formulario (obligatorio, máx. 2048) para que el usuario vea
el texto en castellano.

---

## 6. Presentación del resultado

### Niveles de riesgo

| `classification` | Etiqueta | Rango de score | Color sugerido |
|---|---|---|---|
| `safe` | Seguro | 0–39 | verde |
| `suspicious` | Sospechoso | 40–69 | ámbar |
| `malicious` | Malicioso | 70–100 | rojo |

Muestra el `score` como barra o medidor de 0 a 100, el `domain` destacado (es lo que el usuario
debe mirar) y la lista de `heuristics` con su `description` y sus `weight` (+35, +15...).

### Reputación externa (`reputation`)

Muestra cada fuente como una fila o tarjeta propia, separada de las reglas heurísticas, y el
desglose `scoreBreakdown` ("Heurística 80 + Reputación 130 → 100").

| `source` | Nombre | `details` cuando `status: "ok"` | Puntos |
|---|---|---|---|
| `virustotal` | VirusTotal | `{ known: true, malicious, suspicious, harmless, engines, link }` · si nunca la ha visto: `{ known: false }` | 0 · 20 · 40 · 60 según motores |
| `google_safe_browsing` | Google Safe Browsing | `{ threatTypes: string[] }` (ej. `SOCIAL_ENGINEERING`, `MALWARE`) | 0 o 70 |

Textos sugeridos:
- VirusTotal: "**7** de **92** motores la marcan como maliciosa" (`details.malicious` / `details.engines`).
  `details.link` apunta al informe en virustotal.com: **ese sí** puede ser un enlace (no es la URL analizada).
- Safe Browsing: "En la lista de Google: ingeniería social" (`SOCIAL_ENGINEERING`), "malware" (`MALWARE`),
  "software no deseado" (`UNWANTED_SOFTWARE`), "aplicación potencialmente dañina" (`POTENTIALLY_HARMFUL_APPLICATION`).
- `status` distinto de `ok`: `details.error` trae el motivo ("sin respuesta en 4000 ms", "cuota agotada").
  Muestra la fuente en gris con "No disponible" y un aviso de resultado parcial.
- `cached: true`: "Resultado de las últimas 24 h".
- `reputation` vacío: "Reputación externa no configurada" (consulta `GET /api/reputation/sources`).

Ejemplo real con las dos fuentes marcando la URL:

```json
"score": 100,
"scoreBreakdown": { "heuristics": 80, "reputation": 130 },
"status": "completed",
"summary": "Malicioso: 5 indicadores de riesgo (BRAND_IMPERSONATION, SUSPICIOUS_TLD, PHISHING_KEYWORDS, MANY_HYPHENS, NO_HTTPS); VirusTotal la marca como peligrosa; Google Safe Browsing la marca como peligrosa",
"reputation": [
  {
    "source": "virustotal", "status": "ok", "malicious": true, "weight": 60,
    "details": { "known": true, "malicious": 7, "suspicious": 1, "harmless": 60, "engines": 92,
                 "link": "https://www.virustotal.com/gui/url/aHR0cDovL3BheXBhbC1zZWN1cmUtbG9naW4tdmVyaWZ5Lnh5ei9hY2NvdW50L3VwZGF0ZQ" },
    "responseTimeMs": 312, "cached": false
  },
  {
    "source": "google_safe_browsing", "status": "ok", "malicious": true, "weight": 70,
    "details": { "threatTypes": ["SOCIAL_ENGINEERING"] },
    "responseTimeMs": 140, "cached": false
  }
]
```

Si una fuente falla:

```json
"status": "partial",
"summary": "Seguro: no se ha detectado ningún indicador de riesgo (sin respuesta de VirusTotal)",
"reputation": [
  { "source": "virustotal", "status": "timeout", "malicious": null, "weight": 0,
    "details": { "error": "VirusTotal: sin respuesta en 4000 ms" }, "responseTimeMs": 4002, "cached": false }
]
```

### Contenido de `details` por regla

| `code` | Peso | `details` |
|---|---|---|
| `BRAND_IMPERSONATION` | 35 | `{ brand: string, domain: string }` |
| `IP_HOST` | 30 | `{ ip: string }` |
| `USERINFO_IN_URL` | 25 | `{ userinfo: string }` |
| `PUNYCODE_DOMAIN` | 25 | `{ hostname: string }` |
| `URL_SHORTENER` | 15 | `{ shortener: string }` |
| `SUSPICIOUS_TLD` | 15 | `{ tld: string }` |
| `EMBEDDED_REDIRECT` | 15 | `null` |
| `PHISHING_KEYWORDS` | 5–15 | `{ keywords: string[] }` |
| `EXCESSIVE_SUBDOMAINS` | 10 | `{ subdomains: number }` |
| `MANY_HYPHENS` | 10 | `{ hyphens: number }` |
| `NON_STANDARD_PORT` | 10 | `{ port: number }` |
| `EXCESSIVE_ENCODING` | 10 | `{ encoded: number, doubleEncoded: boolean }` |
| `NO_HTTPS` | 5 | `null` |
| `LONG_URL` | 5 | `{ length: number }` |

Ejemplos para mostrar la evidencia: "Marca: **paypal**", "Extensión: **.xyz**",
"Palabras: login, verify…".

### Seguridad al pintar datos

`url`, `domain` y `details` vienen del usuario. **Nunca** uses `[innerHTML]` ni
`bypassSecurityTrust*` con ellos; usa interpolación normal (`{{ }}`). **No** pongas la URL
analizada como `href` clicable: puede ser maliciosa. Muéstrala como texto.

### Fechas

`createdAt` está en UTC: usa el pipe `date` de Angular para mostrarla en hora local
(`{{ a.createdAt | date: 'dd/MM/yyyy HH:mm' }}`). Las fechas de `daily` (`YYYY-MM-DD`) son días UTC.

---

## 7. Restricciones de la CSP (importante)

El backend envía una Content-Security-Policy estricta con Helmet. En la app compilada:

| Permitido | Bloqueado |
|---|---|
| JS propio del bundle de Angular | Scripts desde CDN (`<script src="https://...">`) |
| CSS propio y estilos de componentes | Scripts y atributos inline (`onclick="..."`, `<script>...</script>`) |
| Hojas de estilo y fuentes por `https:` (Google Fonts funciona) | Imágenes externas (solo `'self'` y `data:`) |
| Peticiones a `/api` (mismo origen) | `fetch`/`XHR` a otros dominios |

En la práctica:
- Las librerías (gráficas, iconos…) se instalan con **npm** y se importan; nada de CDN.
  Para gráficas: `chart.js` + `ng2-charts`, `ngx-echarts` o SVG propio.
- Los iconos, como paquete npm o SVG en `public/`.
- **No cambies** `optimization.styles.inlineCritical: false` en `angular.json`: si se activa,
  Angular genera un `onload` inline que la CSP bloquea y la página sale sin estilos.

---

## 8. Servicio Angular de ejemplo

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  AnalysisPage, AnalysisResponse, HeuristicRule, ReputationSourceInfo, StatsResponse,
} from './api.models';

@Injectable({ providedIn: 'root' })
export class UrlSentinelApi {
  private http = inject(HttpClient);
  private base = '/api';

  analyze(url: string): Observable<AnalysisResponse> {
    return this.http.post<AnalysisResponse>(`${this.base}/analyses`, { url });
  }

  history(limit = 20, offset = 0): Observable<AnalysisPage> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<AnalysisPage>(`${this.base}/analyses`, { params });
  }

  get(id: string): Observable<AnalysisResponse> {
    return this.http.get<AnalysisResponse>(`${this.base}/analyses/${id}`);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/analyses/${id}`);
  }

  clearHistory(): Observable<number> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/analyses`, { params: { confirm: 'true' } })
      .pipe(map((r) => r.deleted));
  }

  stats(days = 30): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/stats`, { params: { days } });
  }

  rules(): Observable<HeuristicRule[]> {
    return this.http.get<HeuristicRule[]>(`${this.base}/heuristics/rules`);
  }

  reputationSources(): Observable<ReputationSourceInfo[]> {
    return this.http.get<ReputationSourceInfo[]>(`${this.base}/reputation/sources`);
  }
}
```

Recuerda registrar `provideHttpClient()` en `app.config.ts`.

---

## 9. URLs de prueba

Resultados **sin API keys** (solo heurística). Con VirusTotal/Safe Browsing configurados, las
URLs de phishing conocidas pueden sumar puntos de reputación.

| URL | Resultado esperado |
|---|---|
| `https://www.google.com` | 0 · seguro |
| `https://www.paypal.com/es/home` | 0 · seguro |
| `bit.ly/3xYz` | 20 · seguro (acortador + http) |
| `http://185.23.45.10:8080/bank/login.php` | 55 · sospechoso |
| `https://www.paypal.com.secure-check.top/login` | 70 · malicioso |
| `http://paypal-secure-login-verify.xyz/account/update` | 80 · malicioso |
| `https://аpple.com/` (la "а" es cirílica) | homógrafo, `PUNYCODE_DOMAIN` |
| `ftp://x.com` | 400 · solo http/https |
