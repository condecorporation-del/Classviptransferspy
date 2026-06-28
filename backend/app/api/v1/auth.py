"""Endpoints de autenticación — login con cookie JWT, register."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, ClassVIPError
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.dependencies import get_db
from app.middleware.dependencies import get_current_admin
from app.schemas.auth import (
    AdminSession,
    CreateAdminRequest,
    LoginRequest,
    TokenResponse,
)
from app.services.admin import AdminService

router = APIRouter()
settings = get_settings()


@router.post(
    "/login",
    summary="Iniciar sesión como administrador",
)
@limiter.limit("5/minute")  # anti fuerza bruta — 5 intentos por minuto por IP
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/auth/login — Autenticar admin.

    Devuelve:
    - JSON con access_token y expires_in
    - Cookie httpOnly 'admin_token' con el JWT (más segura que localStorage)
    """
    service = AdminService(db)
    try:
        admin = await service.authenticate(data.email, data.password)
        token = create_access_token(admin.email)

        # Crear respuesta con cookie httpOnly
        response_content = TokenResponse(access_token=token).model_dump()
        response = JSONResponse(content=response_content)

        # Cookie httpOnly: el navegador la envía automáticamente
        # pero JavaScript NO puede leerla (protección XSS)
        response.set_cookie(
            key="admin_token",
            value=token,
            httponly=True,  # JavaScript no puede acceder
            # secure=True exige HTTPS. En producción siempre debe ir en True;
            # en development/test (http://localhost, tests con ASGITransport)
            # el navegador/cliente NUNCA reenvía una cookie Secure sobre HTTP
            # plano, así que el login "funciona" pero ninguna ruta protegida
            # vuelve a ver la cookie — login parece exitoso y nada más jala.
            secure=settings.environment == "production",
            samesite="lax",  # Protege contra CSRF básico
            max_age=28800,  # 8 horas en segundos
            path="/",
        )

        return response
    except AuthenticationError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)


@router.get(
    "/me",
    summary="Sesión actual del admin",
)
async def me(admin_email: str = Depends(get_current_admin)):
    """GET /api/v1/auth/me — Confirma la sesión activa vía cookie/JWT.

    El frontend lo usa para saber si ya hay sesión al cargar el panel
    (AdminRoute) sin tener que volver a mandar credenciales. 401 si la
    cookie no existe o el JWT venció — eso lo maneja get_current_admin.
    """
    return {"email": admin_email}


@router.post(
    "/logout",
    summary="Cerrar sesión",
)
async def logout():
    """POST /api/v1/auth/logout — Elimina la cookie admin_token."""
    response = JSONResponse(content={"message": "Sesión cerrada"})
    response.delete_cookie(key="admin_token", path="/")
    return response


@router.post(
    "/register",
    response_model=AdminSession,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo administrador",
)
async def register_admin(
    data: CreateAdminRequest,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/auth/register — Crear admin (setup inicial)."""
    service = AdminService(db)
    try:
        admin = await service.create(data)
        return admin
    except ClassVIPError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
