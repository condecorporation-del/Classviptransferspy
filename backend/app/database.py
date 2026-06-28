from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

# Railway (y otras plataformas) inyectan DATABASE_URL con prefijo postgresql://
# o postgres:// sin especificar el driver. create_async_engine requiere
# postgresql+asyncpg://. Si el prefijo no lo incluye, lo corregimos aquí.
# También eliminamos parámetros que asyncpg no acepta (ej. pgbouncer=true de
# Supabase Session Pooler — asyncpg los pasaría como kwargs a connect() y explota).
def _asyncpg_url(url: str) -> str:
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
            break
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    params.pop("pgbouncer", None)
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=clean_query))

_database_url = _asyncpg_url(settings.database_url)

# ─── Engine ───────────────────────────────────────────────────────────────────
# El engine es el "motor" que conecta SQLAlchemy con PostgreSQL.
# create_async_engine usa asyncpg por debajo para operaciones no bloqueantes.
#
# Con Supabase hay dos formas de conectar:
# - Session pooler / Direct (puerto 5432): soporta prepared statements, pool normal.
# - Transaction pooler (puerto 6543): PgBouncer reasigna la conexión física en
#   cada transacción. asyncpg nombra sus prepared statements de forma numérica
#   secuencial ("__asyncpg_stmt_1__", "__asyncpg_stmt_2__", ...); como cada
#   conexión lógica nueva reinicia ese contador, dos clientes distintos pueden
#   acabar generando el mismo nombre sobre la MISMA conexión física que
#   PgBouncer les reparte, y Postgres responde "prepared statement ya existe".
#   La solución oficial de SQLAlchemy (ver docs del dialecto asyncpg, sección
#   "Prepared Statement Name with PGBouncer") es generar nombres únicos con
#   uuid4 en vez de dejar la numeración por defecto, además de NullPool para
#   no mantener conexiones "fantasma" entre requests.
_is_transaction_pooler = ":6543" in _database_url
# Postgres local (docker-compose, dev en la máquina) no tiene TLS configurado.
# Solo exigimos SSL cuando el host no es localhost (es decir, cuando es Supabase real).
_is_local_host = any(h in _database_url for h in ("@localhost", "@127.0.0.1", "@db:"))

_connect_args: dict = {} if _is_local_host else {"ssl": "require"}
if _is_transaction_pooler:
    _connect_args["statement_cache_size"] = 0
    _connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4()}__"

_pool_kwargs: dict
if _is_transaction_pooler:
    _pool_kwargs = {"poolclass": NullPool}
else:
    _pool_kwargs = {
        "pool_size": 5,  # Supabase tiene límite de conexiones — pool chico por worker
        "max_overflow": 5,
        # pool_pre_ping + pool_recycle evitan el típico "a veces no conecta": el pooler
        # de Supabase cierra conexiones inactivas y, sin esto, SQLAlchemy intenta usar
        # una conexión ya muerta.
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

engine = create_async_engine(
    _database_url,
    echo=settings.environment == "development",  # Muestra SQL en consola en dev
    connect_args=_connect_args,
    **_pool_kwargs,
)

# ─── Session Factory ──────────────────────────────────────────────────────────
# async_sessionmaker es una fábrica. Cada vez que llamas AsyncSessionLocal()
# obtienes una sesión nueva lista para hacer queries.
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # No "expira" objetos tras commit (necesario en async)
)


# ─── Base Declarativa ─────────────────────────────────────────────────────────
# Todos los modelos SQLAlchemy heredan de esta clase.
# SQLAlchemy la usa para descubrir tablas, relaciones y mapeos.
class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy."""
