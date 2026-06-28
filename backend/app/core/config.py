from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración central de la aplicación.

    Todas las variables se leen del archivo .env automáticamente.
    Pydantic valida los tipos al iniciar. Si una variable requerida
    no existe, la app se niega a arrancar (fail-fast).
    """

    # ─── Base de datos ───
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/classvip"
    # Conexión directa (sin pooler) — solo la usa Alembic para correr migraciones.
    # Con Supabase: "Direct connection" del dashboard. Si no se define, Alembic cae a database_url.
    database_url_direct: str = ""

    # ─── Security ───
    secret_key: str = "change-me"
    admin_email: str = "admin@classviptransfers.com"
    admin_password_hash: str = ""

    # ─── Stripe ───
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # ─── Email (Resend) ───
    resend_api_key: str = ""
    email_from: str = "ClassVIP Transfers <bookings@classviptransfers.com>"
    email_bcc: str = ""

    # ─── Frontend ───
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = "http://localhost:5173,http://localhost:4173"

    # ─── AI (OpenAI) — agente de chat público ───
    # Si no se define, el endpoint de chat responde 400 sin romper el resto del sitio.
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_whisper_model: str = "whisper-1"
    openai_temperature: float = 0.3
    openai_max_tokens: int = 400

    # ─── Environment ───
    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @model_validator(mode="after")
    def _validar_produccion(self) -> "Settings":
        """Fail-fast: en producción la app se niega a arrancar si falta un secreto real.

        Sin esto, "ENVIRONMENT=production" con secret_key="change-me" o sin
        DATABASE_URL real arranca igual y sirve tráfico con una configuración
        rota o insegura — el peor escenario, porque el fallo se descubre
        con clientes reales en vez de al desplegar.
        """
        if self.environment != "production":
            return self

        errores: list[str] = []

        if self.secret_key in ("", "change-me") or len(self.secret_key) < 32:
            errores.append(
                "SECRET_KEY debe definirse en producción con al menos 32 caracteres "
                'aleatorios (genera uno con: python -c "import secrets; '
                'print(secrets.token_hex(32))"). Valor actual inseguro o ausente.'
            )

        if "localhost" in self.database_url or "@user:password@" in self.database_url:
            errores.append(
                "DATABASE_URL sigue apuntando al valor de ejemplo/local. "
                "Configura la cadena de conexión real de Supabase (Session pooler)."
            )

        if not self.stripe_secret_key:
            errores.append("STRIPE_SECRET_KEY es requerido en producción.")

        if not self.resend_api_key:
            errores.append("RESEND_API_KEY es requerido en producción.")

        if errores:
            mensaje = "Configuración de producción inválida:\n  - " + "\n  - ".join(errores)
            raise ValueError(mensaje)

        return self


@lru_cache
def get_settings() -> Settings:
    """Singleton: solo se lee .env una vez.

    lru_cache evita abrir y parsear el archivo en cada request.
    La primera llamada lee .env, las siguientes devuelven el mismo objeto.
    """
    return Settings()
