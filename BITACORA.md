# Bitácora — ClassVIP Transfers (Python Edition)

> **Instructivo paso a paso para construir un backend profesional con FastAPI.**
> Cada sección documenta exactamente qué se hizo, qué código se escribió,
> y **para qué sirve cada línea**. Diseñado para aprender, no solo copiar.

---

## FASE 1 — FUNDACIÓN DEL PROYECTO

**Objetivo:** Crear la estructura base, entorno virtual, FastAPI corriendo con health check,
configuración tipada con pydantic-settings, y conexión a PostgreSQL.

---

### 1.1 — Crear estructura de carpetas

```bash
mkdir -p ~/classvip-transfers-python/backend/app/{api/v1,core,models,schemas,repositories,services,middleware,templates/{emails,pdfs},utils,tests}
cd ~/classvip-transfers-python/backend
python3.12 -m venv .venv
source .venv/bin/activate
```

**Explicación de cada carpeta:**

| Carpeta | Responsabilidad | Ejemplo de lo que va ahí |
|---|---|---|
| `api/v1/` | Endpoints HTTP versionados | `GET /api/v1/bookings` |
| `core/` | Configuración transversal | settings, seguridad, logging, constantes |
| `models/` | Tablas de la base de datos | `class Booking(Base): __tablename__ = "bookings"` |
| `schemas/` | Validación de entrada/salida | Pydantic models para requests y responses |
| `repositories/` | Consultas SQL | `SELECT * FROM bookings WHERE status = 'CONFIRMED'` |
| `services/` | Lógica de negocio | Calcular precio, crear reserva, enviar email |
| `middleware/` | Intercepta requests | CORS, rate limiting, auth middleware |
| `templates/` | HTML para emails y PDFs | Plantillas Jinja2 |
| `utils/` | Funciones helper | Generar códigos, formatear fechas |
| `tests/` | Pruebas automatizadas | pytest |

**¿Por qué esta estructura?** Separa responsabilidades. Cada capa tiene un trabajo específico:
- La API recibe el request, llama al servicio, devuelve el response.
- El servicio aplica reglas de negocio.
- El repositorio hace la consulta SQL.
- Nunca se mezclan. Si un endpoint tiene SQL directo, está mal.

**¿Por qué `api/v1/`?** Versionado de API. Cuando necesites romper compatibilidad (v2), creás `api/v2/` y la v1 sigue funcionando para客户端s antiguos.

**¿Por qué entorno virtual (`.venv`)?** Aísla las dependencias de este proyecto del resto del sistema. Si otro proyecto necesita otra versión de FastAPI, no hay conflicto.

---

### 1.2 — `backend/pyproject.toml` — Definición del proyecto

Este archivo reemplaza al viejo `requirements.txt`. Hace **tres cosas a la vez**:

1. **Metadatos** del proyecto (nombre, versión, autor)
2. **Lista de dependencias** separadas en producción vs desarrollo
3. **Configuración de herramientas** de calidad (ruff, mypy, pytest, bandit)

```toml
[project]
name = "classvip-transfers"
version = "0.1.0"
description = "ClassVIP Transfers — Luxury Transportation Booking System"
requires-python = ">=3.12"       # ← Obliga Python 3.12 o superior
authors = [
    { name = "ClassVIP Transfers", email = "admin@classviptransfers.com" }
]
```

**`requires-python = ">=3.12"`** — Si alguien intenta instalar con Python 3.11, falla. Esto evita bugs por features que no existen en versiones viejas.

#### Dependencias de PRODUCCIÓN

Estas se instalan en el servidor real. Cada una tiene un porqué específico:

```toml
dependencies = [
    # ─── Web framework y servidor ───
    "fastapi>=0.115,<0.116",
    "uvicorn[standard]>=0.32,<0.33",
    "orjson>=3.10,<4.0",

    # ─── Configuración y validación ───
    "pydantic>=2.9,<3.0",
    "pydantic-settings>=2.6,<3.0",
    "email-validator>=2.2,<3.0",

    # ─── Base de datos y migraciones ───
    "sqlalchemy[asyncio]>=2.0,<2.1",
    "asyncpg>=0.30,<0.31",
    "alembic>=1.14,<2.0",

    # ─── Seguridad ───
    "pyjwt[crypto]>=2.10,<3.0",
    "pwdlib[argon2]>=0.2,<0.3",
    "itsdangerous>=2.2,<3.0",
    "slowapi>=0.1,<0.2",

    # ─── Integraciones externas ───
    "stripe>=11.0,<12.0",
    "resend>=2.6,<3.0",
    "httpx>=0.27,<0.28",

    # ─── Templates, PDF y archivos ───
    "jinja2>=3.1,<4.0",
    "weasyprint>=62,<63",
    "aiofiles>=24.1,<25.0",

    # ─── Tareas en background ───
    "celery>=5.4,<6.0",
    "redis>=5.2,<6.0",

    # ─── Observabilidad ───
    "structlog>=24.4,<25.0",
    "sentry-sdk[fastapi]>=2.18,<3.0",
]
```

**Explicación de cada dependencia:**

| Dependencia | ¿Qué hace? | ¿Por qué esta y no otra? |
|---|---|---|
| `fastapi` | Framework web async | Más rápido que Django/Flask, genera OpenAPI/docs automático |
| `uvicorn[standard]` | Servidor ASGI que ejecuta FastAPI | El estándar. `[standard]` incluye uvloop y httptools para más velocidad |
| `orjson` | Serialización JSON rápida | 2-3x más rápido que el json estándar de Python |
| `pydantic` | Validación de datos con type hints | Zod de TypeScript pero para Python. Valida tipos al instante |
| `pydantic-settings` | Lee `.env` y valida las variables | Si falta `DATABASE_URL`, la app ni arranca (fail-fast) |
| `email-validator` | Valida que un email sea real | No solo formato: verifica dominio, MX records, etc. |
| `sqlalchemy[asyncio]` | ORM — escribís Python, genera SQL | `[asyncio]` activa soporte async para no bloquear el servidor |
| `asyncpg` | Driver PostgreSQL async | El más rápido para PostgreSQL. Conexión binaria, no texto |
| `alembic` | Migraciones de DB versionadas | Como `prisma migrate`. Cada cambio de schema es un archivo versionado |
| `pyjwt[crypto]` | Tokens JWT para autenticación | `[crypto]` agrega soporte para firmar con RS256/HS256 |
| `pwdlib[argon2]` | Hasheo de contraseñas | Argon2 ganó el concurso de hashing de passwords en 2015. Más seguro que bcrypt |
| `itsdangerous` | Tokens firmados para enlaces temporales | Para links de "confirmar email" o "descargar PDF". Más liviano que JWT |
| `slowapi` | Rate limiting | Evita que un bot haga 1000 requests/segundo al login |
| `stripe` | Pagos con tarjeta | SDK oficial. Maneja PCI compliance |
| `resend` | Email transaccional | API moderna, más simple que SendGrid |
| `httpx` | Cliente HTTP async | Como requests pero async. También sirve para testear la API |
| `jinja2` | Motor de templates HTML | Para generar emails bonitos y PDFs con diseño |
| `weasyprint` | Convierte HTML a PDF | No necesita Chrome headless. Renderiza CSS real |
| `aiofiles` | Lectura/escritura de archivos async | Para no bloquear el event loop al guardar PDFs |
| `celery` | Cola de tareas en background | "Enviá este email en 5 minutos sin trabar la respuesta HTTP" |
| `redis` | Base de datos en memoria | Backend de Celery + cache. Más rápido que RabbitMQ para esto |
| `structlog` | Logs estructurados | Cada log es un diccionario JSON. Buscable, filtrable |
| `sentry-sdk` | Reporte de errores en producción | Si algo crashea, te llega el stack trace completo con contexto |

**¿Por qué versiones con `>=X,<Y`?** Pin fijo. "Quiero FastAPI 0.115.x pero no 0.116 porque podría romper algo." En producción usás el lockfile (`uv.lock`) que tiene versiones exactas.

#### Dependencias de DESARROLLO

Estas **nunca** se instalan en el servidor. Son para programar, testear y auditar:

```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.3,<9.0",            # Framework de testing
    "pytest-asyncio>=0.24,<0.25",  # Soporte async para pytest
    "pytest-cov>=5.0,<6.0",       # Cobertura de código
    "pytest-mock>=3.14,<4.0",     # Mocks para tests
    "factory-boy>=3.3,<4.0",      # Datos falsos realistas para tests
    "faker>=30.0,<31.0",           # Nombres, emails, direcciones falsas
    "freezegun>=1.5,<2.0",        # "Congelar" el tiempo en tests
    "respx>=0.21,<0.22",          # Mockear llamadas HTTP externas
    "ruff>=0.7,<0.8",             # Linter + formateador (como ESLint+Prettier)
    "mypy>=1.13,<2.0",            # Type checker (como tsc --noEmit)
    "pre-commit>=4.0,<5.0",       # Ganchos que corren antes de cada commit
    "bandit>=1.7,<2.0",           # Busca vulnerabilidades de seguridad en tu código
    "pip-audit>=2.7,<3.0",        # Revisa CVEs en tus dependencias
]
```

#### Configuración de herramientas

```toml
[tool.ruff]
line-length = 100          # Máximo 100 caracteres por línea
target-version = "py312"   # Asume features de Python 3.12

[tool.ruff.lint]
select = [
    "E",     # Errores de estilo (pycodestyle)
    "F",     # Bugs detectables estáticamente (pyflakes)
    "I",     # Orden de imports
    "B",     # Bugbear: bugs comunes
    "UP",    # Sugiere usar sintaxis moderna (pyupgrade)
    "ASYNC", # Errores específicos de async
    "S",     # Patrones inseguros (bandit-light)
]
ignore = ["S101"]  # Permitir assert en tests (normalmente detecta assert como inseguro)

[tool.mypy]
python_version = "3.12"
strict = true               # El type checking más estricto posible
plugins = ["pydantic.mypy"] # Plugin para entender modelos de Pydantic

[tool.pytest.ini_options]
asyncio_mode = "auto"       # Detecta automáticamente tests async
addopts = "-q --cov=app --cov-report=term-missing --cov-fail-under=85"
# -q: modo silencioso (menos output)
# --cov=app: medir cobertura en la carpeta app/
# --cov-report=term-missing: mostrar líneas NO cubiertas
# --cov-fail-under=85: fallar si menos del 85% del código está testeado
```

---

### 1.3 — `backend/.env` — Variables de entorno

```env
DATABASE_URL=postgresql+asyncpg://classvip:classvip_dev_2026@localhost:5432/classvip
SECRET_KEY=dev-secret-key-change-in-production-0123456789
ENVIRONMENT=development
LOG_LEVEL=INFO
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

**¿Por qué `.env` y no hardcodear?**
- Seguridad: las contraseñas y API keys nunca van en el código fuente.
- Entornos: development, staging y production usan diferentes valores.
- `.env` NO se sube a git (está en `.gitignore`). Hay un `.env.example` con placeholders.

**Cada variable:**

| Variable | ¿Qué controla? |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. `postgresql+asyncpg://` usa el driver async |
| `SECRET_KEY` | Llave para firmar JWTs y cookies. En producción: 64 caracteres aleatorios |
| `ENVIRONMENT` | `development` activa logs SQL y auto-creación de tablas |
| `LOG_LEVEL` | Cuánto detalle en los logs: DEBUG, INFO, WARNING, ERROR |
| `FRONTEND_URL` | URL del frontend React (para links en emails) |
| `ALLOWED_ORIGINS` | Qué dominios pueden llamar a la API (CORS) |

---

### 1.4 — `backend/app/core/config.py` — Configuración tipada

```python
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración central de la aplicación.

    Todas las variables se leen del archivo .env automáticamente.
    Pydantic valida los tipos al iniciar. Si una variable requerida
    no existe, la app se niega a arrancar (fail-fast).
    """

    # ─── Base de datos ───
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/classvip"

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

    # ─── Environment ───
    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"              # ← Busca este archivo
        env_file_encoding = "utf-8"    # ← Encoding del archivo


@lru_cache
def get_settings() -> Settings:
    """Singleton: solo se lee .env una vez.

    lru_cache evita abrir y parsear el archivo en cada request.
    La primera llamada lee .env, las siguientes devuelven el mismo objeto.
    """
    return Settings()
```

**Explicación línea por línea:**

```python
from functools import lru_cache
```
`lru_cache` es un decorador que guarda el resultado de una función. Si la llamás 1000 veces con los mismos argumentos, solo la ejecuta la primera vez. Las otras 999 devuelven el resultado cacheado. Acá lo usamos para leer `.env` una sola vez.

```python
from pydantic_settings import BaseSettings
```
`BaseSettings` es la clase mágica. Cuando creás `Settings()`, automáticamente:
1. Busca el archivo `.env`
2. Lee cada línea (`DATABASE_URL=...`)
3. La asigna al atributo correspondiente (`self.database_url`)
4. Valida que el tipo sea correcto (si declaraste `int` y el valor es `"hola"`, crashea al iniciar)

```python
class Settings(BaseSettings):
```
Hereda de BaseSettings para obtener el comportamiento de leer `.env`.

```python
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/classvip"
```
- `database_url: str` — type hint: esta variable debe ser string.
- `= "postgresql+asyncpg://..."` — valor por defecto. Si `.env` no tiene `DATABASE_URL`, usa esto.
- Cuando `.env` SÍ tiene `DATABASE_URL=...`, **el valor del .env pisa este default**.
- `postgresql+asyncpg://` — protocolo para SQLAlchemy async. `+asyncpg` le dice que use el driver async.

```python
    secret_key: str = "change-me"
```
Default inseguro a propósito. Obliga a que en producción definas uno real. Si olvidás poner `SECRET_KEY` en `.env`, los JWTs se firman con "change-me" (obvio ataque).

```python
    stripe_secret_key: str = ""
    resend_api_key: str = ""
```
Strings vacíos como default. En desarrollo no necesitás Stripe/Resend reales. Los tests mockean estas integraciones. En producción, `.env` tiene las keys reales.

```python
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```
`Config` es una clase interna especial de pydantic-settings.
- `env_file = ".env"` — nombre del archivo a buscar.
- `env_file_encoding = "utf-8"` — encoding. Necesario para caracteres como `ñ` o emojis.

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```
- `@lru_cache` — sin argumentos, cachea basado en los argumentos de la función. Como `get_settings()` no recibe argumentos, solo se ejecuta UNA vez. Siempre devuelve el mismo objeto `Settings`.
- `return Settings()` — crea la instancia. Esta línea dispara la lectura de `.env`.
- **¿Por qué no crear `settings = Settings()` como variable global?** Porque se ejecutaría al importar el módulo, antes de que el path de trabajo esté listo. `get_settings()` permite lazy initialization.

---

### 1.5 — `backend/app/__init__.py` — Módulo principal

```python
"""ClassVIP Transfers — Backend API."""
```

**¿Por qué existe este archivo?** En Python, una carpeta solo es un "paquete" importable si contiene `__init__.py`. Sin este archivo, `from app import ...` no funciona.
El docstring es documentación mínima del paquete.

---

### 1.6 — `backend/app/database.py` — Conexión a PostgreSQL

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# ─── Engine ───────────────────────────────────────────────────────────────────
# El engine es el "motor" que conecta SQLAlchemy con PostgreSQL.
# create_async_engine usa asyncpg por debajo para operaciones no bloqueantes.
engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",  # Muestra SQL en consola en dev
    pool_size=20,       # Máximo 20 conexiones simultáneas
    max_overflow=10,    # +10 extras si el pool se llena (30 total)
)

# ─── Session Factory ──────────────────────────────────────────────────────────
# async_sessionmaker es una fábrica. Cada vez que llamas AsyncSessionLocal()
# obtienes una sesión nueva lista para hacer queries.
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # No "expira" objetos tras commit (necesario en async)
)

# ─── Base Declarativa ─────────────────────────────────────────────────────────
# Todos los modelos SQLAlchemy heredan de esta clase.
# SQLAlchemy la usa para descubrir tablas, relaciones y mapeos.
class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy."""
```

**Explicación detallada:**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
```
Tres imports, tres conceptos:
- `create_async_engine` — crea la conexión a la base de datos. "async" significa que no bloquea el servidor mientras espera respuesta de PostgreSQL.
- `async_sessionmaker` — fábrica de sesiones. Una sesión = una conversación con la DB.
- `AsyncSession` — el tipo de sesión que crea `async_sessionmaker`.

```python
from sqlalchemy.orm import DeclarativeBase
```
`DeclarativeBase` — clase base para definir modelos con type hints de Python. Es la forma moderna de SQLAlchemy (2.0+).

```python
settings = get_settings()
```
Llama a la función cacheada. La primera vez lee `.env`, las siguientes devuelven el mismo objeto. `settings.database_url` contiene la URL de conexión.

```python
engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_size=20,
    max_overflow=10,
)
```
- `settings.database_url` — `postgresql+asyncpg://classvip:password@localhost:5432/classvip`
- `echo=True` en desarrollo — cada query SQL se imprime en consola. Utilitario para debugging. Ejemplo: `SELECT bookings.id, bookings.status FROM bookings WHERE...`
- `pool_size=20` — el engine mantiene 20 conexiones abiertas listas para usar. Como meseros esperando clientes.
- `max_overflow=10` — si las 20 están ocupadas, abre hasta 10 más. Total máximo: 30. Si llega el request 31, **espera** hasta que alguna se libere.

```python
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
```
- `async_sessionmaker` — devuelve una **fábrica**, no una sesión. Es una función que crea sesiones.
- `engine` — la fábrica necesita saber a qué base de datos conectarse.
- `class_=AsyncSession` — qué tipo de sesión crear (la async).
- `expire_on_commit=False` — CRÍTICO en async. Normalmente SQLAlchemy "expira" (borra de memoria) los objetos después de guardarlos, forzando una re-lectura. En async esto causa errores porque intenta leer fuera de la sesión activa. `False` lo desactiva.

**¿Cómo se usa?**
```python
async with AsyncSessionLocal() as session:
    booking = await session.get(Booking, booking_id)
    booking.status = BookingStatus.CONFIRMED
    await session.commit()
# Al salir del `async with`, la sesión se cierra automáticamente
```

```python
class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy."""
```
- `Base` es una clase vacía. No tiene atributos ni métodos.
- Su poder está en que SQLAlchemy la usa para **descubrir** todas las clases que heredan de ella.
- Cuando llamás `Base.metadata.create_all()`, SQLAlchemy busca todas las subclases de `Base`, lee sus definiciones, y crea las tablas correspondientes.
- Es el equivalente a `PrismaClient` en TypeScript.

---

### 1.7 — `backend/app/main.py` — Entry point de FastAPI

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.database import Base, engine

settings = get_settings()


# ─── Lifespan ─────────────────────────────────────────────────────────────────
# Código que se ejecuta al iniciar el servidor (antes del yield)
# y al apagarlo (después del yield).
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa recursos al arrancar y los libera al apagar."""
    # Al iniciar: crear tablas en desarrollo.
    # Si no hay DB, arranca igual (el health check funciona sin DB).
    if settings.environment == "development":
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception:
            pass  # Sin DB, arrancamos igual para desarrollo
    yield
    # Al apagar: cerrar todas las conexiones a la base de datos
    await engine.dispose()


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ClassVIP Transfers API",
    description="Luxury Transportation Booking System — Backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",      # Swagger UI: documentación interactiva
    redoc_url="/redoc",    # ReDoc: documentación alternativa
)


# ─── CORS ─────────────────────────────────────────────────────────────────────
# Permite que el frontend (en otro puerto/dominio) haga requests a la API.
# Sin CORS, el navegador bloquea las llamadas cross-origin.
origins = [o.strip() for o in settings.allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,   # Permite cookies cross-origin (necesario para auth)
    allow_methods=["*"],      # GET, POST, PUT, DELETE, PATCH, OPTIONS
    allow_headers=["*"],      # Content-Type, Authorization, etc.
)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Endpoint de monitoreo. Responde 200 si el servidor está vivo.

    Los balanceadores de carga y plataformas cloud usan este endpoint
    para saber si la instancia está sana o deben reiniciarla.
    """
    return {"status": "ok", "timestamp": "2026-06-14T00:00:00Z"}


# ─── Root ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Endpoint raíz. Muestra info básica de la API."""
    return {
        "app": "ClassVIP Transfers API",
        "version": "1.0.0",
        "docs": "/docs",
    }
```

**Explicación detallada:**

```python
from contextlib import asynccontextmanager
```
`asynccontextmanager` — permite escribir código que se ejecuta antes y después de que FastAPI esté listo. Como `useEffect` con cleanup en React, pero para el servidor entero.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
```
El decorador convierte esta función en un context manager async. FastAPI la ejecuta así:
1. Ejecuta todo lo que está **antes del `yield`** al iniciar el servidor.
2. El servidor corre y acepta requests.
3. Cuando el servidor se apaga, ejecuta lo que está **después del `yield`**.

```python
    if settings.environment == "development":
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception:
            pass
```
- `settings.environment == "development"` — solo en desarrollo. En producción usamos Alembic (migraciones versionadas), NO `create_all`.
- `engine.begin()` — inicia una transacción. Si algo falla, hace rollback.
- `Base.metadata.create_all` — "creá todas las tablas". SQLAlchemy inspecciona todos los modelos que heredan de `Base` y genera los `CREATE TABLE` correspondientes.
- `conn.run_sync(...)` — `create_all` es síncrono, pero estamos en async. `run_sync` lo ejecuta en un thread aparte sin bloquear.
- `try/except` — si PostgreSQL no está corriendo, el servidor arranca igual. El health check funciona sin DB.

```python
    yield
```
El `yield` es el punto de división. Todo lo anterior ya se ejecutó. Ahora el servidor acepta requests. Cuando recibe la señal de apagado (Ctrl+C, SIGTERM), continúa después del yield.

```python
    await engine.dispose()
```
Cierra todas las conexiones del pool. Sin esto, PostgreSQL se queda con conexiones "zombie" que no se cierran hasta que expire el timeout.

```python
app = FastAPI(
    title="ClassVIP Transfers API",
    description="Luxury Transportation Booking System — Backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)
```
- `title`, `description`, `version` — metadatos que aparecen en la documentación automática.
- `lifespan=lifespan` — conecta nuestra función de inicio/apagado.
- `docs_url="/docs"` — Swagger UI en `http://localhost:8000/docs`. Interfaz interactiva para probar la API.
- `redoc_url="/redoc"` — documentación alternativa en `http://localhost:8000/redoc`. Más bonita para leer.

```python
origins = [o.strip() for o in settings.allowed_origins.split(",")]
```
- `settings.allowed_origins` = `"http://localhost:5173,http://localhost:4173"`
- `.split(",")` → `["http://localhost:5173", "http://localhost:4173"]`
- `o.strip()` → limpia espacios alrededor de cada URL
- Resultado: lista de orígenes permitidos

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**¿Qué es CORS?** Cross-Origin Resource Sharing. Los navegadores bloquean requests entre dominios/puertos diferentes por seguridad. Si tu frontend React corre en `localhost:5173` y tu backend en `localhost:8000`, el navegador dice "no, son orígenes diferentes, bloqueo el request".

- `allow_origins=origins` — solo permitir estos orígenes. `*` sería "cualquiera" (inseguro).
- `allow_credentials=True` — permite enviar cookies en requests cross-origin. Necesario para auth con cookies.
- `allow_methods=["*"]` — permite GET, POST, PUT, DELETE, PATCH, OPTIONS.
- `allow_headers=["*"]` — permite cualquier header (Authorization, Content-Type, etc.).

```python
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": "2026-06-14T00:00:00Z"}
```
- `@app.get("/health")` — decorador que registra este endpoint. Cuando alguien hace `GET /health`, se ejecuta esta función.
- Dos decoradores = dos rutas para el mismo endpoint. Ambos `/health` y `/api/health` funcionan.
- `async def` — función asíncrona. FastAPI la ejecuta en el event loop sin bloquear otros requests.
- Retorna un dict. FastAPI lo convierte automáticamente a JSON: `{"status":"ok","timestamp":"..."}`

**¿Para qué sirve `/health`?** Balanceadores de carga (nginx, AWS ALB), Kubernetes, y platforms cloud (Railway, Render) hacen GET a este endpoint cada X segundos. Si responde 200, la instancia está sana. Si falla, la reinician o la sacan de rotación.

```python
@app.get("/")
async def root():
    return {"app": "ClassVIP Transfers API", "version": "1.0.0", "docs": "/docs"}
```
Endpoint raíz. Útil para verificar rápido que el servidor está corriendo y qué versión es.

---

## FASE 2 — MODELOS DE BASE DE DATOS (SQLAlchemy)

**Objetivo:** Definir todas las tablas como modelos SQLAlchemy, reflejando exactamente el schema
de Prisma del proyecto original TypeScript.

---

### 2.0 — Preparación: PostgreSQL 16

Antes de escribir modelos, necesitamos PostgreSQL corriendo y una base de datos.

#### Instalar PostgreSQL 16 en Ubuntu/WSL

Ubuntu no incluye PostgreSQL 16 en sus repos oficiales. Hay que agregar el repo de PostgreSQL:

```bash
# 1. Agregar el repositorio oficial
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# 2. Importar la clave GPG (verifica que los paquetes son genuinos)
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# 3. Instalar
sudo apt update && sudo apt install -y postgresql-16
```

#### Crear usuario y base de datos

```sql
-- Ejecutar como usuario postgres (sudo -u postgres psql)
CREATE USER classvip WITH PASSWORD 'classvip_dev_2026' CREATEDB;
CREATE DATABASE classvip OWNER classvip;
GRANT ALL PRIVILEGES ON DATABASE classvip TO classvip;
```

**¿Qué hace cada línea?**
- `CREATE USER classvip WITH PASSWORD '...' CREATEDB` — crea un usuario específico para este proyecto. Nunca uses el usuario `postgres` para aplicaciones.
- `CREATE DATABASE classvip OWNER classvip` — crea la base de datos. El usuario `classvip` es dueño (puede crear/modificar/borrar tablas).
- `GRANT ALL PRIVILEGES` — concede todos los permisos sobre la base de datos.

#### Configurar autenticación

```bash
# Cambiar peer por md5 (password) para conexiones locales
sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/16/main/pg_hba.conf
sudo service postgresql restart
```

**¿Por qué?** Por defecto PostgreSQL usa "peer authentication" en Linux: solo permite conexiones si tu usuario del sistema coincide con el usuario de PostgreSQL. Como nosotros nos conectamos con el usuario `classvip` pero estamos logueados como `conde`, necesitamos autenticación por contraseña (md5).

---

### 2.1 — `backend/app/models/enums.py` — Enumeraciones compartidas

```python
import enum


class BookingType(str, enum.Enum):
    TRANSPORTATION = "TRANSPORTATION"
    ACTIVITY = "ACTIVITY"
    COMBO = "COMBO"
    CRAZY_COMBO = "CRAZY_COMBO"
```

**¿Qué es un Enum?** Un tipo de dato que solo acepta valores predefinidos. `BookingType` solo puede ser uno de esos 4 strings. Si intentás guardar `"HOTEL"`, falla.

**¿Por qué `str, enum.Enum`?** Doble herencia:
- `str` — el enum se comporta como string. Podés hacer `booking_type == "ACTIVITY"` sin convertirlo.
- `enum.Enum` — la funcionalidad de enumeración de Python.
Sin heredar de `str`, SQLAlchemy no sabría cómo guardarlo en la columna VARCHAR.

**(Se omite la lista completa de enums por brevedad — ver archivo `enums.py` completo en el proyecto.)**

Todos los enums definidos:

| Enum | Valores | ¿Dónde se usa? |
|---|---|---|
| `BookingType` | TRANSPORTATION, ACTIVITY, COMBO, CRAZY_COMBO | `Booking.type` |
| `BookingStatus` | DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → COMPLETED (o CANCELLED) | `Booking.status` |
| `BookingSource` | WEBSITE, PHONE, WHATSAPP, ADMIN, AI_CHAT | `Booking.source` |
| `BookingItemType` | TRANSPORTATION, ACTIVITY, ADDON, PARK_ENTRANCE, COMBO, CRAZY_COMBO | `BookingItem.type` |
| `PaymentProvider` | STRIPE, CASH, BANK_TRANSFER, MANUAL | `Payment.provider` |
| `PaymentStatus` | PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED | `Payment.status` |
| `ServiceType` | TRANSFER, ACTIVITY, COMBO | `PricingRule.service_type` |
| `TripType` | ONE_WAY, ROUND_TRIP | `PricingRule.trip_type` |
| `VehicleClass` | SUV, SUBURBAN, SPRINTER, VAN, SEDAN, LUXURY | `PricingRule.vehicle_class` |
| `ExtraCode` | 18 códigos de extras | `PricingExtra.code` |
| `PricingMode` | PER_BOOKING, PER_STOP, PER_SEAT, PER_HOUR | `PricingExtra.pricing_mode` |
| `ClientAccountStatus` | OPEN, ON_HOLD, SETTLED, CLOSED | `ClientAccount.status` |
| `AccountChargeStatus` | PENDING, INVOICED, PAID, VOID | `AccountCharge.status` |
| `AccountPaymentMethod` | CASH, BANK_TRANSFER, CARD, MANUAL | `AccountPayment.method` |
| `AuditAction` | CREATE, UPDATE, DELETE, CONFIRM, CANCEL, ASSIGN, PAYMENT, PRICING_OVERRIDE | `AdminAuditLog.action` |
| `EmailType` | 6 tipos de email | `EmailLog.type` |
| `EmailStatus` | PENDING, SENT, FAILED | `EmailLog.status` |
| `BookingAssignmentType` | DRIVER, VEHICLE | `BookingAssignment.type` |

---

### 2.2 — `backend/app/models/booking.py` — El modelo principal

Este es el modelo más grande y complejo. Explica todos los conceptos importantes de SQLAlchemy 2.0.

```python
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import (
    BookingSource,
    BookingStatus,
    BookingType,
)
```

**¿Por qué estos imports?**
- `uuid` — genera IDs únicos (UUID v4). Equivalente a `cuid()` de Prisma.
- `datetime` — para campos de fecha/hora.
- `Optional`, `List` — type hints. `Optional[str]` = puede ser string o None.
- De `sqlalchemy`: tipos de columna (`String`, `Integer`, etc.) y constructores (`ForeignKey`, `Index`).
- `Mapped`, `mapped_column`, `relationship` — la API moderna de SQLAlchemy 2.0 con type hints.
- De `app.database`: `Base`, nuestra clase base declarativa.
- De `app.models.enums`: solo los enums que este modelo usa.

```python
class Booking(Base):
    """Modelo principal de reservas."""

    __tablename__ = "bookings"
```
- `class Booking(Base)` — hereda de Base. Esto registra Booking en el metadata de SQLAlchemy.
- `__tablename__ = "bookings"` — nombre real de la tabla en PostgreSQL. Por convención: plural, snake_case.

```python
    # ─── Primary Key ───
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
```
- `id: Mapped[str]` — type hint para Python y SQLAlchemy. `Mapped[str]` significa "esta columna es de tipo string".
- `mapped_column(...)` — define la columna real en PostgreSQL.
- `String(36)` — VARCHAR(36). Los UUIDs miden exactamente 36 caracteres (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
- `primary_key=True` — clave primaria. Única, no nula, indexada automáticamente.
- `default=lambda: str(uuid.uuid4())` — cada vez que se crea un registro nuevo, genera un UUID v4 automáticamente. La lambda es necesaria porque si pusieras `default=str(uuid.uuid4())`, evaluaría UNA SOLA VEZ al definir la clase, y todos los registros tendrían el mismo ID.

```python
    # ─── Tipo y estado ───
    type: Mapped[BookingType] = mapped_column(
        Enum(BookingType, name="booking_type_enum"),
        nullable=False,
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status_enum"),
        default=BookingStatus.DRAFT,
        nullable=False,
    )
    source: Mapped[BookingSource] = mapped_column(
        Enum(BookingSource, name="booking_source_enum"),
        default=BookingSource.WEBSITE,
        nullable=False,
    )
```
- `type: Mapped[BookingType]` — el type hint usa el Enum de Python. SQLAlchemy sabe que debe guardar el valor string del enum.
- `Enum(BookingType, name="booking_type_enum")` — crea un tipo ENUM en PostgreSQL. El `name` es el nombre del tipo en la DB.
- `nullable=False` — NOT NULL. No puede estar vacío.
- `default=BookingStatus.DRAFT` — cuando se crea un booking nuevo sin especificar status, arranca como DRAFT.
- `default=BookingSource.WEBSITE` — la mayoría de reservas vienen del sitio web.

```python
    # ─── Cliente ───
    customer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="bookings",
    )
```
**Este es uno de los conceptos más importantes: ForeignKey + relationship.**

- `customer_id` — columna real en la tabla `bookings`. Guarda el ID del cliente.
- `ForeignKey("customers.id", ondelete="CASCADE")` — si borrás un customer, se borran todos sus bookings (CASCADE). Sin esto, PostgreSQL rechazaría el delete porque dejaría bookings huérfanos.
- `customer: Mapped["Customer"]` — **esto NO es una columna real.** Es un atajo de Python. Cuando hacés `booking.customer`, SQLAlchemy busca el Customer con `id = booking.customer_id` y te lo devuelve como objeto.
- `relationship("Customer", back_populates="bookings")` — conecta con el modelo Customer. `back_populates="bookings"` le dice que en Customer hay un atributo `bookings` que apunta de vuelta. Esto crea una relación **bidireccional**: de Booking vas a Customer, y de Customer vas a todos sus Bookings.

```python
    # ─── Fechas ───
    booking_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Fecha del servicio",
    )
    booking_time: Mapped[Optional[str]] = mapped_column(
        String(5),
        nullable=True,
        comment="Hora del servicio (HH:MM)",
    )
```
- `DateTime(timezone=True)` — `TIMESTAMPTZ` en PostgreSQL. Guarda la fecha CON zona horaria. Sin `timezone=True`, usa `TIMESTAMP` sin zona horaria (problemático con clientes de diferentes países).
- `comment="Fecha del servicio"` — comentario SQL que aparece en `\d+ bookings` en psql. Documentación viva en la DB.
- `Optional[str]` — puede ser None. Equivalente a `String?` en Prisma.
- `String(5)` — máximo 5 caracteres. Suficiente para "14:30". No usamos `TIME` de PostgreSQL porque asyncpg tiene bugs con ese tipo.

```python
    # ─── Precios (en centavos, para evitar floats) ───
    total_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Total en centavos (USD)",
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD")
```
- `total_amount: int` — precios en CENTAVOS, no dólares. $149.50 se guarda como `14950`. **Esto es crítico**: los floats (`149.50`) causan errores de redondeo. `0.1 + 0.2 != 0.3` en punto flotante. Con centavos (integers), la suma siempre es exacta.
- `currency: str = String(3)` — código ISO 4217. "USD", "MXN", "EUR".

```python
    # ─── Confirmación ───
    confirmation_code: Mapped[Optional[str]] = mapped_column(
        String(20),
        unique=True,
        nullable=True,
    )
```
- `unique=True` — no puede haber dos bookings con el mismo código de confirmación.
- Códigos como `CLASS2026001` para que el cliente los use al hacer check-in.

```python
    # ─── metadata_ ───
    metadata_: Mapped[Optional[dict]] = mapped_column(
        "metadata",
        JSON,
        nullable=True,
    )
```
- `metadata_: Mapped[...]` — el atributo Python se llama `metadata_` (con guión bajo).
- `"metadata"` — pero la columna en PostgreSQL se llama `metadata` (sin guión bajo).
- **¿Por qué?** `metadata` es una propiedad reservada de SQLAlchemy (`Base.metadata`). Si llamás tu columna `metadata`, hay conflicto de nombres. La convención es usar `metadata_` en Python y mapearlo a `"metadata"` en SQL.
- `JSON` — tipo JSONB en PostgreSQL. Podés guardar cualquier estructura: `{"custom_field": "value", "internal_notes": [...]}`.

```python
    # ─── Timestamps ───
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
```
- `default=datetime.utcnow` — al INSERT, pone la fecha/hora actual automáticamente.
- `onupdate=datetime.utcnow` — al UPDATE, actualiza la fecha/hora automáticamente. No tenés que hacer `booking.updated_at = datetime.utcnow()` manualmente.
- `datetime.utcnow` sin paréntesis — pasamos la función, no el resultado. SQLAlchemy la llama cada vez que inserta/actualiza.

```python
    # ─── Relaciones ───
    items: Mapped[List["BookingItem"]] = relationship(
        "BookingItem",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    # ... más relaciones
```
- `Mapped[List["BookingItem"]]` — una lista de objetos BookingItem. No es una columna, es navegación en Python.
- `cascade="all, delete-orphan"` — si borrás un Booking, TODOS sus items, payments, etc. se borran automáticamente. Sin cascada, borrar un booking dejaría items huérfanos (con `booking_id` apuntando a un registro que ya no existe = error de integridad).
- `"BookingItem"` entre comillas — string forward reference. BookingItem se define en otro archivo y podría no estar importado aún. Las comillas le dicen a SQLAlchemy "resolvé este nombre después".

```python
    # ─── Índices ───
    __table_args__ = (
        Index("ix_bookings_customer_id", "customer_id"),
        Index("ix_bookings_status", "status"),
        Index("ix_bookings_booking_date", "booking_date"),
        Index("ix_bookings_created_at", "created_at"),
        Index("ix_bookings_type_status", "type", "status"),
        Index("ix_bookings_confirmation_code", "confirmation_code"),
    )
```
**¿Qué es un índice?** Es como el índice de un libro. Sin índice, PostgreSQL escanea TODA la tabla para encontrar `WHERE status = 'CONFIRMED'`. Con índice, va directo a las filas que coinciden.

**¿Cuándo crear un índice?** En columnas que usás frecuentemente en:
- `WHERE` (filtros)
- `JOIN` (cruces entre tablas)
- `ORDER BY` (ordenamiento)

**¿Cuándo NO crear un índice?** Si la columna tiene pocos valores distintos (ej: `gender` con solo 'M'/'F' — un índice no ayuda mucho).

- `Index("ix_bookings_customer_id", "customer_id")` — acelera "dame todos los bookings de este cliente".
- `Index("ix_bookings_status", "status")` — acelera "dame bookings confirmados".
- `Index("ix_bookings_type_status", "type", "status")` — índice compuesto. Acelera "dame bookings de tipo TRANSPORTATION con status CONFIRMED".
- `__table_args__` es una tupla. SQLAlchemy la procesa al crear la tabla.

---

### 2.3 — Los 18 modelos restantes

Todos siguen exactamente el mismo patrón. Cada archivo contiene:

1. **Herencia de `Base`** → registra el modelo en SQLAlchemy
2. **`__tablename__`** → nombre real en PostgreSQL
3. **`id: Mapped[str]` con UUID** → clave primaria
4. **Columnas con `Mapped` + `mapped_column`** → cada campo de la tabla
5. **`ForeignKey` + `relationship`** → conexiones entre tablas
6. **Índices en `__table_args__`** → optimización de queries
7. **`__repr__`** → representación legible para debugging

#### Lista completa de modelos:

| Archivo | Modelo(s) | Tabla | Propósito |
|---|---|---|---|
| `admin.py` | AdminUser | `admin_users` | Usuarios administradores con login |
| `customer.py` | Customer | `customers` | Clientes que reservan |
| `booking.py` | Booking | `bookings` | Reserva principal |
| `booking_item.py` | BookingItem | `booking_items` | Cada servicio dentro de una reserva |
| `payment.py` | Payment | `payments` | Pagos (Stripe, efectivo, etc.) |
| `pricing_override.py` | PricingOverride | `pricing_overrides` | Cambios manuales de precio |
| `booking_assignment.py` | BookingAssignment | `booking_assignments` | Asignar conductor/vehículo |
| `driver.py` | Driver | `drivers` | Conductores de la flota |
| `vehicle.py` | Vehicle | `vehicles` | Vehículos disponibles |
| `pricing.py` | Hotel, Area, PricingRule, PricingExtra | 4 tablas | Hoteles, zonas, reglas de precio, extras |
| `client_account.py` | ClientAccount, AccountCharge, AccountPayment | 3 tablas | Cuentas por cobrar |
| `audit.py` | AdminAuditLog | `admin_audit_logs` | Registro de acciones de admin |
| `email_log.py` | EmailLog | `email_logs` | Historial de emails enviados |
| `ai_conversation.py` | AIConversation | `ai_conversations` | Chat con asistente AI |

**Total: 19 modelos en 13 archivos, mapeados a 19 tablas en PostgreSQL.**

---

### 2.4 — `backend/app/models/__init__.py` — Registro de modelos

```python
"""Modelos SQLAlchemy — Tablas de la base de datos.

Importar todos los modelos aquí para que SQLAlchemy los registre
en Base.metadata. Sin esto, create_all() no crea las tablas.
"""

from app.models.admin import AdminUser
from app.models.ai_conversation import AIConversation
from app.models.audit import AdminAuditLog
from app.models.booking import Booking
from app.models.booking_assignment import BookingAssignment
from app.models.booking_item import BookingItem
from app.models.client_account import AccountCharge, AccountPayment, ClientAccount
from app.models.customer import Customer
from app.models.driver import Driver
from app.models.email_log import EmailLog
from app.models.payment import Payment
from app.models.pricing import Area, Hotel, PricingExtra, PricingRule
from app.models.pricing_override import PricingOverride
from app.models.vehicle import Vehicle
```

**¿Por qué este archivo importa todos los modelos?** Mecanismo de registro de SQLAlchemy:
1. Cuando Python importa un archivo como `admin.py`, ejecuta `class AdminUser(Base):`.
2. La clase `Base` (nuestra `DeclarativeBase`) detecta la nueva subclase y la agrega a `Base.metadata`.
3. `Base.metadata` es un registro central que contiene TODAS las tablas.
4. Cuando llamás `Base.metadata.create_all()`, itera sobre ese registro y crea las tablas.

**Si no importás un modelo en `__init__.py`, `create_all()` no crea su tabla** — porque SQLAlchemy nunca "vio" esa clase.

---

## RESUMEN — Lo construido hasta ahora

```
classvip-transfers-python/
└── backend/
    ├── .venv/                  ← Python 3.12 + todas las dependencias
    ├── .env                    ← Variables de entorno (DB, secretos)
    ├── pyproject.toml          ← Definición del proyecto + herramientas
    ├── app/
    │   ├── __init__.py
    │   ├── main.py             ← FastAPI (health check, CORS, lifespan)
    │   ├── database.py         ← Conexión async a PostgreSQL
    │   ├── core/
    │   │   └── config.py       ← Settings desde .env con pydantic
    │   ├── models/
    │   │   ├── __init__.py     ← Registro de todos los modelos
    │   │   ├── enums.py        ← 18 enumeraciones
    │   │   ├── admin.py        ← AdminUser
    │   │   ├── customer.py     ← Customer
    │   │   ├── booking.py      ← Booking (modelo principal)
    │   │   ├── booking_item.py ← BookingItem
    │   │   ├── payment.py      ← Payment
    │   │   ├── pricing_override.py
    │   │   ├── booking_assignment.py
    │   │   ├── driver.py       ← Driver
    │   │   ├── vehicle.py      ← Vehicle
    │   │   ├── pricing.py      ← Hotel, Area, PricingRule, PricingExtra
    │   │   ├── client_account.py ← ClientAccount, AccountCharge, AccountPayment
    │   │   ├── audit.py        ← AdminAuditLog
    │   │   ├── email_log.py    ← EmailLog
    │   │   └── ai_conversation.py ← AIConversation
    │   └── schemas/
    │       ├── __init__.py
    │       ├── booking.py      ← 7 schemas (CreateRequest, Response, Items, Lista)
    │       ├── auth.py         ← 5 schemas (Login, Token, CrearAdmin, Session)
    │       ├── admin.py        ← 4 schemas (CRUD admin)
    │       ├── customer.py     ← 4 schemas (CRUD cliente, limpieza tel)
    │       ├── payment.py      ← 6 schemas (pagos + webhooks Stripe)
    │       └── pricing.py      ← 16 schemas (Hotel, Area, PricingRule, Extra)
    └── PostgreSQL 16
        └── classvip (19 tablas creadas)
```

**Verificación:**
```bash
cd backend && source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
curl http://localhost:8000/health
# → {"status":"ok","timestamp":"..."}
```

---

> **Próximo: Fase 3 — Schemas Pydantic (validación de requests/responses)** ✅ COMPLETADA


## FASE 3 — ESQUEMAS PYDANTIC (Validación de datos)

**Objetivo:** Crear schemas Pydantic para validar cada request y response de la API.
Esto es equivalente a Zod en el proyecto TypeScript.

**Fecha:** 17 de junio 2026

---

### 3.0 — ¿Por qué schemas separados de modelos?

| | SQLAlchemy Model | Pydantic Schema |
|---|---|---|
| **Propósito** | Mapear tabla de DB | Validar datos de API |
| **Dónde se usa** | Dentro del servicio (capa de negocio) | En los endpoints (request/response) |
| **Relaciones** | `relationship` a otros modelos | IDs o modelos anidados |
| **Ejemplo** | `Booking.total_amount: int` | `total_amount: int = Field(ge=0)` |

**Regla de oro:** NUNCA exponer modelos SQLAlchemy directamente en la API.
Siempre convertir a schemas Pydantic. Esto evita:
- Exponer campos internos (password_hash)
- Problemas de serialización con objetos lazy-loaded
- Acoplamiento entre DB y API

---

### 3.1 — `schemas/__init__.py` — Inicialización del módulo

Docstring con la regla de oro y propósito del módulo.

---

### 3.2 — `schemas/booking.py` — Schemas de reservas (7 schemas)

**Schemas creados:**

| Schema | Tipo | Para qué |
|--------|------|----------|
| `CustomerInfo` | Request (anidado) | Info del cliente dentro de CreateBookingRequest |
| `BookingItemCreate` | Request | Ítem de transporte/actividad/addon |
| `CreateBookingRequest` | Request | POST /api/v1/bookings — crear reserva |
| `UpdateBookingRequest` | Request | PATCH /api/v1/bookings/{id} — campos opcionales |
| `BookingItemResponse` | Response | Ítem serializado desde SQLAlchemy |
| `BookingResponse` | Response | Reserva completa con `from_attributes = True` |
| `BookingListResponse` | Response | Lista paginada con total, page, page_size |

**Conceptos Pydantic usados:**
- `Field(...)` con `...` (Ellipsis) = REQUERIDO
- `Field(ge=0)` = validación "greater than or equal"
- `Field(pattern=r"^\d{2}:\d{2}$")` = validación con regex
- `from_attributes = True` (antes `orm_mode`) = crear desde objeto SQLAlchemy
- `field_validator` = validación custom (email lowercase, ISO date check)

---

### 3.3 — `schemas/auth.py` — Schemas de autenticación (5 schemas)

| Schema | Tipo | Para qué |
|--------|------|----------|
| `LoginRequest` | Request | POST /api/v1/auth/login |
| `CreateAdminRequest` | Request | Registro de admin (setup inicial) |
| `ChangePasswordRequest` | Request | Cambio de contraseña (verifica actual) |
| `TokenResponse` | Response | JWT + expires_in |
| `AdminSession` | Response | Datos del admin desde el JWT (sin password_hash) |

**Seguridad:**
- `password_strength` validator: rechaza sin mayúscula o sin número
- Email siempre se normaliza a minúsculas
- NUNCA se expone password_hash en responses

---

### 3.4 — `schemas/admin.py` — Schemas de administradores (4 schemas)

| Schema | Tipo | Para qué |
|--------|------|----------|
| `CreateAdminRequest` | Request | Crear admin (mismas reglas que auth) |
| `UpdateAdminRequest` | Request | PATCH — solo email y role |
| `AdminResponse` | Response | Admin sin password_hash |
| `AdminListResponse` | Response | Lista paginada |

---

### 3.5 — `schemas/customer.py` — Schemas de clientes (4 schemas)

| Schema | Tipo | Para qué |
|--------|------|----------|
| `CreateCustomerRequest` | Request | POST — con limpieza de teléfono automática |
| `UpdateCustomerRequest` | Request | PATCH — todos los campos opcionales |
| `CustomerResponse` | Response | Cliente completo |
| `CustomerListResponse` | Response | Lista paginada |

**Detalles:**
- `phone_clean` validator: quita espacios, paréntesis y guiones automáticamente
- `email_lowercase` validator: normaliza a minúsculas
- `language` solo acepta `en` o `es`

---

### 3.6 — `schemas/payment.py` — Schemas de pagos (6 schemas)

| Schema | Tipo | Para qué |
|--------|------|----------|
| `CreatePaymentRequest` | Request | POST — pagos manuales (CASH, BANK_TRANSFER) |
| `UpdatePaymentRequest` | Request | PATCH — cambiar estado del pago |
| `StripeCheckoutSession` | Webhook | Payload de checkout.session.completed |
| `StripeWebhookEvent` | Webhook | Evento genérico de Stripe |
| `PaymentResponse` | Response | Pago serializado |
| `PaymentListResponse` | Response | Lista paginada |

**Stripe:** Los montos siempre en centavos. El metadata del checkout debe contener `booking_id`.

---

### 3.7 — `schemas/pricing.py` — Schemas de precios (16 schemas)

| Grupo | Schemas |
|-------|---------|
| **Hotel** | CreateHotelRequest, UpdateHotelRequest, HotelResponse, HotelListResponse |
| **Area** | CreateAreaRequest, UpdateAreaRequest, AreaResponse, AreaListResponse |
| **PricingRule** | CreatePricingRuleRequest, UpdatePricingRuleRequest, PricingRuleResponse, PricingRuleListResponse |
| **PricingExtra** | CreatePricingExtraRequest, UpdatePricingExtraRequest, PricingExtraResponse, PricingExtraListResponse |

Todas las tarifas en centavos de USD. Usa enums de Python: ServiceType, TripType, VehicleClass, ExtraCode, PricingMode.

---

**Verificación de la fase:**
```bash
cd backend && source .venv/bin/activate
python -c "from app.schemas.booking import CreateBookingRequest; \
  print(CreateBookingRequest(type='TRANSPORTATION', \
    customer={'name':'Test','email':'t@t.com','phone':'6240000000'}, \
    booking_date='2026-12-25'))"
# → Crea el objeto sin errores = validación Pydantic funciona
```

---

> **Próximo: Fase 4 — Servicios Core (lógica de negocio)** ✅ COMPLETADA


## FASE 4 — SERVICIOS CORE (Business Logic)

**Objetivo:** Implementar toda la lógica de negocio en servicios separados de los endpoints.

**Fecha:** 17 de junio 2026

**Arquitectura:**
```
Request → Endpoint (api/v1/bookings.py)
               ↓
         Schema Pydantic (validación)
               ↓
         Service (services/booking.py)  ← LÓGICA DE NEGOCIO AQUÍ
               ↓
         Modelo SQLAlchemy (database.py)
               ↓
         PostgreSQL
```

---

### 4.0 — `core/exceptions.py` — Excepciones de dominio

Jerarquía de excepciones tipadas para errores de negocio:

| Excepción | Código | Cuándo se lanza |
|-----------|--------|----------------|
| `ClassVIPError` | `INTERNAL_ERROR` | Base de todas |
| `NotFoundError` | `NOT_FOUND` | Recurso no existe |
| `BookingNotFoundError` | `NOT_FOUND` | Booking ID inválido |
| `CustomerNotFoundError` | `NOT_FOUND` | Customer ID inválido |
| `AdminNotFoundError` | `NOT_FOUND` | Admin ID inválido |
| `InvalidBookingStateError` | `INVALID_STATE` | Estado no válido para operación |
| `PricingNotFoundError` | `PRICING_NOT_FOUND` | Sin regla de precio |
| `AuthenticationError` | `AUTH_FAILED` | Credenciales inválidas |
| `DuplicateEntityError` | `DUPLICATE` | Email/valor único ya existe |
| `ValidationError` | `VALIDATION_ERROR` | Regla de negocio violada |

---

### 4.1 — `core/security.py` — Hash de contraseñas y JWT

- `hash_password()` — Argon2id vía pwdlib
- `verify_password()` — Comparación en tiempo constante
- `create_access_token()` — JWT HS256, expira 8 horas
- `decode_access_token()` — Devuelve subject o None

---

### 4.2 — `services/customer.py` — CustomerService

| Método | Qué hace |
|--------|---------|
| `find_or_create(name, email, phone)` | Busca por email. Si existe, actualiza. Si no, crea. |
| `get_by_id(customer_id)` | Obtiene cliente o lanza CustomerNotFoundError |
| `get_by_email(email)` | Busca por email, devuelve None si no existe |
| `create(data)` | Crea cliente (lanza DuplicateEntityError si email duplicado) |
| `update(customer_id, data)` | Actualiza solo campos enviados (exclude_unset) |

---

### 4.3 — `services/booking.py` — BookingService

| Método | Qué hace |
|--------|---------|
| `create_draft(data, source)` | Flujo completo: cliente → validar → crear booking → items → código → total |
| `get_by_id(booking_id)` | Obtiene reserva o lanza BookingNotFoundError |
| `cancel(booking_id)` | Cancela (solo si no está CANCELLED/COMPLETED) |
| `confirm(booking_id)` | Confirma (PAID → CONFIRMED) |
| `_generate_confirmation_code()` | CLASS2026001, CLASS2026002... con fallback timestamp |

---

### 4.4 — `services/pricing.py` — PricingService

| Método | Qué hace |
|--------|---------|
| `calculate_price(zone_from, zone_to, vehicle, trip, pax)` | Busca PricingRule → fallback Area → lanza error |
| `get_extras(codes)` | Lista extras activos (filtra por código opcional) |
| `calculate_extras_total(codes, qty, stops, hours)` | Aplica PER_BOOKING/PER_STOP/PER_SEAT/PER_HOUR |

---

### 4.5 — `services/payment.py` — PaymentService

| Método | Qué hace |
|--------|---------|
| `create_manual(booking_id, data)` | Registra pago CASH/BANK_TRANSFER/MANUAL |
| `mark_completed(payment_id, tx_id)` | PENDING → COMPLETED, booking PENDING_PAYMENT → PAID |
| `mark_failed(payment_id, error)` | PENDING → FAILED |
| `get_payments_for_booking(booking_id)` | Todos los pagos de una reserva |

---

### 4.6 — `services/admin.py` — AdminService

| Método | Qué hace |
|--------|---------|
| `authenticate(email, password)` | Verifica credenciales, lanza AuthenticationError |
| `get_by_id(admin_id)` | Obtiene admin o lanza AdminNotFoundError |
| `create(data)` | Crea admin con hash Argon2id |
| `update(admin_id, data)` | Actualiza email/role (verifica duplicados) |
| `list_all()` | Lista todos los admins |

---

### 4.7 — `services/audit.py` — AuditService

| Método | Qué hace |
|--------|---------|
| `log(action, entity_type, entity_id, description, ...)` | Registra acción administrativa para trazabilidad |

---

**Verificación:**
```bash
cd backend && source .venv/bin/activate
python -c "
from app.core.exceptions import *
from app.core.security import hash_password, verify_password
from app.services.booking import BookingService
from app.services.customer import CustomerService
from app.services.pricing import PricingService
from app.services.payment import PaymentService
from app.services.admin import AdminService
from app.services.audit import AuditService
print('Fase 4 OK — 8 servicios importados')
"
```

---

> **Próximo: Fase 5 — Endpoints API (FastAPI Routers)** ✅ COMPLETADA


## FASE 5 — ENDPOINTS API (FastAPI Routers)

**Objetivo:** Exponer los servicios como endpoints REST versionados bajo `/api/v1/`.

**Fecha:** 17 de junio 2026

---

### 5.1 — `dependencies.py` — Inyección de sesión DB

FastAPI usa `Depends(get_db)` para inyectar una `AsyncSession` por request.
La dependencia maneja commit/rollback/close automáticamente.

---

### 5.2 — `api/router.py` — Router principal

Agrega todos los routers v1 con sus prefijos:
- `/bookings` → bookings.router
- `/customers` → customers.router
- `/auth` → auth.router
- `/admin` → admin.router
- `/pricing` → pricing.router

Se monta en `main.py` como `app.include_router(api_router, prefix="/api/v1")`.

---

### 5.3 — `api/v1/bookings.py` — Endpoints de reservas

| Método | Ruta | Qué hace |
|--------|------|---------|
| POST | `/api/v1/bookings/` | Crear reserva (DRAFT) con items |
| GET | `/api/v1/bookings/{id}` | Obtener reserva por ID |

---

### 5.4 — `api/v1/customers.py` — Endpoints de clientes

| Método | Ruta | Qué hace |
|--------|------|---------|
| POST | `/api/v1/customers/` | Crear cliente manual |
| GET | `/api/v1/customers/{id}` | Obtener cliente |
| PATCH | `/api/v1/customers/{id}` | Actualizar cliente |

---

### 5.5 — `api/v1/auth.py` — Endpoints de autenticación

| Método | Ruta | Qué hace |
|--------|------|---------|
| POST | `/api/v1/auth/login` | Login → JWT |
| POST | `/api/v1/auth/register` | Crear admin (setup inicial) |

---

### 5.6 — `api/v1/admin.py` — Endpoints de administradores

| Método | Ruta | Qué hace |
|--------|------|---------|
| GET | `/api/v1/admin/users` | Listar admins |
| GET | `/api/v1/admin/users/{id}` | Obtener admin |
| PATCH | `/api/v1/admin/users/{id}` | Actualizar admin |

---

### 5.7 — `api/v1/pricing.py` — Endpoints de precios

12 endpoints: CRUD completo para hoteles, áreas, reglas y extras.

| Recurso | POST | GET | PATCH |
|---------|------|-----|-------|
| Hotels | ✅ | ✅ | ✅ |
| Areas | ✅ | ✅ | ✅ |
| Rules | ✅ | ✅ | ✅ |
| Extras | ✅ | ✅ | ✅ |

---

> **Próximo: Fase 6 — Autenticación completa (JWT middleware + cookies seguras)** ✅ COMPLETADA


## FASE 6 — AUTENTICACIÓN (JWT + Cookies)

**Objetivo:** Proteger el panel de administración con JWT, cookies httpOnly, y middleware.

**Fecha:** 17 de junio 2026

---

### 6.1 — `middleware/auth.py` — AdminAuthMiddleware

Middleware que intercepta cada request:

1. Extrae JWT de cookie `admin_token` o header `Authorization: Bearer`
2. Si es válido → `request.state.admin_email = email`
3. Si la ruta empieza con `/api/v1/admin` y no hay token → 401

**Rutas públicas (sin auth):**
- `/health`, `/api/health`
- `/api/v1/auth/login`
- `/api/v1/bookings`, `/api/v1/customers`, `/api/v1/pricing`
- `/docs`, `/redoc`, `/openapi.json`

---

### 6.2 — `middleware/dependencies.py` — get_current_admin()

Dependencia FastAPI que lee `request.state.admin_email`.
Si es None, lanza 401. Se usa en endpoints protegidos:

```python
@router.get("/users")
async def list_admins(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),  # ← protege el endpoint
):
```

---

### 6.3 — `api/v1/auth.py` — Login con cookie httpOnly

**POST /api/v1/auth/login** — Autentica admin y:
- Devuelve JSON con `access_token` + `expires_in`
- Setea cookie `admin_token` (httpOnly, secure, samesite=lax, 8h)

**POST /api/v1/auth/logout** — Elimina la cookie

**POST /api/v1/auth/register** — Crea admin (setup inicial)

---

### 6.4 — `api/v1/admin.py` — Endpoints protegidos

Todos los endpoints admin ahora requieren `get_current_admin`:
- GET /users — lista admins
- GET /users/{id} — obtiene admin
- PATCH /users/{id} — actualiza admin

---

### 6.5 — `main.py` — Registro del middleware

```python
app.add_middleware(AdminAuthMiddleware)
```

Se agrega DESPUÉS de CORS (el orden importa: los middlewares se ejecutan en orden inverso al registro).

---

**Verificación de seguridad:**
- Cookie httpOnly → JavaScript no puede leer el JWT (protección XSS)
- Cookie SameSite=Lax → protege contra CSRF básico
- JWT expira en 8 horas → sesión limitada
- Rutas admin bloqueadas sin token → 401

---

> **Próximo: Fase 7 — Pagos con Stripe** ✅ COMPLETADA


## FASE 7 — PAGOS CON STRIPE

**Objetivo:** Integrar Stripe para procesar pagos con tarjeta.

**Fecha:** 17 de junio 2026

---

### 7.1 — `services/stripe.py` — StripeService

| Método | Qué hace |
|--------|---------|
| `create_payment_intent(amount, currency, booking_id, email, desc)` | Crea PaymentIntent con metadata (booking_id). Devuelve client_secret para el frontend. |
| `verify_webhook_signature(payload_bytes, signature)` | Verifica firma HMAC-SHA256 de Stripe. Lanza ValueError si es falsa. |

**Conceptos clave:**
- PaymentIntent: intención de cobrar, no se ejecuta hasta que el frontend confirma
- client_secret: clave efímera que Stripe.js usa para confirmCardPayment()
- Webhook signature: prueba criptográfica de que el POST viene de Stripe

---

### 7.2 — `api/v1/stripe.py` — Endpoints Stripe

| Método | Ruta | Qué hace |
|--------|------|---------|
| POST | `/api/v1/stripe/create-payment-intent` | Crea PaymentIntent + registra pago pendiente en DB |
| POST | `/api/v1/stripe/webhook` | Recibe eventos de Stripe (pago exitoso/fallido) |

**Flujo de pago:**
1. Frontend → POST /stripe/create-payment-intent (con booking_id)
2. Backend → Stripe API: crea PaymentIntent
3. Backend → DB: registra Payment en estado PENDING
4. Backend → Frontend: devuelve client_secret
5. Frontend → Stripe.js: confirma pago con tarjeta
6. Stripe → POST /stripe/webhook: payment_intent.succeeded
7. Backend → DB: pago COMPLETED, booking PAID

---

### 7.3 — Registro del router + ruta pública

- `api/router.py`: stripe.router → `/stripe`
- `middleware/auth.py`: `/api/v1/stripe/webhook` agregado a PUBLIC_PATHS

---

> **Próximo: Fase 8 — Email y PDF (Resend + WeasyPrint)**
