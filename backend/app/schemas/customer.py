"""Schemas Pydantic para clientes (Customer).

Los clientes son creados automáticamente al hacer una reserva,
pero también pueden ser gestionados manualmente desde el admin.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# ═══════════════════════════════════════════════════════════════════
# REQUEST — Crear / actualizar cliente
# ═══════════════════════════════════════════════════════════════════


class CreateCustomerRequest(BaseModel):
    """Schema para POST /api/v1/customers — Crear cliente manualmente.

    Normalmente los clientes se crean automáticamente al hacer una reserva,
    pero este endpoint permite crearlos desde el admin sin reserva.
    """

    name: str = Field(..., min_length=1, max_length=255, description="Nombre completo")
    email: EmailStr = Field(..., description="Email único del cliente")
    phone: str = Field(..., min_length=7, max_length=20, description="Teléfono")
    country: str | None = Field(None, max_length=100, description="País de origen")
    language: str = Field(default="en", pattern=r"^(en|es)$", description="Idioma preferido")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("phone")
    @classmethod
    def phone_clean(cls, v: str) -> str:
        """Limpia el teléfono: quita espacios, paréntesis y guiones."""
        return v.strip().replace(" ", "").replace("(", "").replace(")", "").replace("-", "")


class UpdateCustomerRequest(BaseModel):
    """Schema para PATCH /api/v1/customers/{id} — Actualizar cliente."""

    name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, min_length=7, max_length=20)
    country: str | None = Field(None, max_length=100)
    language: str | None = Field(None, pattern=r"^(en|es)$")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return v.lower().strip()

    @field_validator("phone")
    @classmethod
    def phone_clean(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return v.strip().replace(" ", "").replace("(", "").replace(")", "").replace("-", "")


# ═══════════════════════════════════════════════════════════════════
# RESPONSE
# ═══════════════════════════════════════════════════════════════════


class CustomerResponse(BaseModel):
    """Cliente en respuesta JSON."""

    id: str
    name: str
    email: str
    phone: str
    country: str | None = None
    language: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustomerListResponse(BaseModel):
    """Lista paginada de clientes."""

    items: list[CustomerResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
