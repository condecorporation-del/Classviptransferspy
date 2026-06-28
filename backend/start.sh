#!/usr/bin/env bash
# Arranque del backend en Railway.
# 1) Aplica migraciones pendientes (el esquema lo maneja Alembic, nunca create_all).
# 2) Lanza uvicorn escuchando en el puerto que inyecta Railway ($PORT).
set -euo pipefail

echo "==> Aplicando migraciones (alembic upgrade head)"
alembic upgrade head

# --proxy-headers + --forwarded-allow-ips: Railway termina el TLS en su edge y
# reenvía el request por HTTP con cabeceras X-Forwarded-*. Sin esto, uvicorn ve
# la IP del proxy (no la del cliente real) y el rate limiter por IP no sirve.
echo "==> Iniciando uvicorn en 0.0.0.0:${PORT:-8000} (${WEB_CONCURRENCY:-2} workers)"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --proxy-headers \
  --forwarded-allow-ips='*'
