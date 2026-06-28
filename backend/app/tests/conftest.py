"""Fixtures compartidas para todos los tests.

Usa SQLite en memoria — no necesita PostgreSQL instalado.
Cada test tiene su propia DB limpia (create_all/drop_all).
"""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.rate_limit import limiter
from app.database import Base
from app.dependencies import get_db
from app.main import app

# Base de datos de prueba (SQLite en memoria, rápido y aislado)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Crea todas las tablas antes de cada test y las limpia después.

    autouse=True: se ejecuta automáticamente en TODOS los tests.
    Cada test empieza con DB limpia y termina con DB limpia.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(autouse=True)
def reset_rate_limiter():
    """Limpia el storage del rate limiter antes de cada test.

    El limiter (slowapi) es un singleton en memoria que vive durante todo
    el proceso de pytest, no por test — sin este reset, los límites de
    /auth/login (5/min) y /bookings/ (20/min) se acumulan entre tests
    de archivos distintos y empiezan a devolver 429 falsos en vez de
    probar la lógica real del endpoint.
    """
    limiter.reset()


@pytest_asyncio.fixture
async def db_session():
    """Provee una sesión de DB aislada para un test."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    """Cliente HTTP para probar los endpoints.

    Sobreescribe get_db para usar la DB de prueba en vez de PostgreSQL.
    """

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
