# ClassVIP Transfers — Backend API

Luxury Transportation Booking System for Los Cabos, BCS, México.

## Stack

- **Python 3.12** + **FastAPI** (async REST API)
- **PostgreSQL 16** + **SQLAlchemy 2.0** (async ORM)
- **Pydantic v2** (validation)
- **JWT** + **httpOnly cookies** (auth)
- **Stripe** (payments)
- **Resend** (transactional emails)
- **WeasyPrint** (PDF generation)

## Quick Start

```bash
# 1. Clonar y crear entorno
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install uv
uv sync

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Setup inicial (crea tablas + admin)
python scripts/setup_db.py
python scripts/seed.py  # Datos de prueba: hoteles, áreas, precios

# 4. Iniciar servidor
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/v1/bookings/` | No |
| GET | `/api/v1/bookings/{id}` | No |
| GET | `/api/v1/bookings/{id}/pdf` | No |
| POST | `/api/v1/auth/login` | No |
| POST | `/api/v1/auth/register` | No |
| POST | `/api/v1/auth/logout` | No |
| GET | `/api/v1/customers/{id}` | No |
| POST | `/api/v1/customers/` | No |
| PATCH | `/api/v1/customers/{id}` | No |
| GET | `/api/v1/pricing/hotels` | No |
| GET | `/api/v1/pricing/areas` | No |
| GET | `/api/v1/pricing/rules` | No |
| GET | `/api/v1/pricing/extras` | No |
| POST | `/api/v1/stripe/create-payment-intent` | No |
| POST | `/api/v1/stripe/webhook` | No |
| GET | `/api/v1/admin/users` | ✅ Admin |
| PATCH | `/api/v1/admin/users/{id}` | ✅ Admin |

**Docs:** http://localhost:8000/docs (Swagger UI)

## Testing

```bash
pytest app/tests/ -v          # Todos los tests
pytest app/tests/ -v -k auth  # Solo tests de auth
```

## Deploy

```bash
# Docker Compose
docker compose -f docker/docker-compose.yml up -d

# Variables requeridas en .env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/classvip
SECRET_KEY=<random-64-chars>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app
│   ├── database.py           # SQLAlchemy engine
│   ├── dependencies.py       # FastAPI dependencies
│   ├── api/v1/               # REST endpoints
│   ├── services/             # Business logic
│   ├── models/               # SQLAlchemy models
│   ├── schemas/              # Pydantic validation
│   ├── core/                 # Config, security, exceptions
│   ├── middleware/            # Auth middleware
│   ├── templates/            # HTML templates (email + PDF)
│   └── tests/                # pytest tests
├── scripts/
│   ├── seed.py               # Datos semilla
│   └── setup_db.py           # Setup inicial
└── pyproject.toml
```

## License

Proprietary — ClassVIP Transfers
