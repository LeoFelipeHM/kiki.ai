#!/bin/sh
set -eu

# Opcional: defina RUN_MIGRATIONS=0 no worker ou outros serviços que não devem aplicar SQL.
if [ "${RUN_MIGRATIONS:-1}" != "0" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "docker-entrypoint: DATABASE_URL não definida; migrations ignoradas."
  else
    echo "docker-entrypoint: aguardando PostgreSQL..."
    until psql "$DATABASE_URL" -c '\q' >/dev/null 2>&1; do
      sleep 1
    done

    echo "docker-entrypoint: aplicando migrations em /app/migrations ..."
    for f in /app/migrations/*.sql; do
      [ -f "$f" ] || continue
      echo "  -> $(basename "$f")"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
    done
    echo "docker-entrypoint: migrations concluídas."
  fi
fi

exec "$@"
