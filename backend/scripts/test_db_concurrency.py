"""Prueba de concurrencia contra el pooler de Supabase.

Simula varios requests simultáneos (como haría FastAPI con tráfico real)
para confirmar que el fix de prepared_statement_name_func aguanta bajo
carga concurrente, no solo en una llamada secuencial aislada.

Uso: python scripts/test_db_concurrency.py
"""

import asyncio

from sqlalchemy import text

from app.database import AsyncSessionLocal, engine


async def worker(worker_id: int) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT CAST(:n AS INTEGER)"), {"n": worker_id})
        value = result.scalar()
        assert value == worker_id, f"worker {worker_id} recibió {value}"
        print(f"  worker {worker_id} OK")


async def main() -> None:
    n = 30
    print(f"Lanzando {n} queries concurrentes...")
    try:
        await asyncio.gather(*(worker(i) for i in range(n)))
    finally:
        await engine.dispose()
    print(f"\n✅ {n} queries concurrentes sin colisión de prepared statements.")


if __name__ == "__main__":
    asyncio.run(main())
