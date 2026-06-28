# Diagnóstico y Plan de Acción — ClassVIP Transfers (Python)

> **Autor:** Análisis profundo (Claude Opus) sobre código real, no sobre el WORKPLAN.
> **Fecha:** 21 de junio 2026
> **Proyecto:** `classvip-transfers-python` (FastAPI + SQLAlchemy + React)
> **Comparado contra:** `classvip-live-correct2` (TypeScript/Express/Prisma, el de producción con errores)

---

## 0. Veredicto rápido

**¿Está más limpio que el de TypeScript? Sí, mucho más.** La arquitectura por capas
(api → schemas → services → models), el tipado estricto, los enums centralizados,
los precios en centavos (Integer, no float), y los tests con pytest son decisiones
correctas y profesionales. La base es sólida.

**Pero NO está listo para producción todavía.** Hay bugs reales que tronarían en cuanto
metas datos de verdad, y huecos de integración que hoy hacen que el sistema **no funcione
de punta a punta** (frontend ↔ backend ↔ deploy). El WORKPLAN dice "100/100 fases ✅", pero
eso es aspiracional: el código real tiene desviaciones respecto a lo documentado.

La buena noticia: son problemas **acotados y arreglables**, no un rediseño. Este documento
es la lista de lo que hay que hacer, en orden de prioridad.

---

## 1. ¿Por qué el de TypeScript daba tantos errores? (para no repetirlo)

Del proyecto viejo identifiqué los patrones que probablemente causaban los bugs en producción:

| Problema en el TS | Cómo evitarlo en Python |
|---|---|
| **RLS de Supabase mal configurado** (`enable_rls.sql`, `rls_policies_secure.sql` parchados a mano) → fallos de conexión/permisos intermitentes | En Python usas conexión directa con usuario propio. **No dependas de RLS para la lógica de negocio**; la autorización va en el backend (middleware + servicios). |
| **Código duplicado** entre features | Ya está mejor con capas. Mantener la regla: la lógica vive en `services/`, nunca duplicada en endpoints. |
| **"A veces no conecta a la DB"** | Casi siempre es pool de conexiones agotado, o credenciales/URL por entorno. Ver §2 y §3 — hay que arreglar el manejo de errores de DB y las migraciones. |
| Mezcla de capas (SQL dentro de controllers) | Respetar la separación. Hoy los `services` hacen las queries (aceptable a esta escala), pero NO metas SQL en los endpoints. |

**Lección central:** el de TS no fallaba por ser TypeScript, fallaba por **falta de límites
claros, falta de validación de entorno, y dependencia de magia de Supabase**. El de Python
ya corrige lo estructural; falta corregir lo operativo.

---

## 2. 🔴 BUGS REALES (arreglar SÍ o SÍ antes de seguir)

### 2.1 — `metadata=` rompe la creación de items con metadata
**Archivo:** `backend/app/services/booking.py:121`
```python
item = BookingItem(
    ...
    metadata=item_data.metadata,   # ❌ BUG
)
```
El modelo mapea el atributo como `metadata_` → columna `"metadata"` (ver
`models/booking_item.py:43`), porque `metadata` es palabra **reservada** de SQLAlchemy.
Pasar `metadata=` al constructor lanza `TypeError` / corrompe el `MetaData` de la clase.
Hoy "funciona" solo porque los tests no mandan metadata. En cuanto un item traiga metadata, truena.
**Fix:** `metadata_=item_data.metadata`.

### 2.2 — Sin migraciones (Alembic) → en Docker/producción NO se crean las tablas
**Archivos:** no existe carpeta `alembic/`; `main.py:24` + `docker-compose.yml:36`

`main.py` solo crea tablas con `create_all()` **si `environment == "development"`**.
Pero el `docker-compose.yml` arranca el backend con `ENVIRONMENT=production`.
Resultado: **en Docker nunca se crean las tablas** y toda la API falla contra una DB vacía.
- `alembic` ya está en `pyproject.toml` pero **nunca se inicializó**.
- El WORKPLAN promete "producción NUNCA depende de create_all" — pero no hay alternativa implementada.

**Fix:** inicializar Alembic, generar la migración inicial, y correr `alembic upgrade head`
en el arranque del contenedor (o en el `Dockerfile`/entrypoint).

### 2.3 — El frontend NO está conectado a este backend (sigue en Supabase)
**Archivos:** `frontend/src/shared/lib/supabase-public.ts`, `public-data.ts`

El frontend todavía lee datos desde **Supabase**, no desde el FastAPI nuevo. Hay un
`api.ts`, pero conviven con la capa vieja de Supabase. Hoy el sistema **no funciona
de extremo a extremo**: puedes tener el backend perfecto y el front seguiría hablando con otra DB.
**Fix:** migrar todas las llamadas del front a `api.ts` (apuntando a `/api/v1/...`) y
eliminar la dependencia de Supabase. Es el paso que más impacto tiene en "que funcione".

### 2.4 — `secret_key` por defecto inseguro y sin fail-fast
**Archivo:** `backend/app/core/config.py:18`
```python
secret_key: str = "change-me"
```
El docstring dice "fail-fast si falta una variable", pero **no es cierto**: con `secret_key`
en `"change-me"` la app arranca igual y firma JWTs con un secreto público. Cualquiera
podría falsificar sesiones de admin.
**Fix:** validar en `Settings` que si `environment == "production"`, `secret_key` no sea
el default y tenga longitud mínima (p.ej. `@model_validator`). Que la app **se niegue a arrancar** si no.

### 2.5 — Envío de email bloquea el event loop (no es "background")
**Archivos:** `api/v1/bookings.py:39-52`, `services/email.py:60`

El comentario dice "en background (no bloquea la respuesta)", pero `resend.Emails.send()`
es **síncrono** y se llama dentro de `async def`. Bloquea el event loop mientras Resend
responde; si Resend tarda o falla con timeout, **toda la API se frena**.
**Fix corto:** envolver en `await asyncio.to_thread(resend.Emails.send, params)`.
**Fix correcto:** mandar emails con Celery (ya está en dependencias) o `BackgroundTasks` de FastAPI.

### 2.6 — Código de confirmación con condición de carrera
**Archivo:** `backend/app/services/booking.py:202-229`

Genera el código con `COUNT(*) + offset` y luego verifica existencia. Dos reservas
simultáneas pueden generar el **mismo** `CLASS2026001` y chocar contra el `unique=True`.
**Fix:** usar una secuencia de PostgreSQL, o `INSERT ... ON CONFLICT` con reintento, o
un sufijo aleatorio corto. No confiar en COUNT para unicidad.

---

## 3. 🟠 PROBLEMAS IMPORTANTES (calidad / seguridad / operación)

### 3.1 — `rate limiting` declarado pero NO usado → login sin protección de fuerza bruta
`slowapi` está en `pyproject.toml`, pero no se aplica en ningún endpoint. El `/auth/login`
acepta intentos ilimitados. **Fix:** aplicar `slowapi` al menos a `login`, `register`,
booking público y (futuro) AI chat.

### 3.2 — La capa `repositories/` está vacía
El WORKPLAN define `api → schemas → services → repositories → models`, pero `repositories/`
no tiene nada; los `services` hacen las queries SQLAlchemy directo.
**A esta escala es aceptable** y hasta más simple. **Decisión:** o borras la carpeta y ajustas
el WORKPLAN (recomendado por ahora), o la implementas de verdad. Lo que NO debe pasar es que
la documentación diga una cosa y el código haga otra — eso confunde a tu agente Hermes y a ti.

### 3.3 — Detalle de reserva es público (cualquiera lee cualquier booking)
**Archivo:** `middleware/auth.py:14` — `/api/v1/bookings` está en `PUBLIC_PATHS`, y
`GET /bookings/{id}` no pide auth ni token firmado. Con el UUID, cualquiera ve datos del cliente
(nombre, email, vuelo). **Fix:** proteger el GET con un token firmado corto (`itsdangerous`,
ya está en deps) que va en el link del email — como hacía el `booking-token.ts` del proyecto TS.

### 3.4 — Inconsistencia: docstring dice `python-jose`, el código usa `pyjwt`
**Archivo:** `core/security.py:3` (docstring) vs `import jwt`. Menor, pero corrige el comentario
para que nadie instale la librería equivocada.

### 3.5 — Health check con timestamp hardcodeado y sin chequear DB
**Archivo:** `main.py:76` devuelve `"timestamp": "2026-06-14T00:00:00Z"` fijo y no verifica
la base de datos. Un balanceador creería que todo está sano aunque la DB esté caída.
**Fix:** timestamp real (`datetime.now(UTC)`) y un `/health/ready` que haga `SELECT 1`.

### 3.6 — `create-payment-intent` puede crear pagos pendientes duplicados
**Archivo:** `api/v1/stripe.py:60-69`. Cada llamada registra un nuevo Payment PENDING. Si el
usuario recarga el checkout, hay varios pendientes; el webhook marca "el primero" (`break`).
**Fix:** reutilizar el PaymentIntent/Payment pendiente existente, o reconciliar por
`payment_intent_id` exacto (que ya guardas en `notes`, pero deberías tener una columna propia).

### 3.7 — Cobertura de tests bajada de 85% → 50%
**Archivo:** `pyproject.toml:129` (`--cov-fail-under=50`). Se relajó la meta, señal de que
los tests no cubren lo suficiente. Faltan tests de: stripe (webhook + firma), email (mock con
`respx`), pdf, auth middleware, y los casos de error de cada servicio.

---

## 4. 🟢 LO QUE FALTA PARA SER "PRODUCCIÓN REAL"

- [ ] **Alembic** inicializado + migración inicial + paso de migración en deploy (§2.2)
- [ ] **Frontend conectado** a `/api/v1` y Supabase eliminado del front (§2.3)
- [ ] **`Dockerfile.frontend`** y servicio frontend en `docker-compose` (hoy solo está el backend)
- [ ] **Validación de `.env` en producción** (secret_key, stripe keys, resend key) (§2.4)
- [ ] **Celery + Redis realmente usados** para email/PDF (hoy están instalados pero inertes)
- [ ] **Sentry** activado (`sentry-sdk` está en deps pero no inicializado en `main.py`)
- [ ] **`structlog`** configurado (hoy se usa `logging` estándar; el WORKPLAN prometía structlog)
- [ ] **Rate limiting** real (§3.1)
- [ ] **CI** (GitHub Actions) que corra `ruff`, `mypy`, `pytest`, `bandit`, `pip-audit` en cada push
- [ ] **`.env.example` completo** y verificado contra `config.py` (que no falte ninguna var)
- [ ] **Endpoints faltantes vs el TS:** listado/paginación de bookings para el admin, asignación
      de driver/vehículo, client accounts, AI chat, audit log expuesto. Hoy el backend Python
      tiene MENOS superficie que el TS (revisar qué del admin del TS falta portar).
- [ ] **Backups de DB** y estrategia de restore antes de ir a prod.

---

## 5. PLAN DE ACCIÓN (en orden — no saltes pasos)

### FASE A — Que funcione en local de punta a punta (1–2 días)
1. Arreglar bug `metadata_` (§2.1).
2. Inicializar Alembic y crear migración inicial (§2.2):
   ```bash
   cd backend && source .venv/bin/activate
   alembic init alembic        # configurar env.py para async + Base.metadata
   alembic revision --autogenerate -m "schema inicial"
   alembic upgrade head
   ```
3. Levantar Postgres local + backend y probar el flujo real con `curl`/Swagger:
   crear booking → ver booking → PDF → (Stripe en modo test).
4. Conectar **una** pantalla del frontend (la de booking) al backend real y verla funcionar
   en el navegador. Luego el resto.

### FASE B — Seguridad y robustez (1–2 días)
5. Fail-fast de `secret_key` y validación de `.env` en producción (§2.4).
6. Email fuera del event loop (`asyncio.to_thread` o Celery) (§2.5).
7. Token firmado para `GET /bookings/{id}` y quitar bookings de `PUBLIC_PATHS` para detalle (§3.3).
8. Rate limiting en login/register (§3.1).
9. Health check real + `/health/ready` con `SELECT 1` (§3.5).

### FASE C — Calidad y deploy (2–3 días)
10. Código de confirmación sin race condition (§2.6).
11. Subir cobertura de tests a ≥80% real; agregar tests de stripe/email/pdf/auth (§3.7).
12. Dockerfile del frontend + servicio en compose + correr Alembic en el arranque.
13. Activar Sentry y structlog.
14. CI en GitHub Actions con todos los linters/tests.
15. **Recién aquí**, subir a GitHub e ir a deploy.

### FASE D — Paridad con el TS y escalabilidad SaaS (después)
16. Portar lo que falta del admin (paginación bookings, drivers, vehicles, client accounts, AI, audit).
17. Multi-empresa (el sueño SaaS): agregar `company_id` a las tablas desde ahora con un
    `tenant` por defecto, aunque solo tengas una empresa. Migrar después es 10× más caro.

---

## 6. REGLAS DE ORO (pégalas en el WORKPLAN y haz que Hermes las respete)

1. **La documentación NO es la verdad — el código es la verdad.** Si el WORKPLAN dice
   "100% ✅" pero `repositories/` está vacío, gana el código. Actualiza el WORKPLAN para que
   refleje lo real, o no confíes en él.
2. **Nada se marca "✅ hecho" sin una verificación ejecutada de verdad** (curl, test, navegador).
   "Lo escribí" ≠ "funciona".
3. **Un cambio = un commit pequeño con mensaje claro.** Vas a subir a git pronto; empieza
   con esa disciplina desde el primer commit.
4. **Probar con datos reales, no solo con tests vacíos.** El bug `metadata_` pasó los tests
   precisamente porque los tests no mandaban metadata.
5. **El entorno mata.** La mayoría de "a veces no conecta" son variables de entorno y migraciones,
   no el código. Valida `.env` al arrancar y ten migraciones versionadas.
6. **No metas SQL en endpoints.** Queries en services. Lógica de negocio en services. Endpoints
   solo reciben/responden.
7. **Si declaras una dependencia (Celery, slowapi, Sentry, structlog), úsala o quítala.**
   Dependencias instaladas pero inertes dan falsa sensación de robustez.

---

## 7. Resumen en una frase

El proyecto Python está **bien diseñado pero a medio cablear**: arquitectura limpia ✅,
pero faltan migraciones, la conexión real del frontend, validación de entorno y un puñado de
bugs concretos (empezando por `metadata_`). Arregla la **Fase A** y ya tendrás algo que funciona
de verdad en local; las fases B–C lo vuelven seguro y desplegable sin los dolores del TypeScript.
