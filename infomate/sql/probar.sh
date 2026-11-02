#!/bin/sh
# Prueba el esquema en un Postgres 17 descartable (Docker). No toca ninguna base real.
set -e
cd "$(dirname "$0")"
C=infomate-prueba-$$
docker run -d --rm --name "$C" -e POSTGRES_PASSWORD=prueba -e POSTGRES_DB=infomate postgres:17-alpine >/dev/null
trap 'docker rm -f "$C" >/dev/null' EXIT
until docker exec "$C" pg_isready -U postgres -d infomate -q 2>/dev/null; do sleep 1; done
sleep 1
docker exec -i "$C" psql -q -v ON_ERROR_STOP=1 -U postgres -d infomate < 01-esquema.sql
docker exec -i "$C" psql -q -v ON_ERROR_STOP=1 -U postgres -d infomate < prueba.sql
