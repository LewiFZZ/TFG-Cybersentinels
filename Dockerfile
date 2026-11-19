# syntax=docker/dockerfile:1
# URLSentinel: imagen única con la API (NestJS) y el frontend (Angular).

# ---------- 1. Frontend Angular ----------
FROM node:24-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --configuration production

# ---------- 2. Backend NestJS ----------
FROM node:24-alpine AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ---------- 3. Runtime ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=backend --chown=node:node /app/package.json ./
COPY --from=backend --chown=node:node /app/node_modules ./node_modules
COPY --from=backend --chown=node:node /app/dist ./dist
COPY --from=frontend --chown=node:node /frontend/dist/frontend/browser ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "dist/main.js"]
