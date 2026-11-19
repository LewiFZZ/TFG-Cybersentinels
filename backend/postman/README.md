# Pruebas de la API con Postman

Biblioteca de pruebas de la API de URLSentinel: 49 peticiones y ~260 aserciones.

| Archivo | Contenido |
|---|---|
| `URLSentinel.postman_collection.json` | Colección con peticiones y tests |
| `URLSentinel-Docker.postman_environment.json` | `baseUrl = http://localhost:8080/api` (`docker compose up`) |
| `URLSentinel-Dev.postman_environment.json` | `baseUrl = http://localhost:3000/api` (`npm run start:dev`) |

## Uso en Postman

1. **Import** → arrastra los tres archivos JSON.
2. Selecciona el entorno (arriba a la derecha): *URLSentinel · Docker* o *URLSentinel · Dev*.
3. Clic derecho en la colección → **Run collection** → **Run**.

## Uso por terminal (Newman)

Con la aplicación levantada, desde esta carpeta:

```bash
npx newman@6 run URLSentinel.postman_collection.json -e URLSentinel-Docker.postman_environment.json
```

## Qué se prueba

| Carpeta | Qué cubre |
|---|---|
| 1. Salud | La API responde y PostgreSQL está conectado |
| 2. Heurística y reputación | Catálogo de las 14 reglas (códigos únicos, pesos válidos) y fuentes externas configuradas |
| 3. Análisis: casos de riesgo | Una URL por patrón (legítima, IP, suplantación de marca, homógrafo, `usuario@`, acortador, redirección embebida…). Comprueba score, clasificación, reglas activadas y que score = suma de pesos (heurística + reputación) |
| 4. Historial y detalle | Paginación, orden por fecha y que el detalle coincide con lo guardado |
| 5. Dashboard | `GET /stats`: los totales por nivel suman el total, la suma diaria cuadra, fechas consecutivas, rankings ordenados |
| 6. Borrado | Borrar un análisis (204, luego 404). Vaciar el historial **solo sin confirmar** (400): la colección nunca borra tu historial |
| 7. Validación y errores | URL vacía o no válida, protocolos no permitidos, campos extra (mass assignment), URL > 2048, JSON roto, `limit`/`offset` fuera de rango, UUID no válido, intento de inyección SQL, 404 |
| 8. Seguridad | Cabeceras (CSP, HSTS, X-Frame-Options…) sin duplicados, sin `X-Powered-By`, errores sin stack trace y rate limit (429 + `Retry-After`) |

Además, **todas** las peticiones comprueban que responden en menos de 5 s (requisito de la memoria) y, salvo los 204, que devuelven JSON.

## A tener en cuenta

- **Ejecuta las carpetas en orden**: la 4, la 5 y la 6 usan datos creados por la 3.
- **Rate limit**: `POST /analyses` admite 20 peticiones por minuto e IP. Una ejecución completa usa 19 y la carpeta 8 agota el resto a propósito, así que **después de ejecutarla espera al menos 60 s** antes de volver a lanzar la colección (si no, la carpeta 3 falla con 429).
- Cada ejecución deja unos 11 análisis nuevos en el historial.
