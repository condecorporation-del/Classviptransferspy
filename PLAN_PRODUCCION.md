# Plan de Producción — ClassVIP Transfers (Python)

> **Para quién es este documento:** para el agente (Sonnet) que va a ejecutar las tareas paso a paso.
> Lee la sección 0 y 1 completas antes de tocar código. Cada tarea tiene: archivo, qué cambiar, por qué, y cómo verificar.
> **No avances a la siguiente tarea sin verificar la actual.**
>
> **Fecha:** 22 de junio 2026
> **Objetivo del dueño (Marlon):** dejar el backend Python **listo para producción**, escalable y sin
> los bugs del proyecto TypeScript. La meta concreta: que solo haya que **pegar la base de datos
> Supabase y las API keys** en el `.env` y funcione. Nada más.

---

## 0. CONTEXTO (arranque en frío — léelo aunque creas que ya sabes)

- Hay dos proyectos, **ambos son copias** (los originales viven en Linux y no se ven desde aquí).
- El proyecto **TypeScript** (`classvip-live-correct2`) es el que está en producción y **falla mucho con la base de datos**.
  - **Síntoma clave reportado por el dueño:** *"hago una reservación y no la puedo ver en el admin."*
  - O sea: la reserva parece crearse, pero el panel admin no la muestra. Esto es un bug de
    **persistencia o de lectura**, no de la UI.
- El proyecto **Python** (`classvip-transfers-python`, este) es el que **se usará en producción**.
  - Stack: FastAPI + SQLAlchemy 2.0 async (asyncpg) + Pydantic v2 + React. La DB será **Supabase (PostgreSQL)**.
  - Hoy **ninguno de los dos está conectado a una base de datos** en estas copias.
- Este plan deja el Python blindado contra ese bug y listo para enchufar Supabase.

---

## 1. CAUSA RAÍZ: por qué "creo la reserva y no aparece en el admin"

Hay **cuatro causas posibles**, todas comunes con Supabase. El plan ataca las cuatro para
que el Python sea inmune por diseño:

### Causa A — RLS (Row Level Security) de Supabase bloquea la lectura del admin
El TS usaba RLS parchado a mano (`prisma/migrations/enable_rls.sql`, `rls_policies_secure.sql`).
Patrón típico de fallo: el **insert público** (cliente con `anon key`) funciona, pero la
**lectura del admin** queda filtrada por una policy que no coincide → el admin ve **cero filas**.
La reserva SÍ está en la tabla, pero RLS la esconde.

> **Cómo lo evita el Python:** el backend se conecta **directo a PostgreSQL** vía SQLAlchemy
> usando las **credenciales de la base de datos** (rol dueño), **no** vía la API PostgREST de
> Supabase ni la `anon key`. Las conexiones directas a Postgres con el rol correcto **omiten RLS**.
> La autorización se hace en el backend (middleware + servicios), no en la base. **Regla: nunca
> uses la `anon key` ni PostgREST desde el backend.**

### Causa B — El write no hace commit real (pooler en modo transacción)
Con el **Transaction Pooler** de Supabase (PgBouncer/Supavisor, puerto 6543), cada statement
puede ir en una conexión distinta. Si el código no maneja bien la transacción, el `INSERT`
"parece" ir pero se pierde / no se confirma. El cliente ve "ok", la tabla no recibió la fila.

> **Cómo lo evita el Python:** la dependencia `get_db()` ya hace `commit`/`rollback`/`close`
> por request (ver `app/dependencies.py`). Hay que **garantizar** que toda escritura pase por ahí
> y que el engine esté configurado para el pooler (ver Tarea 2).

### Causa C — El admin filtra por `status` y la reserva queda en DRAFT
En el Python, `BookingService.create_draft()` crea la reserva en estado **`DRAFT`**
(`app/services/booking.py`). Si el futuro endpoint de listado del admin filtra solo
`CONFIRMED`/`PAID`, **las reservas nuevas (DRAFT/PENDING) no aparecerían** → exactamente el
mismo síntoma del TS, pero por otra razón.

> **Cómo lo evita el Python:** el endpoint de listado del admin (que **hay que crear**, hoy no
> existe) debe mostrar **todos los estados por defecto**, con filtro opcional. Ver Tarea 6.

### Causa D — Se agotan las conexiones de Supabase
`app/database.py` hoy usa `pool_size=20, max_overflow=10` = hasta **30 conexiones por worker**.
Con varios workers/instancias, se revienta el límite de conexiones de Supabase y la DB
empieza a rechazar queries de forma intermitente ("a veces no conecta"). Ver Tarea 2.

---

## 2. CÓMO CONECTAR SUPABASE CORRECTAMENTE (el corazón del plan)

Supabase ofrece 3 formas de conectarse. Para un servidor FastAPI persistente:

| Tipo | Host / Puerto | IPv4 | Prepared statements | Cuándo usar |
|---|---|---|---|---|
| **Direct** | `db.<ref>.supabase.co:5432` | ❌ solo IPv6 | ✅ sí | Server con IPv6; migraciones |
| **Session Pooler** | `aws-0-<region>.pooler.supabase.com:5432` | ✅ | ✅ sí | **Recomendado para este server** |
| **Transaction Pooler** | `aws-0-<region>.pooler.supabase.com:6543` | ✅ | ❌ no | Serverless / muchas instancias |

**Recomendación para este proyecto:** usar el **Session Pooler (puerto 5432 del host pooler)**
para el server, y la **conexión Direct** solo para correr migraciones de Alembic.

### Reglas de configuración del engine (obligatorias con Supabase)
1. **SSL siempre.** Supabase exige TLS.
2. **Pool chico** en SQLAlchemy (no 20+30). Con pooler de Supabase, `pool_size=5, max_overflow=5`
   por worker es más que suficiente.
3. **Si usas el Transaction Pooler (6543):** hay que **desactivar prepared statements** de asyncpg
   (`statement_cache_size=0`) y usar `NullPool` (que Supabase haga el pooling). Si usas Session
   Pooler o Direct, no hace falta desactivarlos.
4. La contraseña en la URL debe ir **URL-encoded** si tiene caracteres especiales (`@`, `#`, etc.).

> ⚠️ **Nota para el agente:** los nombres exactos de los parámetros de `connect_args`
> (`statement_cache_size`, `ssl`) dependen de las versiones instaladas de `asyncpg`/`sqlalchemy`.
> Verifícalos contra la versión real del proyecto y prueba la conexión con el script de la Tarea 3
> ANTES de dar la tarea por terminada.

---

## 3. CHECKLIST MAESTRO (lo que debe quedar listo para "solo poner APIs")

Cuando todo esto esté ✅, el dueño solo edita el `.env` con sus credenciales y arranca.

- [ ] **T1** — `.env.example` completo y validado contra `config.py` (que no falte ninguna variable)
- [ ] **T2** — Engine de DB configurado para Supabase (SSL, pool chico, pooler-aware)
- [ ] **T3** — Script de prueba de conexión a la DB (`scripts/test_db.py`)
- [ ] **T4** — Alembic inicializado + migración inicial (las tablas se crean por migración, no por `create_all`)
- [ ] **T5** — Validación fail-fast del `.env` en producción (secret_key, DB, etc.)
- [ ] **T6** — Endpoint admin de **listado de reservas** (muestra TODOS los estados) + tests
- [ ] **T7** — Arreglar bug `metadata_` en `booking.py`
- [ ] **T8** — Emails fuera del event loop (no bloquear) + tolerantes a fallo
- [ ] **T9** — Health check real (`/health/ready` con `SELECT 1`)
- [ ] **T10** — Rate limiting en login/register y booking público
- [ ] **T11** — Código de confirmación sin condición de carrera
- [ ] **T12** — Logging (`structlog`) + Sentry activados (opcionales por env)
- [ ] **T13** — `docker-compose` corre Alembic al arrancar + servicio frontend (opcional)
- [ ] **T14** — CI (GitHub Actions): ruff + mypy + pytest + bandit
- [ ] **T15** — Paridad con el admin del TS (drivers, vehicles, client accounts, audit, AI) — fase posterior

---

## 4. TAREAS DETALLADAS (en orden — ejecutar una por una)

### T1 — Completar y alinear `.env.example`
**Archivos:** `backend/.env.example`, `backend/app/core/config.py`
**Qué hacer:** asegurar que cada campo de `Settings` tenga su línea en `.env.example`, con
comentarios de dónde sacar cada valor de Supabase/Stripe/Resend.
**Plantilla objetivo de `.env`:**
```env
# ─── Base de datos (Supabase) ───
# Dashboard → Project Settings → Database → Connection string → "Session pooler"
# Convierte el prefijo a postgresql+asyncpg:// y URL-encodea la contraseña.
DATABASE_URL=postgresql+asyncpg://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
# URL "Direct connection" SOLO para migraciones de Alembic:
DATABASE_URL_DIRECT=postgresql+asyncpg://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres

# ─── Seguridad ───
SECRET_KEY=<genera-64-chars-aleatorios>   # python -c "import secrets; print(secrets.token_hex(32))"

# ─── Stripe ───
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Resend (email) ───
RESEND_API_KEY=re_...
EMAIL_FROM=ClassVIP Transfers <bookings@classviptransfers.com>
EMAIL_BCC=operations@classviptransfers.com

# ─── Frontend / CORS ───
FRONTEND_URL=https://classviptransfers.com
ALLOWED_ORIGINS=https://classviptransfers.com,http://localhost:5173

# ─── Entorno ───
ENVIRONMENT=production
LOG_LEVEL=INFO
SENTRY_DSN=    # opcional; vacío = desactivado
```
**Verificación:** `python -c "from app.core.config import get_settings; print(get_settings())"` no falla.

---

### T2 — Configurar el engine para Supabase
**Archivo:** `backend/app/database.py`
**Qué cambiar:** reemplazar `pool_size=20, max_overflow=10` por un pool chico + SSL + soporte pooler.
**Dirección objetivo (ajustar nombres de params a las versiones reales — ver nota §2):**
```python
from sqlalchemy.pool import NullPool

# Usar NullPool SOLO si DATABASE_URL apunta al Transaction Pooler (puerto 6543).
# Con Session Pooler (5432) o Direct, usar pool chico normal.
engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,           # detecta conexiones muertas y las recicla (clave en Supabase)
    pool_recycle=300,            # recicla conexiones cada 5 min (evita cierres del pooler)
    connect_args={"ssl": "require"},   # Supabase exige TLS
)
```
**Por qué:** `pool_pre_ping` + `pool_recycle` resuelven la mayoría de los "a veces no conecta"
(conexiones que el pooler cerró por inactividad). El pool chico evita agotar el límite de Supabase.
**Verificación:** continúa en T3.

---

### T3 — Script de prueba de conexión
**Archivo nuevo:** `backend/scripts/test_db.py`
**Qué hacer:** un script que abra una sesión, haga `SELECT 1`, liste las tablas, y cuente bookings.
```python
# Ejecuta: python scripts/test_db.py
import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as s:
        print("SELECT 1 →", (await s.execute(text("SELECT 1"))).scalar())
        tables = (await s.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        ))).scalars().all()
        print("Tablas:", tables)

asyncio.run(main())
```
**Verificación:** con el `.env` apuntando a Supabase, el script imprime `1` y las tablas. Si esto
funciona, la causa raíz B y D quedan descartadas.

---

### T4 — Inicializar Alembic (migraciones reales)
**Por qué:** hoy las tablas solo se crean con `create_all()` en `development` (`app/main.py`).
En producción **no se crea nada** → DB vacía → todo falla. Las tablas deben venir de migraciones.
**Pasos:**
```bash
cd backend && source .venv/bin/activate
alembic init -t async alembic        # plantilla async
# En alembic/env.py: importar Base y todos los modelos, usar DATABASE_URL_DIRECT,
# y target_metadata = Base.metadata
alembic revision --autogenerate -m "schema inicial"
alembic upgrade head
```
**Importante:** Alembic debe usar **`DATABASE_URL_DIRECT`** (conexión Direct), no el pooler, para
generar/aplicar migraciones sin problemas de prepared statements.
**Quitar** el `create_all()` de `main.py` (o dejarlo solo si `ENVIRONMENT=development`, nunca en prod).
**Verificación:** tras `alembic upgrade head`, el script de T3 lista las 19 tablas.

---

### T5 — Fail-fast del `.env` en producción
**Archivo:** `backend/app/core/config.py`
**Qué hacer:** un `@model_validator` que, si `environment == "production"`, exija:
- `secret_key` != `"change-me"` y len ≥ 32
- `database_url` no sea el default de localhost
- `stripe_secret_key`, `resend_api_key` no vacíos
Si algo falta → `raise ValueError` (la app **no arranca**). Mejor reventar al inicio que servir roto.
**Verificación:** arrancar con `ENVIRONMENT=production` y `.env` incompleto debe fallar con mensaje claro.

---

### T6 — Endpoint admin de listado de reservas (EVITA el bug del TS)
**Archivos:** `backend/app/api/v1/admin.py` (o nuevo `bookings_admin.py`), `services/booking.py`
**Qué hacer:** crear `GET /api/v1/admin/bookings` protegido por `get_current_admin`, que:
- Devuelva **TODOS los estados por defecto** (incluyendo DRAFT y PENDING_PAYMENT).
- Acepte filtros **opcionales**: `?status=`, `?date_from=`, `?date_to=`, `?search=` (nombre/email/código).
- Pagine: `?page=`, `?page_size=` con respuesta `{items, total, page, page_size}`.
- Cargue `customer` e `items` con `selectinload` (evita N+1).
- Ordene por `created_at DESC`.
**Regla anti-bug:** NO filtres por status salvo que el cliente lo pida explícitamente. El síntoma
"creo reserva y no aparece" se reproduce justo si filtras DRAFT por defecto.
**Tests obligatorios:** crear una reserva (queda DRAFT) → `GET /admin/bookings` la incluye.
**Verificación:** test verde + prueba manual en Swagger.

---

### T7 — Bug `metadata_`
**Archivo:** `backend/app/services/booking.py:121`
Cambiar `metadata=item_data.metadata` → `metadata_=item_data.metadata` (el atributo del modelo es
`metadata_`, porque `metadata` es reservado por SQLAlchemy). **Agregar test** que cree un item CON
metadata para que no vuelva a pasar silenciosamente.

---

### T8 — Emails sin bloquear y tolerantes a fallo
**Archivos:** `backend/app/api/v1/bookings.py`, `services/email.py`
**Problema:** `resend.Emails.send()` es síncrono dentro de `async` → bloquea el server.
**Fix:** envolver en `await asyncio.to_thread(resend.Emails.send, params)` (o mover a `BackgroundTasks`).
Mantener el `try/except` para que un fallo de email **nunca** tumbe la creación de la reserva.

---

### T9 — Health checks reales
**Archivo:** `backend/app/main.py`
- `/health` (liveness): timestamp real con `datetime.now(UTC)`, sin tocar DB.
- `/health/ready` (readiness): hace `SELECT 1`; si falla → 503. Lo usa el balanceador para saber
  si la instancia puede recibir tráfico.

---

### T10 — Rate limiting
**Archivos:** `main.py`, `api/v1/auth.py`, `api/v1/bookings.py`
Activar `slowapi` (ya está en deps). Límite en `login`/`register` (anti fuerza bruta) y en el
booking público (anti spam). Ej.: 5/min en login, 20/min en booking.

---

### T11 — Código de confirmación sin race condition
**Archivo:** `backend/app/services/booking.py:202`
Reemplazar la estrategia `COUNT(*) + offset` por algo seguro ante concurrencia:
- Opción simple: prefijo + 4 dígitos aleatorios + reintento ante `IntegrityError`.
- Opción robusta: secuencia de PostgreSQL (`CREATE SEQUENCE`) y `nextval`.
**Verificación:** test que crea 50 reservas en paralelo sin colisión de código.

---

### T12 — Observabilidad
**Archivo:** `backend/app/main.py`, nuevo `core/logging.py`
- Inicializar `structlog` (logs en JSON, buscables).
- Inicializar Sentry **solo si** `SENTRY_DSN` no está vacío.
Ambos son no-op si no se configuran → no estorban en desarrollo.

---

### T13 — Docker production-ready
**Archivos:** `docker/Dockerfile.backend`, `docker/docker-compose.yml`
- Entrypoint que corra `alembic upgrade head` antes de `uvicorn`.
- Quitar el `db` local de compose si la DB será Supabase (o dejarlo solo para dev).
- Variables vía `.env`, nunca hardcodeadas. (Hoy compose tiene `SECRET_KEY=change-me` por default — quitar.)

---

### T14 — CI en GitHub Actions
**Archivo nuevo:** `.github/workflows/ci.yml`
Correr en cada push: `ruff format --check`, `ruff check`, `mypy app`, `pytest`, `bandit -r app`.
Esto es lo que **impide** que vuelvan a entrar bugs como el `metadata_`.

---

### T15 — Paridad con el admin del TS (fase posterior, ya en producción)
Portar del TS lo que aún no existe en Python: asignación de driver/vehículo, client accounts,
audit log expuesto, AI chat. Cuando se haga, pensar ya en **multi-empresa** (agregar `company_id`
a las tablas desde la primera migración, aunque hoy solo exista una empresa — migrar después es 10× más caro).

---

## 5. ORDEN DE EJECUCIÓN RECOMENDADO

```
Bloque 1 (conectar la DB y que persista):   T1 → T2 → T3 → T4 → T5
Bloque 2 (matar el bug del admin):           T7 → T6
Bloque 3 (robustez):                          T8 → T9 → T11 → T10
Bloque 4 (deploy + calidad):                  T12 → T13 → T14
Bloque 5 (después de estar en prod):          T15
```
Al terminar el **Bloque 1 + Bloque 2**, el sistema ya hace lo que el TS no podía:
crear una reserva contra Supabase y verla en el admin.

---

## 6. REGLAS DE ORO (para que NO vuelva a pasar lo del TypeScript)

1. **El backend habla con PostgreSQL directo (SQLAlchemy), nunca con la `anon key` / PostREST de Supabase.**
   Así RLS no puede esconder datos del admin. La autorización va en el backend.
2. **No actives RLS para la lógica de la app.** Si lo activas por seguridad de la capa Supabase,
   asegúrate de que el rol del backend lo omita. RLS mal hecho = "creo reserva y no aparece".
3. **El listado del admin muestra TODOS los estados por defecto.** Filtrar es opt-in.
4. **Toda escritura pasa por `get_db()`** (commit/rollback garantizado). Nunca abras sesiones sueltas.
5. **Pool chico + `pool_pre_ping` + SSL** con Supabase. Pool grande = conexiones agotadas = caídas intermitentes.
6. **Las tablas se crean con Alembic, no con `create_all`.** En producción `create_all` no corre.
7. **La app se niega a arrancar si el `.env` de producción está incompleto** (fail-fast).
8. **Nada se marca "✅ listo" sin verificación ejecutada** (script de DB, test, o prueba en Swagger).
9. **Si instalas una dependencia, úsala o quítala** (Celery, slowapi, Sentry, structlog).

---

## 7. RESUMEN EN UNA FRASE

El bug del TS ("creo reserva y no aparece en admin") viene de Supabase (RLS / pooler / filtros), no
de la lógica. El Python lo evita conectándose **directo a Postgres con pool correcto**, creando las
tablas con **Alembic**, y exponiendo un **listado de admin que muestra todos los estados**. Haz los
Bloques 1 y 2 y ya tendrás lo que el TS nunca logró; los bloques 3–4 lo dejan seguro y desplegable.
```
