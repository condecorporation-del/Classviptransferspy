"""Middleware de autenticación para el panel de administración.

Verifica cookies JWT en cada request y bloquea rutas /api/v1/admin/*
si no hay token válido. Las rutas públicas (bookings, pricing, docs)
pasan sin autenticación.
"""

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_access_token

# Rutas que NO requieren autenticación
PUBLIC_PATHS = [
    "/health",
    "/api/health",
    "/api/v1/auth/login",
    "/api/v1/bookings",
    # /api/v1/customers ya NO es público: sus endpoints exigen admin vía
    # Depends(get_current_admin). El funnel público no los usa (el booking
    # crea/encuentra al cliente internamente).
    "/api/v1/pricing",
    "/api/v1/stripe/webhook",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/",
]


class AdminAuthMiddleware(BaseHTTPMiddleware):
    """Middleware que verifica JWT en cada request.

    Flujo:
    1. Extrae token de cookie 'admin_token' o header 'Authorization: Bearer <token>'
    2. Si el token es válido → request.state.admin_email = email
    3. Si la ruta empieza con /api/v1/admin y no hay token → 401

    HttpOnly cookies: el navegador las envía automáticamente pero
    JavaScript no puede leerlas. Más seguro contra XSS que localStorage.
    """

    async def dispatch(self, request: Request, call_next):
        # Los preflights CORS (OPTIONS) nunca llevan cookie — dejarlos pasar
        # para que CORSMiddleware los responda con los headers correctos.
        if request.method == "OPTIONS":
            return await call_next(request)

        # Inicializar sin autenticación
        request.state.admin_email = None

        # Extraer token de cookie o header
        token = request.cookies.get("admin_token")
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        # Verificar token
        if token:
            email = decode_access_token(token)
            if email:
                request.state.admin_email = email
                request.state.admin_token = token

        # Bloquear rutas admin sin autenticación
        path = request.url.path
        is_public = any(path.startswith(p) for p in PUBLIC_PATHS)

        if path.startswith("/api/v1/admin") and not request.state.admin_email:
            if not is_public:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Autenticación requerida para acceder al panel de administración",
                )

        response = await call_next(request)
        return response
