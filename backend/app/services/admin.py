"""AdminService — Autenticación y gestión de administradores.

Maneja login, creación y actualización de admins.
El hash de contraseñas usa Argon2id (vía pwdlib en core/security.py).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AdminNotFoundError,
    AuthenticationError,
    DuplicateEntityError,
)
from app.core.security import hash_password, verify_password
from app.models.admin import AdminUser
from app.schemas.admin import UpdateAdminRequest
from app.schemas.auth import CreateAdminRequest


class AdminService:
    """Gestión de administradores del sistema."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Autenticación ───────────────────────────────────────

    async def authenticate(self, email: str, password: str) -> AdminUser:
        """Verifica credenciales y devuelve el AdminUser si son válidas.

        Busca por email normalizado (lowercase + strip).
        Usa verify_password() que compara en tiempo constante
        para resistir timing attacks.

        Raises:
            AuthenticationError: Si el email no existe o la contraseña es incorrecta.
        """
        email_clean = email.lower().strip()
        result = await self.db.execute(select(AdminUser).where(AdminUser.email == email_clean))
        admin = result.scalar_one_or_none()

        if not admin:
            raise AuthenticationError("Email o contraseña inválidos")

        if not verify_password(password, admin.password_hash):
            raise AuthenticationError("Email o contraseña inválidos")

        return admin

    # ─── CRUD ────────────────────────────────────────────────

    async def get_by_id(self, admin_id: str) -> AdminUser:
        """Obtiene un admin por ID.

        Raises:
            AdminNotFoundError: Si no existe.
        """
        result = await self.db.execute(select(AdminUser).where(AdminUser.id == admin_id))
        admin = result.scalar_one_or_none()
        if not admin:
            raise AdminNotFoundError(admin_id)
        return admin

    async def get_by_email(self, email: str) -> AdminUser | None:
        """Busca admin por email. Devuelve None si no existe."""
        email_clean = email.lower().strip()
        result = await self.db.execute(select(AdminUser).where(AdminUser.email == email_clean))
        return result.scalar_one_or_none()

    async def create(self, data: CreateAdminRequest) -> AdminUser:
        """Crea un administrador nuevo.

        Hasha la contraseña con Argon2id antes de guardar.
        NUNCA guarda contraseñas en texto plano.

        Raises:
            DuplicateEntityError: Si el email ya está registrado.
        """
        existing = await self.get_by_email(data.email)
        if existing:
            raise DuplicateEntityError("AdminUser", "email", data.email)

        admin = AdminUser(
            email=data.email,
            password_hash=hash_password(data.password),
            role=data.role,
        )
        self.db.add(admin)
        await self.db.commit()
        await self.db.refresh(admin)
        return admin

    async def update(self, admin_id: str, data: UpdateAdminRequest) -> AdminUser:
        """Actualiza email y/o role de un admin.

        Si se cambia el email, verifica que no esté en uso.
        """
        admin = await self.get_by_id(admin_id)
        update_data = data.model_dump(exclude_unset=True)

        # Si cambia el email, verificar que no esté duplicado
        if "email" in update_data:
            new_email = update_data["email"].lower().strip()
            if new_email != admin.email:
                existing = await self.get_by_email(new_email)
                if existing:
                    raise DuplicateEntityError("AdminUser", "email", new_email)
            update_data["email"] = new_email

        for key, value in update_data.items():
            setattr(admin, key, value)

        await self.db.commit()
        await self.db.refresh(admin)
        return admin

    async def list_all(self) -> list[AdminUser]:
        """Lista todos los administradores ordenados por fecha de creación."""
        result = await self.db.execute(select(AdminUser).order_by(AdminUser.created_at))
        return list(result.scalars().all())
