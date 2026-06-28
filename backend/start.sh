#!/usr/bin/env bash
# Arranque del backend en Railway.
# 1) Aplica migraciones pendientes.
# 2) Crea/actualiza el usuario admin principal.
# 3) Lanza uvicorn.
set -euo pipefail

echo "==> Aplicando migraciones (alembic upgrade head)"
alembic upgrade head

echo "==> Asegurando usuario admin"
python scripts/ensure_admin.py

echo "==> Iniciando uvicorn en 0.0.0.0:${PORT:-8000} (${WEB_CONCURRENCY:-2} workers)"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --proxy-headers \
  --forwarded-allow-ips='*'
