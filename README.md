# URLSentinel

Herramienta **local** para analizar URLs y detectar posibles intentos de phishing.
Combina un motor heurístico propio (14 reglas) con la reputación de **VirusTotal** y
**Google Safe Browsing** (opcional) en una puntuación de riesgo explicable, y un dashboard con
el historial de análisis.

Proyecto del equipo **CyberSentinels** · Módulo C087, Curso de especialización en
Ciberseguridad en Entornos de las Tecnologías de la Información.

- **Sin cuentas ni registro.** Se instala en tu equipo con Docker.
- **Tus datos no salen de tu máquina.** El historial se guarda en una base de datos PostgreSQL local.
  Solo si configuras una API key de reputación, la URL analizada se consulta en ese servicio.
- **No visita las URLs.** El análisis se hace solo sobre el texto de la URL.

## Instalación

Requisitos: Docker con Docker Compose.

```bash
git clone https://github.com/LewiFZZ/TFG-Cybersentinels.git
cd TFG-Cybersentinels
cp .env.example .env        # cambia DB_PASSWORD
docker compose up -d
```

Abre **http://localhost:8080**.

| Acción | Comando |
|---|---|
| Ver logs | `docker compose logs -f app` |
| Parar | `docker compose down` |
| Actualizar | `git pull && docker compose up -d --build` |
| Borrar también el historial | `docker compose down -v` |

Por defecto la aplicación **solo es accesible desde el propio equipo** (`127.0.0.1`),
porque no tiene login. Para abrirla a la red local, pon `HTTP_BIND=0.0.0.0` en `.env`.

## Reputación externa (opcional)

Sin claves, el análisis usa solo la heurística propia. Para sumar la reputación de servicios
externos al score, añade sus claves en `.env` y reinicia (`docker compose up -d`):

| Servicio | Variable | Cómo obtener la clave | Puntos |
|---|---|---|---|
| VirusTotal | `VIRUSTOTAL_API_KEY` | Cuenta gratuita → *API key* en tu perfil | 20 · 40 · 60 según motores que la detectan |
| Google Safe Browsing | `GOOGLE_SAFE_BROWSING_API_KEY` | Google Cloud Console → habilitar *Safe Browsing API* → *Credenciales* | 70 si está en las listas de Google |

- **Score = min(100, heurística + reputación).**
- Las APIs se consultan en paralelo con un máximo de 4 s (`REPUTATION_TIMEOUT_MS`). Si una falla,
  el análisis continúa con las demás, se marca como `partial` y el fallo queda registrado como incidencia.
- Los resultados se reutilizan 24 h por URL (`REPUTATION_CACHE_HOURS`) para no gastar cuota
  (VirusTotal gratuito: 4 consultas/minuto, 500/día).
- A VirusTotal solo se le **consulta** el informe existente: la URL no se envía a analizar.

## Arquitectura

```
Navegador ──► app (NestJS, :3000 → :8080)          ──► db (PostgreSQL 18)
              ├── /      frontend Angular (estático)    volumen pgdata
              └── /api   API REST
```

| Componente | Tecnología |
|---|---|
| Frontend | Angular 22 |
| API | NestJS 12 + TypeORM |
| Base de datos | PostgreSQL 18 (configuración ajustada en `database/postgres/`) |
| Despliegue | Docker: imagen única `app` + `db` |

## API

Documentación interactiva (Swagger) en modo desarrollo: `http://localhost:3000/api/docs`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/analyses` | Analiza una URL y guarda el resultado |
| `GET` | `/api/analyses?limit=&offset=` | Historial paginado |
| `GET` | `/api/analyses/:id` | Detalle con las reglas activadas |
| `DELETE` | `/api/analyses/:id` | Borra un análisis |
| `DELETE` | `/api/analyses?confirm=true` | Vacía el historial |
| `GET` | `/api/stats?days=30` | Datos del dashboard |
| `GET` | `/api/heuristics/rules` | Catálogo de reglas y pesos |
| `GET` | `/api/reputation/sources` | Fuentes externas y si están configuradas |
| `GET` | `/api/health` | Estado de la API y la base de datos |

Pruebas de la API con Postman/Newman: ver [`backend/postman/`](backend/postman/README.md).

## Desarrollo

```bash
docker compose up -d db          # solo PostgreSQL, publicado en localhost:5432
cd backend && npm install && npm run start:dev    # API en :3000
cd frontend && npm install && npm start           # Angular en :4200
```

| Tarea | Comando (en `backend/`) |
|---|---|
| Tests unitarios | `npm test` |
| Lint | `npm run lint` |
| Nueva migración | `npm run migration:generate --name=Nombre` |
| Aplicar / revertir | `npm run migration:run` / `npm run migration:revert` |

Las migraciones también se aplican solas al arrancar la aplicación.

## Licencia

Ver [LICENSE](LICENSE).
