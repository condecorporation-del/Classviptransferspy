"""Schemas Pydantic para autenticación (auth).

Login, registro de admin, tokens JWT, y cambio de contraseña.

Seguridad:
- NUNCA se expone password_hash en ningún response.
- Las contraseñas se validan con complejidad mínima antes del hash.
- Los tokens JWT tienen campos específicos (no se serializa el objeto entero).
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# ═══════════════════════════════════════════════════════════════════
# REQUEST — Login y gestión de credenciales
# ═══════════════════════════════════════════════════════════════════


class LoginRequest(BaseModel):
    """Schema para POST /api/v1/auth/login.

    El endpoint:
    1. Busca al admin por email
    2. Verifica el password hash con Argon2
    3. Genera un JWT con id, email, role
    4. Lo mete en una cookie httpOnly + secure
    """

    email: EmailStr = Field(..., description="Email del administrador")
    password: str = Field(..., min_length=8, max_length=128, description="Contraseña")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class CreateAdminRequest(BaseModel):
    """Schema para POST /api/v1/auth/register — Crear admin inicial.

    Solo se usa en el setup inicial (seed) o por un superadmin.
    No es un endpoint público.
    """

    email: EmailStr = Field(..., description="Email del nuevo administrador")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Contraseña (mínimo 8 caracteres)",
    )
    role: str = Field(default="admin", max_length=255, description="Rol: admin, superadmin")

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Rechaza contraseñas débiles antes de hashear.

        Reglas mínimas:
        - Al menos 8 caracteres (ya cubierto por min_length)
        - Al menos una mayúscula
        - Al menos un número
        """
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class ChangePasswordRequest(BaseModel):
    """Schema para POST /api/v1/auth/change-password.

    Requiere la contraseña actual para verificar identidad.
    """

    current_password: str = Field(..., min_length=1, description="Contraseña actual")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña",
    )

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


# ═══════════════════════════════════════════════════════════════════
# RESPONSE — Tokens y sesión
# ═══════════════════════════════════════════════════════════════════


class TokenResponse(BaseModel):
    """Respuesta al login exitoso.

    El access_token es un JWT firmado con HS256.
    expires_in está en segundos (default: 86400 = 24 horas).
    """

    access_token: str = Field(..., description="JWT firmado")
    token_type: str = Field(default="bearer")
    expires_in: int = Field(default=86400, description="Segundos hasta expiración")


class AdminSession(BaseModel):
    """Datos del admin en sesión (extraídos del JWT).

    No incluye password_hash — solo datos seguros para exponer.
    """

    id: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
