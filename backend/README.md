# ClassVIP Transfers — Backend

Backend del sistema de reservas de ClassVIP Transfers (transporte de lujo en Los Cabos).

- **Stack:** FastAPI + SQLAlchemy 2.0 (async) + Pydantic v2 + PostgreSQL (Supabase).
- **Migraciones:** Alembic (`alembic upgrade head`). El schema NUNCA se crea con `create_all`.
- **Tests:** `pytest` (SQLite en memoria, no toca Supabase).

El plan de trabajo completo, el historial de cambios y la guía de mantenimiento viven en
`../WORKPLAN.md` (raíz del proyecto). Léelo antes de tocar el código.

## Correr en local

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install uv && uv sync --extra dev
uvicorn app.main:app --reload   # requiere un .env con DATABASE_URL (ver .env.example)
```

## Tests

```bash
pytest -q
```
