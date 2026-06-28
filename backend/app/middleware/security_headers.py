"""Middleware de cabeceras de seguridad HTTP.

Agrega cabeceras defensivas a TODAS las respuestas. Son baratas y de bajo riesgo
(no rompen una API JSON ni el SPA de React):

- X-Content-Type-Options: nosniff
    Evita que el navegador "adivine" el MIME type (MIME sniffing) y ejecute
    como script algo servido como otro tipo.
- X-Frame-Options: DENY
    Evita clickjacking: nadie puede embeber la app en un <iframe>.
- Referrer-Policy: strict-origin-when-cross-origin
    No filtra la URL completa (con query params) a sitios externos.
- Strict-Transport-Security (SOLO en producción)
    Obliga HTTPS por 1 año. No se pone en desarrollo porque ahí se sirve por
    HTTP plano y HSTS dejaría el navegador "pegado" a https://localhost.

NO se incluye Content-Security-Policy: una CSP correcta para el admin React
(scripts/estilos inline de Vite, Stripe.js, etc.) necesita armarse y probarse
aparte para no romper la UI. Queda como trabajo futuro deliberado.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Añade cabeceras de seguridad a cada respuesta."""

    def __init__(self, app, *, hsts: bool = False) -> None:
        super().__init__(app)
        self._hsts = hsts

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if self._hsts:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response
