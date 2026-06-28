"""Dependencias de autenticación para endpoints protegidos.

get_current_admin() se usa como:
    admin = Depends(get_current_admin)

Si el middleware no encontró token válido, request.state.admin_email es None
y get_current_admin lanza 401.
"""

from fastapi import HTTPException, Request, status


async def get_current_admin(request: Request) -> str:
    """Devuelve el email del admin autenticado.

    El middleware AdminAuthMiddleware ya verificó el JWT y puso
    el email en request.state.admin_email.

    Si no hay autenticación, lanza 401.
    """
    email = getattr(request.state, "admin_email", None)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return email
