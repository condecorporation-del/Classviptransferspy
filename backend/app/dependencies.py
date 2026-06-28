"""Inyección de dependencias para endpoints FastAPI.

FastAPI usa Depends() para inyectar recursos en los endpoints.
La dependencia principal es get_db(): provee una AsyncSession
por request y maneja commit/rollback automáticamente.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provee una sesión de DB por request.

    FastAPI llama a esta función antes de cada endpoint que
    la declare como dependencia: db: AsyncSession = Depends(get_db).

    Al terminar el request:
    - Si no hubo excepción: commit
    - Si hubo excepción: rollback
    - Siempre: close
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
