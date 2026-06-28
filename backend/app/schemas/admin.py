"""Schemas Pydantic para administradores (AdminUser).

CRUD de administradores del sistema.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# ═══════════════════════════════════════════════════════════════════
# REQUEST — Crear / actualizar admin
# ═══════════════════════════════════════════════════════════════════


class CreateAdminRequest(BaseModel):
    """Schema para crear un admin (ya definido en auth.py, alias aquí).

    Reexportado para que el admin CRUD tenga sus propios schemas
    sin depender del módulo de auth.
    """

    email: EmailStr = Field(..., description="Email del nuevo administrador")
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="admin", max_length=255)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class UpdateAdminRequest(BaseModel):
    """Schema para PATCH /api/v1/admin/users/{id} — Actualizar admin."""

    email: EmailStr | None = None
    role: str | None = Field(None, max_length=255)

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return v.lower().strip()


# ═══════════════════════════════════════════════════════════════════
# RESPONSE
# ═══════════════════════════════════════════════════════════════════


class AdminResponse(BaseModel):
    """Admin en respuesta JSON.

    NUNCA incluye password_hash.
    """

    id: str
    email: str
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminListResponse(BaseModel):
    """Lista paginada de administradores."""

    items: list[AdminResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
