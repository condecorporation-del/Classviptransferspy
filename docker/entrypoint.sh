#!/bin/sh
set -e

# Aplica migraciones pendientes antes de levantar el servidor.
# Así Railway/Render nunca arrancan con un schema desactualizado —
# es la única fuente de verdad del schema en producción (ver T4 en WORKPLAN.md).
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
