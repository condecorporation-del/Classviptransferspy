"""Prueba de conexión a la base de datos configurada en .env.

Uso:
    cd backend && source .venv/bin/activate
    python scripts/test_db.py

Verifica, en orden:
1. Que el engine puede abrir una conexión real (SELECT 1).
2. Qué tablas existen en el schema public (deben ser 19 tras correr Alembic).
3. Cuántos bookings hay (para confirmar que las escrituras persisten).

Si falla aquí, no tiene sentido seguir con el resto del backend — primero
hay que resolver la conexión (credenciales, SSL, pooler correcto, etc.).
"""

import asyncio
import sys

from sqlalchemy import text

from app.database import AsyncSessionLocal, engine


async def main() -> None:
    print(f"DB URL (sin password): {engine.url.set(password='***')}")
    print(f"Pool: {engine.pool.__class__.__name__}")
    print()

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            print("SELECT 1 →", result.scalar())

            tables = (
                await session.execute(
                    text(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = 'public' ORDER BY table_name"
                    )
                )
            ).scalars().all()
            print(f"\nTablas encontradas ({len(tables)}):")
            for t in tables:
                print(f"  - {t}")

            if "bookings" in tables:
                count = (
                    await session.execute(text("SELECT COUNT(*) FROM bookings"))
                ).scalar()
                print(f"\nTotal de bookings en la tabla: {count}")
            else:
                print(
                    "\n⚠️  La tabla 'bookings' no existe todavía. "
                    "Corre 'alembic upgrade head' (ver T4 del PLAN_PRODUCCION.md)."
                )
    except Exception as exc:  # noqa: BLE001 — script de diagnóstico, queremos ver cualquier error
        print(f"\n❌ Falló la conexión: {exc!r}")
        sys.exit(1)
    finally:
        await engine.dispose()

    print("\n✅ Conexión OK.")


if __name__ == "__main__":
    asyncio.run(main())
