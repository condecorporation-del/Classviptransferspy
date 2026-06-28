"""Utilidades de seguridad: hash de contraseñas, JWT, tokens seguros.

Usa Argon2id para contraseñas (vía pwdlib) y HS256 para JWT (vía python-jose).

Por qué Argon2id y no bcrypt:
- Argon2id ganó la Password Hashing Competition en 2015
- Es resistente a GPU/ASIC (usa memoria además de CPU)
- pwdlib lo recomienda como default
"""

from datetime import UTC, datetime, timedelta

import jwt
from jwt.exceptions import PyJWTError
from pwdlib import PasswordHash

from app.core.config import get_settings

settings = get_settings()

# ─── Password Hashing ──────────────────────────────────────

# PasswordHash.recommended() usa Argon2id con parámetros seguros
password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Convierte contraseña en texto plano a hash irreversible.

    Dos hashes de la misma contraseña son diferentes (salt aleatorio).
    La verificación se hace con verify_password(), no comparando strings.
    """
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña coincide con el hash almacenado.

    pwdlib detecta automáticamente el algoritmo usado en el hash
    y aplica la verificación correcta.
    """
    return password_hash.verify(plain_password, hashed_password)


# ─── JWT ───────────────────────────────────────────────────

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8  # 8 horas de sesión


def create_access_token(subject: str, expires_hours: int = ACCESS_TOKEN_EXPIRE_HOURS) -> str:
    """Crea un JWT firmado con HS256.

    El payload incluye:
    - sub: identificador del usuario (email del admin)
    - exp: expiration time (UTC)
    - iat: issued at time (UTC)

    Cualquiera puede decodificar el payload, pero solo nosotros
    podemos crear tokens válidos (porque solo nosotros tenemos secret_key).
    """
    now = datetime.now(UTC)
    expire = now + timedelta(hours=expires_hours)

    payload = {
        "sub": subject,
        "exp": expire,
        "iat": now,
    }

    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Decodifica un JWT y devuelve el subject (email del admin).

    Si el token expiró, es inválido, o fue manipulado, devuelve None.
    No lanza excepción — el caller decide cómo manejar None.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload.get("sub")
    except PyJWTError:
        return None
