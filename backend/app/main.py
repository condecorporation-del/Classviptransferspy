import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.router import router as api_router
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.database import AsyncSessionLocal, engine
from app.middleware.auth import AdminAuthMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

logger = logging.getLogger(__name__)
settings = get_settings()


# ─── Lifespan ─────────────────────────────────────────────────────────────────
# Código que se ejecuta al iniciar el servidor (antes del yield)
# y al apagarlo (después del yield).
#
# El schema de la DB lo crea/actualiza Alembic ("alembic upgrade head"),
# NUNCA este lifespan. Antes este código llamaba a Base.metadata.create_all()
# en development, pero eso desincroniza el schema real de las migraciones
# versionadas: si alguien corre la app sin migrar, las tablas "aparecen
# solas" con create_all y nadie nota que falta correr Alembic — hasta que
# se va a producción (donde create_all nunca corría) y la DB está vacía.
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Libera recursos al apagar. El arranque no toca el schema de la DB."""
    yield
    # Al apagar: cerrar todas las conexiones a la base de datos
    await engine.dispose()


# ─── App ──────────────────────────────────────────────────────────────────────
# En producción se ocultan /docs, /redoc y /openapi.json: exponer públicamente
# el esquema completo de la API (todos los endpoints, parámetros y modelos) le
# da un mapa gratis a un atacante. En desarrollo siguen disponibles.
_is_prod = settings.environment == "production"

app = FastAPI(
    title="ClassVIP Transfers API",
    description="Luxury Transportation Booking System — Backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if _is_prod else "/docs",  # Swagger UI (oculto en producción)
    redoc_url=None if _is_prod else "/redoc",  # ReDoc (oculto en producción)
    openapi_url=None if _is_prod else "/openapi.json",  # Esquema crudo (oculto en producción)
)


# ─── Middleware order ─────────────────────────────────────────────────────────
# En Starlette, add_middleware() apila de adentro hacia afuera: el ÚLTIMO que
# se agrega es el PRIMERO en ejecutarse para cada request. El orden correcto:
#
#   Request → CORS → SlowAPI → AdminAuth → SecurityHeaders → Routes
#
# CORS debe ser el más externo para que los preflights OPTIONS de cualquier
# ruta (incluso /admin/*) sean respondidos antes de que auth o rate-limit los
# intercepten. Por eso se agrega AL FINAL (aquí abajo, no arriba).

# ─── Security Headers ─────────────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware, hsts=(settings.environment == "production"))

# ─── Auth Middleware ──────────────────────────────────────────────────────────
app.add_middleware(AdminAuthMiddleware)

# ─── Rate Limiting ────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ─── CORS — debe ser el último en agregarse (primero en ejecutarse) ───────────
# Se agregan FRONTEND_URL y localhost automáticamente para no depender de que
# ALLOWED_ORIGINS esté perfectamente formateado.
_extra = {settings.frontend_url.rstrip("/")} if settings.frontend_url else set()
origins = list(
    {o.strip().rstrip("/") for o in settings.allowed_origins.split(",") if o.strip()}
    | _extra
    | {"http://localhost:5173", "http://localhost:4173"}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── IntegrityError → 409 ─────────────────────────────────────────────────────
# Una violación de constraint de la DB (ej. nombre de área duplicado,
# "areas_name_key") es culpa del cliente que mandó un valor que choca con uno
# existente, no un fallo del servidor. Sin este handler, asyncpg.UniqueViolation
# burbujea como 500 "Internal Server Error". get_db() ya hizo rollback al
# propagarse la excepción, así que aquí solo traducimos a un 409 limpio.
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.info("IntegrityError en %s: %s", request.url.path, exc.orig)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "El recurso ya existe o viola una restricción de unicidad."},
    )


# ─── Preflight CORS catch-all ─────────────────────────────────────────────────
# Manejador explícito para TODOS los OPTIONS. Garantiza que los preflights
# cross-origin siempre reciban los headers correctos, independientemente
# de cómo se ordenen los middlewares.
@app.options("/{path:path}")
async def _cors_preflight(request: Request, path: str) -> Response:
    origin = request.headers.get("origin", "")
    allow_origin = origin if origin in origins else ""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": allow_origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
        },
    )


# ─── API v1 ───────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


# ─── Health Checks ────────────────────────────────────────────────────────────
# Dos endpoints con propósitos distintos (estándar en Kubernetes/Railway/Render):
#
# /health (liveness): "¿el proceso sigue vivo?" — no toca la DB a propósito.
# Si esto falla, la plataforma reinicia el contenedor — no quieres reiniciar
# el servidor entero solo porque Supabase tuvo un hiccup momentáneo.
#
# /health/ready (readiness): "¿puede recibir tráfico real ahora mismo?" — sí
# valida la DB con un SELECT 1. Si falla, la plataforma saca la instancia de
# rotación temporalmente, sin reiniciarla, hasta que la DB vuelva.
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Liveness — responde 200 si el proceso está vivo, sin tocar la DB."""
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}


@app.get("/health/ready")
@app.get("/api/health/ready")
async def readiness_check(response: Response):
    """Readiness — hace SELECT 1 contra la DB real. 503 si la DB no responde."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready", "timestamp": datetime.now(UTC).isoformat()}
    except Exception as exc:
        logger.warning("Readiness check falló: %s", exc)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "timestamp": datetime.now(UTC).isoformat()}


# ─── Root ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Endpoint raíz. Muestra info básica de la API."""
    return {
        "app": "ClassVIP Transfers API",
        "version": "1.0.0",
        "docs": "/docs",
    }
