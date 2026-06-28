"""ensure_admin.py — Garantiza el admin principal con contraseña fija.

Idempotente: ejecútalo las veces que quieras. Asegura que el usuario
admin@classviptransfers.com exista y tenga SIEMPRE la contraseña ADMIN_PASSWORD.

Uso:
    cd backend && source .venv/bin/activate && python scripts/ensure_admin.py
"""

import asyncio

from sqlalchemy import select

from app.core.security import hash_password, verify_password
from app.database import AsyncSessionLocal
from app.models.admin import AdminUser

ADMIN_EMAIL = "admin@classviptransfers.com"
ADMIN_PASSWORD = "Class361372"  # contraseña fija solicitada por el dueño
ADMIN_ROLE = "admin"


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == ADMIN_EMAIL)
        )
        admin = result.scalar_one_or_none()

        if admin is None:
            admin = AdminUser(
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                role=ADMIN_ROLE,
            )
            db.add(admin)
            await db.commit()
            print(f"[ensure_admin] CREADO {ADMIN_EMAIL} con contraseña fija.")
            return

        # Ya existe: re-fija la contraseña solo si no coincide (evita writes inútiles).
        if verify_password(ADMIN_PASSWORD, admin.password_hash):
            print(f"[ensure_admin] OK — {ADMIN_EMAIL} ya tiene la contraseña correcta.")
            return

        admin.password_hash = hash_password(ADMIN_PASSWORD)
        admin.role = ADMIN_ROLE
        await db.commit()
        print(f"[ensure_admin] ACTUALIZADA la contraseña de {ADMIN_EMAIL}.")


if __name__ == "__main__":
    asyncio.run(main())
