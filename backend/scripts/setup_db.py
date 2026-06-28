#!/usr/bin/env python3
"""Script para setup inicial: crear tablas + admin por defecto.

Ejecutar: cd backend && python scripts/setup_db.py

Crea:
- Tablas en PostgreSQL (si no existen)
- Usuario admin inicial (email: admin@classviptransfers.com)
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.core.security import hash_password
from app.database import AsyncSessionLocal, Base, engine
from app.models.admin import AdminUser


async def setup():
    # 1. Crear tablas
    print("Creando tablas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Tablas creadas")

    # 2. Crear admin inicial
    admin_email = os.getenv("ADMIN_EMAIL", "admin@classviptransfers.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin123!")

    async with AsyncSessionLocal() as db:
        # Verificar si ya existe
        result = await db.execute(select(AdminUser).where(AdminUser.email == admin_email))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"⚠ Admin {admin_email} ya existe, se omite creación")
        else:
            admin = AdminUser(
                email=admin_email,
                password_hash=hash_password(admin_password),
                role="superadmin",
            )
            db.add(admin)
            await db.commit()
            print(f"✓ Admin creado: {admin_email}")
            print(f"  Password: {admin_password} (cámbiala en producción)")

    await engine.dispose()
    print("\n✓ Setup completado")


if __name__ == "__main__":
    asyncio.run(setup())
