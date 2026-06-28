import asyncio
from logging.config import fileConfig

from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from alembic import context

# Importar Base + TODOS los modelos (vía app.models) para que Alembic los
# vea en target_metadata. Sin esto, autogenerate no detecta ninguna tabla.
from app.core.config import get_settings
from app.database import Base
import app.models  # noqa: F401 — registra los modelos en Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Migraciones SIEMPRE corren contra la conexión "directa" (sin pooler de
# transacciones) — DDL necesita prepared statements y conexión estable que
# el Transaction Pooler de Supabase no garantiza. Si DATABASE_URL_DIRECT no
# está configurada, caemos a DATABASE_URL (caso típico: dev local / Session pooler).
def _asyncpg_url(url: str) -> str:
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url[len(prefix):]
    return url

_settings = get_settings()
_raw_url = _settings.database_url_direct or _settings.database_url
_migration_url = _asyncpg_url(_raw_url)
config.set_main_option("sqlalchemy.url", _migration_url)

# Mismo criterio que app/database.py: solo exigir SSL si no es Postgres local.
_is_local_host = any(h in _migration_url for h in ("@localhost", "@127.0.0.1", "@db:"))
_connect_args: dict = {} if _is_local_host else {"ssl": "require"}

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = create_async_engine(
        _migration_url,
        poolclass=NullPool,
        connect_args=_connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
