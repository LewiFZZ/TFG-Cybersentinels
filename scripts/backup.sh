#!/bin/sh
# Copia de seguridad de la base de datos de URLSentinel.
# Uso: ./scripts/backup.sh   (guarda en backups/ y borra las copias de más de 14 días)
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
f="backups/urlsentinel-$(date +%F_%H%M).dump"
trap 'rm -f "$f.tmp"' EXIT
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$f.tmp"
mv "$f.tmp" "$f"
find backups -name 'urlsentinel-*.dump' -mtime +14 -delete
echo "Copia creada: $f ($(du -h "$f" | cut -f1))"
