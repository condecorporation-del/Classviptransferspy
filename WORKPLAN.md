# WORKPLAN — ClassVIP Transfers (Python Edition)

> **Versión:** 2.1 — Revisión arquitectónica GPT-5.5 + DeepSeek V4 Pro  
> **Objetivo:** Reconstruir desde cero el sistema completo de ClassVIP Transfers en Python puro, con arquitectura profesional, código limpio, 100% testeado, y enfoque en seguridad.  
> **Principio:** Cada línea de código se explica. Se avanza lento pero seguro.  
> **Proyecto original TypeScript de referencia:** `/home/conde/classvip-live-correct2/`  
> **Propietario:** Marlon (tío de Conde) — empresa de transporte de lujo en Los Cabos  
> **Meta final:** SaaS multi-empresa vendible a otras compañías de transporte

---

## 🤖 AGENT HANDOFF — Leer esto primero

**Si eres un agente de IA (Hermes, Claude, ChatGPT, etc.) trabajando en este proyecto, esta sección es OBLIGATORIA.**

### Estado actual del proyecto

> ⚠️ **Esta tabla quedó obsoleta — ver la tabla real más abajo, sección "Fase 12".**
> Se deja aquí sin borrar por trazabilidad histórica (así era el día 0 del proyecto).
> Resumen rápido para no tener que bajar: backend y DB SÍ están andando, conectados a
> Supabase real, con 71 tests pasando. Lo pendiente está en `PLAN_PRODUCCION.md` (Bloques 3-5).

| Indicador | Estado (histórico, día 0) |
|-----------|--------|
| **Fase actual** | 0 — Workplan en revisión |
| **Último avance** | Workplan creado y revisado |
| **Backend corriendo** | ❌ No iniciado |
| **Base de datos** | ❌ No creada |
| **Tests pasando** | ❌ No iniciados |
| **Deploy** | ❌ No configurado |

### Reglas para el agente

1. **Este documento es la fuente de verdad.** Si algo no está aquí, no existe.
2. **Antes de tocar código**, lee la sección de la fase correspondiente.
3. **Cada tarea completada** → actualizar el checklist `[ ]` → `[x]` en este documento.
4. **Si encuentras un error o mejora** → anótalo en la sección `ERRATA Y MEJORAS` al final.
5. **NUNCA avances a la siguiente fase** sin verificar que la actual funciona.
6. **No improvises arquitectura** — sigue la estructura de carpetas definida aquí.
7. **Todo en español** — comentarios, docstrings, mensajes de commit.
8. **Commits atómicos** — un commit por tarea completada, mensaje descriptivo.

### Cómo leer este documento

- **Fase 1-10** → El plan de construcción en orden
- **Sección SEGURIDAD** → Vulnerabilidades comunes y cómo taparlas (leer antes de cada fase)
- **Sección APRENDIZAJE** → Cómo usar este proyecto para aprender Python profesional
- **Sección ESCALABILIDAD** → Roadmap para convertir esto en SaaS multi-empresa
- **ERRATA** → Problemas encontrados durante la ejecución

### Checklist rápido de progreso

```
Fase 1:  Fundación           [██████████] 7/7   ✅
Fase 2:  Modelos DB          [██████████] 19/19 ✅
Fase 3:  Schemas Pydantic    [██████████] 6/6   ✅
Fase 4:  Servicios Core      [██████████] 8/8   ✅
Fase 5:  Endpoints API       [██████████] 9/9   ✅
Fase 6:  Auth completa       [██████████] 5/5   ✅
Fase 7:  Stripe              [██████████] 4/4   ✅
Fase 8:  Email y PDF         [██████████] 8/8   ✅
Fase 9:  Testing             [██████████] 6/6   ✅
Fase 10: Deploy              [██████████] 6/6   ✅
Fase 11: Frontend React       [██████████] 20/20 ✅
Fase 12: Producción/Hardening [████████--] Bloque 1-3/5 ✅ + T13 ✅ (T12/T14 post-launch) (ver detalle abajo)
─────────────────────────────────────────────────
TOTAL:                       [██████████] 100/100 🎉  ⚠️ ver nota
```

> ⚠️ **Nota de honestidad (22 jun 2026):** el "100/100" de arriba es **aspiracional, no real**.
> Una revisión profunda (Claude, sesión del 21-22 de junio 2026) encontró que el código real
> tenía desviaciones del plan: la capa `repositories/` nunca se implementó, no había
> migraciones (Alembic), y había bugs de datos reales no cubiertos por los tests. Detalle
> completo en `DIAGNOSTICO.md` (raíz del proyecto). **Regla de oro: el código es la verdad,
> no este documento — si encuentras una discrepancia, créele al código y corrige este archivo.**

### Estado actual del proyecto

| Indicador | Estado |
|-----------|--------|
| **Fase actual** | 24 (24 jun 2026): policies RLS de denegación (`deny_public_access`, RESTRICTIVE) en las 21 tablas → cierra el aviso `rls_enabled_no_policy` sin reabrir el acceso por PostgREST; + reset de contraseña del admin (`Class361372`, 8+ chars respetando `min_length`). Smoke test completo del admin vía API real: todo 200, 6 reservaciones visibles. Antes: Fase 23 — RLS activado en las 21 tablas. Fase 22 — backend de tareas compartidas. **95 tests verdes.** Pendientes restantes requieren decisión de Marlon (ver "ESTADO DE PENDIENTES" abajo). |
| **Último avance** | **Fase 16 (23 jun 2026):** auditoría con corrección. **Admin:** contratos 100% correctos; eliminado código muerto (clase `UpdateBookingRequest` sombreada + variable sin uso en `assign`). **Web pública:** se descubrió que el **funnel de reservas estaba roto en dev Y prod** (no solo prod) — las URLs `/api/...` sin `/v1` daban 404 porque son absolutas y no pasan por el proxy de Vite; corregido en `Book/Checkout/Confirmation/CheckoutSuccess/ChatWidget`. Además se arreglaron 2 bugs encadenados en las páginas de display (envoltorio `.data` viejo + snake_case vs camelCase) con un helper compartido nuevo `booking-api.ts`. Verificado: 77 tests verdes, `tsc` 0 errores, smoke test en vivo OK. **Pendientes documentados (no corregidos):** `stripe/confirm-payment` inexistente, link Stripe del admin, y los hallazgos de Fase 15 (security headers, sitemap, CVEs, rate limit `/customers/`). |
| **Backend corriendo** | ✅ Health check responde en :8000 (`/health` liveness, `/health/ready` readiness con `SELECT 1`) |
| **Base de datos** | ✅ Supabase (proyecto `acuvfdaelazofeskgpsp`) — 19 tablas + `alembic_version`, creadas por migración (no por `create_all`) |
| **Tests pasando** | ✅ 77 tests (pytest + SQLite en memoria), todos verdes, cobertura 77.8% |
| **Deploy** | ⏳ Pendiente de ejecutar — Railway (backend) + Vercel (frontend) + primer push a GitHub. Checklist exacto al final de la Fase 12. **Antes de deployar:** corregir el prefijo `/api/v1` en los 4 archivos frontend listados en Fase 15 (rompen en build de producción aunque funcionen en dev). |

---

## 🔍 PLAN SEO PROFESIONAL — Posicionamiento orgánico + IA (28 jun 2026)

> **Pedido de Marlon:** "Posicionar `www.classviptransfers.com` lo mejor posible en su rubro
> (transportación de lujo Los Cabos / SJD airport transfers), tanto en Google como en
> respuestas de IA (ChatGPT/Perplexity/Google AI). Antes ya salía primera al buscar 'class'.
> Primero configurar el dominio, luego ejecutar SEO por fases. **Regla dura: nada de lo que
> se haga por SEO puede afectar el funcionamiento de la página.**"
>
> **Negocio:** ClassVIP Transfers — 30+ años, 250+ hoteles desde SJD, TripAdvisor Certificate
> of Excellence. Competidor por keywords como "cabo airport transfer", "private transportation
> los cabos", "SJD airport shuttle", "transporte aeropuerto los cabos".

### Estado base ya hecho (Fase 31n, 28 jun 2026 — ver detalle abajo)
- ✅ `SEO.tsx` (react-helmet-async) con title/description/canonical/OG/Twitter/JSON-LD por ruta.
- ✅ JSON-LD `LocalBusiness` + `FAQPage` en Home. `robots.txt` + `sitemap.xml` reales.
- ✅ Performance: bundle splitting (vendor chunks), fuentes Google no bloqueantes, geo meta,
  preconnect a Cloudinary, theme-color. `www` canónico consistente en todo el sitio.

### ⚠️ Limitación arquitectónica reconocida (la decisión grande)
El sitio es **SPA pura (Vite + react-helmet)**. Google **sí** ejecuta JS y lee los meta tags
inyectados por react-helmet, pero:
- Bots de redes sociales (WhatsApp, Facebook, algunos) y **varios crawlers de IA NO ejecutan JS**
  → ven solo el `index.html` crudo (un title genérico, sin OG por ruta).
- El "first paint" del HTML no trae contenido → señal de velocidad/UX más débil que SSR.

**Para SEO de élite la solución correcta es prerender estático** (generar un `.html` real por
ruta en build). Opciones, en orden de menor a mayor fricción:
1. **`vite-plugin-prerender` / `vite-prerender-plugin`** — prerenderiza rutas conocidas a HTML
   estático en `dist/`. No cambia la arquitectura runtime (sigue siendo SPA que hidrata).
   **Recomendado** — es lo que da 90% del beneficio sin migrar a Next.js.
2. **Migrar a Next.js (App Router) con SSG** — máximo control SEO pero es re-arquitectura grande
   (semanas). Solo si el SaaS multi-empresa lo justifica más adelante.
3. **Servicio de prerender on-demand (prerender.io detrás de Vercel)** — parche externo, costo mensual.

> Decisión pendiente de Marlon: arrancar con la opción 1 (prerender estático) cuando lleguemos
> a la Fase SEO-2. Hasta entonces, todo lo demás (contenido, Schema, GBP) avanza sin bloqueo.

### 📋 ROADMAP SEO POR FASES (ejecutar en orden, cada una sin romper la página)

**FASE SEO-0 — Dominio + fundación de indexación (PRIMERO, mientras Marlon configura DNS)**
- [ ] Apuntar `www.classviptransfers.com` a Vercel (CNAME) y `classviptransfers.com` (A/ALIAS).
- [ ] **Redirect 301** del apex (`classviptransfers.com`) → `www.classviptransfers.com` (una sola
      URL canónica; evita dividir autoridad). Configurable en Vercel → Domains.
- [ ] Verificar HTTPS activo y forzado (Vercel lo hace solo con el dominio agregado).
- [ ] Alta en **Google Search Console** (propiedad de dominio, verificación por DNS TXT).
- [ ] Enviar `sitemap.xml` en Search Console.
- [ ] Alta en **Bing Webmaster Tools** (Bing alimenta a ChatGPT/Copilot — importa para SEO en IA).
- [ ] Confirmar que el dominio viejo/histórico (si lo había) hace 301 al nuevo, para no perder
      la autoridad que ya tenía ("antes salía primera").

**FASE SEO-1 — On-page técnico (código, sin tocar UX)** — 🟡 EN CURSO (28 jun 2026, commit 3329873)
- [x] **Canonical/JSON-LD consistentes a `www`**: 9 referencias apuntaban a `classviptransfers.com`
      sin www (Activities/Transfers/Portfolio/Contact/Book) → dividían autoridad. Todas a www.
- [x] Title + meta description con keyword local: Transfers ("...en Los Cabos · SJD Airport"),
      Contact ("...Los Cabos 24/7"), Book ("...in Los Cabos"), Portfolio ("Los Cabos Portfolio...").
      Home/Activities ya estaban bien. (description de Transfers reforzada con "SJD to any hotel").
- [x] `<html lang>` dinámico según idioma activo (estaba fijo en `es`; el sitio arranca en inglés).
      `og:locale`/`og:locale:alternate` también dinámicos. Vía Helmet en `SEO.tsx`.
- [ ] Schema adicional: `BreadcrumbList`, `Organization` con `logo`/`sameAs`. (`Service` ya existe en
      Transfers/Book; `LocalBusiness`+`FAQPage`+`AggregateRating` ya en Home.)
- [ ] `hreflang` es-MX / en-US (requiere URLs distinguibles por idioma — hoy el idioma es client-side
      con localStorage, no por URL; evaluar en FASE SEO-2 con prerender).
- [ ] Alt text descriptivo con keywords en TODAS las imágenes (hero, flota, hoteles).
- [ ] Imágenes en formato moderno (Cloudinary ya puede servir `f_auto,q_auto` → WebP/AVIF).
- [ ] Verificar Core Web Vitals reales con PageSpeed Insights (LCP < 2.5s, CLS < 0.1, INP < 200ms).

**FASE SEO-2 — Prerender estático (la decisión grande de arriba)**
- [ ] Integrar prerender de rutas públicas conocidas (Home, Transfers, Activities, Portfolio,
      Contact). Admin/checkout NO se prerenderean (privados).
- [ ] Validar que el HTML estático trae title/description/OG/JSON-LD correctos por ruta
      (test: `curl` la URL y ver el `<head>` sin ejecutar JS).
- [ ] Regla dura: la hidratación de React debe seguir funcionando idéntica (sin romper booking).

**FASE SEO-3 — Contenido programático: landing pages por hotel y por servicio**
> Esta es la idea que Marlon recordó ("páginas por cada hotel"). Es el mayor multiplicador de
> tráfico long-tail: los turistas buscan "transfer from SJD to <hotel>". HACER DESPUÉS, con plan
> propio — requiere data de hoteles (ya existe catálogo en DB) + plantilla de página.
- [ ] Plantilla `/transfers/:hotelSlug` data-driven desde el catálogo de hoteles existente.
- [ ] Por hotel: distancia/tiempo desde SJD, precio de referencia, descripción, FAQ, CTA de reserva
      pre-llenada con ese destino. Schema `Service` + `FAQPage` por página.
- [ ] ~30-40 hoteles top primero (los de mayor volumen), no los 250 de golpe.
- [ ] Landing pages por tipo de servicio: `/airport-transfers-los-cabos`,
      `/private-transportation-cabo`, `/luxury-suburban-los-cabos`, etc.
- [ ] Cada landing entra al `sitemap.xml` (idealmente generado automáticamente desde el catálogo).

**FASE SEO-4 — Off-page + posicionamiento en IA (GEO / Generative Engine Optimization)**
> Las IAs (ChatGPT, Perplexity, Google AI Overviews) responden con base en: el sitio (si es
> crawleable), reseñas (Google/TripAdvisor/Yelp), y menciones en otros sitios.
- [ ] **Google Business Profile** completo y optimizado (categorías, fotos, horario 24/7,
      descripción con keywords, link a www) — acción de Marlon, alto impacto local + IA.
- [ ] Responder TODAS las reseñas de Google y TripAdvisor (señal de actividad).
- [ ] Consistencia NAP (Name/Address/Phone) idéntica en web, GBP, TripAdvisor, redes.
- [ ] Texto del sitio que responda preguntas tal cual las hace la gente ("best private
      transportation Los Cabos", "how to get from SJD airport to Cabo") → las IAs citan respuestas directas.
- [ ] Schema markup robusto (ya iniciado) — las IAs leen JSON-LD directamente.
- [ ] Backlinks de calidad: blogs de viajes Cabo, directorios de turismo, partners hoteleros.

### Métricas de éxito (revisar mensual en Search Console)
- Posición media para "cabo airport transfer", "transporte aeropuerto los cabos", marca "class vip".
- Impresiones y CTR orgánico crecientes.
- Páginas indexadas = páginas en sitemap (sin "Descubierta, no indexada").
- Core Web Vitals en verde (campo, no solo lab).
- Aparición en respuestas de IA al preguntar por transporte en Los Cabos.

### 🚦 Próximo paso inmediato
Marlon configura el dominio en Vercel (FASE SEO-0, ítems de DNS + 301 + Search Console). Una vez
el dominio resuelva en `www`, el agente arranca **FASE SEO-1** (on-page técnico) que es 100% código
y no toca el flujo de reservas. La FASE SEO-2 (prerender) requiere su OK explícito por ser cambio
de build.

---

## 🏗️ FASE 12 — PRODUCCIÓN Y HARDENING (en curso, 22 jun 2026)

> Esta fase nació de dos documentos que viven en la raíz del proyecto y que el agente
> **debe leer si necesita contexto completo**:
> - `DIAGNOSTICO.md` — análisis de arquitectura y bugs encontrados antes de tocar código.
> - `PLAN_PRODUCCION.md` — el plan ejecutable con tareas T1-T15, organizadas en 5 bloques.
>
> Esta sección del WORKPLAN es el **registro vivo de ejecución** de ese plan: qué se hizo,
> en qué archivo, por qué, y cómo se verificó. **Cada vez que se complete una tarea nueva del
> plan (o cualquier cambio de fondo al proyecto), se documenta aquí con el mismo nivel de
> detalle — no se vuelve a "Fase 0 sin contexto" nunca.**

### Por qué existe esta fase — el bug que la originó

El dueño del proyecto (Marlon) reportó que el proyecto **TypeScript** (`classvip-live-correct2`,
el que está en producción, **no este**) tiene un bug constante: *"hago una reservación y no la
puedo ver en el admin."* Se inspeccionó en modo solo-lectura la base de Supabase real de ese
proyecto y se confirmó la causa exacta: **las 19 tablas tienen RLS activado con una policy
`USING: false` para el rol público** (`cmd=ALL`). El backend escribe con el rol dueño (que
ignora RLS), pero cualquier lectura que pase por la `anon key`/PostgREST de Supabase choca con
esa policy y devuelve cero filas sin error — la reserva existe, pero "desaparece" para quien la
lee por el camino equivocado.

**Decisión de diseño para este proyecto Python:** el backend se conecta **directo a
PostgreSQL vía SQLAlchemy** (rol dueño), nunca con la `anon key` ni PostgREST. RLS no puede
escondernos nada porque no dependemos de él para la autorización — esa vive en el backend
(middleware + servicios). Además, el endpoint de admin de bookings (T6, ver abajo) tiene una
regla explícita: **nunca filtra por status por defecto**, que era la segunda causa posible del
mismo síntoma.

### Estado de los 5 bloques

| Bloque | Tareas | Estado | Qué resuelve |
|---|---|---|---|
| **1 — Conectar la DB y que persista** | T1-T5 | ✅ **Completado** | Supabase real conectado, schema vía Alembic, validación fail-fast |
| **2 — Matar el bug del admin** | T7, T6 | ✅ **Completado** | Bug `metadata_` (2 bugs en realidad) + endpoint admin sin filtro oculto |
| **3 — Robustez** | T8, T9, T11, T10 | ✅ **Completado** | Emails no bloqueantes, health checks reales, race condition del código de confirmación, rate limiting anti fuerza-bruta/spam |
| **4 — Deploy + calidad** | T12, T13, T14 | 🟡 **T13 ✅ / T12, T14 pendientes (post-launch, no bloquean el deploy)** | Docker production-ready (listo). Observabilidad (Sentry/structlog) y CI quedan para después de estar en producción — no son necesarios para subir mañana |
| **5 — Paridad con TS** | T15 | 🟡 Parcial | Drivers ✅ y vehicles ✅ ya conectados de punta a punta (`RRHHTab.tsx` ↔ `/api/v1/admin/drivers\|vehicles`). Faltan: client accounts (portal de login para clientes — no existe), audit log (modelo y servicio ya existen en `app/models/audit.py` / `app/services/audit.py` pero no están enganchados a ningún endpoint ni pantalla), AI chat (`ChatWidget.tsx` está montado en `Layout.tsx`, visible al público, pero llama a `/api/ai/chat` y `/api/ai/transcribe` que no existen en el backend — hoy está roto), multi-empresa |

Numeración de tareas (T1-T15) **igual que en `PLAN_PRODUCCION.md`** — para ver el detalle
completo de cada una (archivo exacto, código objetivo, por qué), consulta ese archivo.

---

### ✅ Bloque 1 — Conectar la DB y que persista (completado 22 jun 2026)

| Tarea | Archivo(s) tocados | Qué se hizo | Cómo se verificó |
|---|---|---|---|
| **T1** | `backend/.env.example`, `backend/app/core/config.py` | Reescrito `.env.example` con plantilla real de Supabase (Session pooler para `DATABASE_URL`, Direct/Session para `DATABASE_URL_DIRECT`). Agregado el campo `database_url_direct` a `Settings`. | `python -c "from app.core.config import get_settings; get_settings()"` sin error |
| **T2** | `backend/app/database.py` | Pool chico (`pool_size=5, max_overflow=5`), `pool_pre_ping=True`, `pool_recycle=300`. SSL automático salvo si el host es `localhost`/`127.0.0.1`/`db:` (docker-compose). Detección automática de puerto `:6543` (Transaction Pooler) → activa `NullPool` + `statement_cache_size=0` + `prepared_statement_name_func` con UUID (ver bug abajo). | Conexión exitosa a Postgres local y a Supabase real |
| **T3** | `backend/scripts/test_db.py` (nuevo) | Script de diagnóstico: `SELECT 1`, lista tablas, cuenta bookings. Es la primera cosa que se corre si algo "no conecta". | Ejecutado contra local y contra Supabase — ambos OK |
| **T4** | `backend/alembic/` (nuevo), `backend/app/main.py` | Inicializado Alembic (plantilla async). `env.py` importa `Base` + todos los modelos (`app.models`), usa `DATABASE_URL_DIRECT` (fallback a `DATABASE_URL`), aplica el mismo criterio de SSL que T2. Generada la migración inicial (`alembic/versions/1dcb7aeb1199_schema_inicial.py`) con las 19 tablas. **Se quitó `Base.metadata.create_all()` de `main.py`** — el schema ahora SOLO lo gestiona Alembic, nunca el arranque de la app. | `alembic upgrade head` aplicado contra Postgres local Y contra Supabase real → 19 tablas + `alembic_version` en ambos |
| **T5** | `backend/app/core/config.py` | `@model_validator(mode="after")` en `Settings`: si `environment == "production"`, exige `secret_key` real (≥32 chars, no "change-me"), `database_url` no sea el default/localhost, y `stripe_secret_key`/`resend_api_key` no vacíos. Si falta algo, **la app no arranca** y lista exactamente qué falta. | Probado con env vars inline: config incompleta → `ValueError` con la lista de errores; config completa → arranca |

**Extra fuera del plan original, encontrado en el camino:** no existía **ningún `.gitignore`**
en la raíz ni en `backend/` (solo en `frontend/`). Se creó uno en la raíz del proyecto que
ignora `.env`, `.venv/`, `__pycache__/`, caches de pytest/ruff/mypy, `node_modules/`, `dist/`,
y scripts temporales (`_tmp_*.py`, `_inspect_*.py`). **Esto era crítico**: sin esto, el primer
`git init` + `git add .` habría subido las credenciales reales de Supabase al repo.

#### Supabase nuevo conectado (proyecto limpio, separado del TS)

Se creó un proyecto Supabase **nuevo** (`acuvfdaelazofeskgpsp`), separado del que usa
`classvip-live-correct2` (el que tiene el RLS roto). Conexión vía **Transaction pooler**
(puerto 6543, IPv4-only) para la app, y **Session pooler** (puerto 5432) para Alembic.

**Bug encontrado y resuelto en el camino — colisión de prepared statements con PgBouncer:**
La primera conexión a Supabase real falló con `DuplicatePreparedStatementError`. Es un problema
documentado de SQLAlchemy + asyncpg + PgBouncer en modo transacción: asyncpg nombra sus
prepared statements de forma numérica secuencial por conexión lógica, pero PgBouncer reasigna
la conexión física en cada transacción — dos conexiones lógicas distintas pueden generar el
mismo nombre sobre la misma conexión física y Postgres rechaza el segundo. La sola bandera
`statement_cache_size=0` (que ya estaba puesta) **no fue suficiente**. La solución oficial
(documentada en el docstring del dialecto `sqlalchemy/dialects/postgresql/asyncpg.py`, sección
"Prepared Statement Name with PGBouncer") es generar nombres únicos con `uuid4`:
```python
connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4()}__"
```
Ya está aplicado en `database.py` (activo solo cuando se detecta el puerto `:6543`). **Probado
con 30 queries concurrentes simultáneas** (`scripts/test_db_concurrency.py`, no se commitea
como parte del repo final pero queda documentado aquí por si hace falta repetir la prueba) —
cero colisiones.

**Si en el futuro el proyecto crece y usas Transaction Pooler en otro lugar (Celery workers,
scripts batch, etc.), aplica el mismo patrón — no asumas que `statement_cache_size=0` solo
es suficiente.**

---

### ✅ Bloque 2 — Matar el bug del admin (completado 22 jun 2026)

| Tarea | Archivo(s) tocados | Qué se hizo | Cómo se verificó |
|---|---|---|---|
| **T7** | `backend/app/services/booking.py`, `backend/app/schemas/booking.py` | Resultó ser **dos bugs relacionados**, no uno: (1) el servicio construía `BookingItem(metadata=item_data.metadata)` — pero el atributo del modelo es `metadata_` (mapeado a la columna `"metadata"`), porque `metadata` a secas ya es un atributo reservado de `Base` (el registro de tablas de SQLAlchemy). (2) Aun arreglando eso, `BookingItemResponse.metadata` con `from_attributes=True` leería `item.metadata` al serializar — es decir, el mismo objeto `MetaData()` de SQLAlchemy, no el JSON real — y la respuesta truena con `ValidationError`. Se corrigió el primero (`metadata_=item_data.metadata`) y el segundo con un alias: `metadata: dict \| None = Field(None, validation_alias="metadata_")` + `populate_by_name=True`. | Confirmado el bug ANTES de arreglarlo con un script aislado (para no "arreglar" algo que no estaba roto). Test de regresión agregado: `test_create_booking_with_item_metadata` en `test_bookings.py` — crea un item con metadata real y verifica que vuelve intacto en la respuesta. |
| **T6** | `backend/app/services/booking.py` (método `list_paginated`), `backend/app/api/v1/admin.py` (`GET /api/v1/admin/bookings`) | Nuevo endpoint protegido (`get_current_admin`) que lista reservas paginadas. **Regla anti-bug explícita en el código y en el docstring: NO filtra por status por defecto** — el filtro es siempre opt-in vía `?status=`. Soporta `?date_from=`, `?date_to=`, `?search=` (nombre/email del cliente o código de confirmación, vía `ilike` + join a `Customer`), `?page=`/`?page_size=`. Usa `selectinload` para `customer` + `items` (evita N+1), ordena por `created_at DESC`. | 5 tests nuevos en `test_admin_bookings.py`, el más importante: `test_new_draft_booking_appears_in_admin_list` — crea una reserva (queda en DRAFT) y confirma que aparece en `GET /admin/bookings` **sin pasar ningún filtro**. También: filtro de status es opt-in, búsqueda por email, paginación, y que la ruta exige auth (401 sin sesión). |

**Bug extra encontrado en el camino — cookie de sesión con `secure=True` fijo:** al escribir el
primer test que de verdad hace login y luego usa la cookie para llamar una ruta protegida (nadie
había probado ese camino completo antes — los tests viejos de auth solo probaban login aislado
o acceso sin sesión, nunca login → ruta protegida), se descubrió que `POST /auth/login`
(`backend/app/api/v1/auth.py`) ponía la cookie `admin_token` con `secure=True` **siempre**, sin
importar el entorno. Sobre HTTP plano (local, `http://localhost`, o tests con `ASGITransport`),
el cliente nunca vuelve a enviar una cookie marcada `Secure` — el login "parece" exitoso (200,
JWT en el body) pero ninguna ruta protegida reconoce la sesión después. Se corrigió:
`secure=settings.environment == "production"` — sigue siendo `True` (correcto) en producción
real, pero permite que dev/test funcionen sobre HTTP. **Si el panel admin en el navegador algún
día "no detecta la sesión" en local, este es el primer lugar a revisar.**

**Estado de tests tras Bloque 2:** 27 tests, 74% cobertura, todos verdes.

---

### ✅ Bloque 3 — Robustez (completado 22 jun 2026)

| Tarea | Archivo(s) tocados | Qué se hizo | Cómo se verificó |
|---|---|---|---|
| **T8** | `backend/app/services/email.py` | `resend.Emails.send()` es síncrono y bloquea el event loop si se llama directo dentro de una función `async`. Las 4 funciones de envío (confirmación cliente, notificación interna, recordatorio, cancelación) ahora llaman `await asyncio.to_thread(resend.Emails.send, params)` — corre el SDK síncrono en un hilo aparte sin bloquear el servidor. El `try/except` alrededor de cada envío se mantiene: **un fallo de email nunca debe tumbar la creación de la reserva**, solo se loguea como warning (`"Email ... no enviado: ..."`). | Tests de booking que pasan con `RESEND_API_KEY` inválida en `.env` de test: la reserva se crea igual (201) y el log muestra el warning, no una excepción propagada. |
| **T9** | `backend/app/main.py` | Separados los dos health checks con semántica distinta (estándar Kubernetes/Railway/Render): `/health` (+ alias `/api/health`) es **liveness** — responde 200 con timestamp real (`datetime.now(UTC)`), nunca toca la DB, para que un hiccup de Supabase no provoque que la plataforma reinicie el contenedor entero. `/health/ready` (+ alias `/api/health/ready`) es **readiness** — hace `SELECT 1` contra la DB real; si falla, devuelve 503 y la plataforma saca la instancia de rotación temporalmente (sin reiniciarla) hasta que la DB vuelva. Ambas rutas están en la lista de rutas públicas del `AdminAuthMiddleware` (no requieren sesión). | Levantado el servidor local momentáneamente: `/health` devolvió `{"status": "ok", ...}` con timestamp real; `/health/ready` devolvió `{"status": "ready", ...}` confirmando conexión real a Supabase. Servidor de prueba detenido después. |
| **T11** | `backend/app/services/booking.py` (método `create_draft`) | Reemplazada la estrategia vieja de `_assign_unique_confirmation_code` (SAVEPOINT anidado, que daba problemas con el estado de la sesión async) por **reintento del bloque completo de creación** ante `IntegrityError`: cliente (find-or-create, idempotente) + booking + items + commit, todo dentro de un `try/except IntegrityError` con hasta 5 intentos. Si los 5 fallan, se lanza `ValidationError` legible. El generador `_random_confirmation_code()` solo produce un candidato (`CLASS<año><6 dígitos>`) — la unicidad real la garantiza el `UNIQUE` de la columna + este reintento. | **Bug real encontrado y corregido en el camino:** el primer intento de fix solo envolvía el `commit()` final en el `try/except`, pero SQLite (y Postgres) valida el `UNIQUE` constraint en el `flush()` —que pasa **antes** del commit, al guardar el `Booking` para obtener su `id`— no en el commit. Una colisión en el flush se propagaba sin reintentar. Se corrigió moviendo **todo** el cuerpo del intento (incluido el flush inicial) dentro del `try`. Test de regresión: `test_confirmation_code_collision_retries_with_savepoint` en `test_bookings.py` — fuerza que la 1ª y 2ª reserva generen el mismo código candidato, confirma que la 2ª reintenta con un código distinto y que no perdió el booking/items en el camino. |
| **T10** | `backend/app/core/rate_limit.py` (nuevo), `backend/app/main.py`, `backend/app/api/v1/auth.py`, `backend/app/api/v1/bookings.py` | Activado `slowapi` (ya estaba en dependencias pero sin usar). `core/rate_limit.py` define el `Limiter` (keyed por IP del cliente) como singleton importado donde se necesite. En `main.py` se registra `app.state.limiter`, el exception handler de `RateLimitExceeded` (devuelve 429 limpio) y el `SlowAPIMiddleware`. Límites: `POST /auth/login` → **5/minuto** (anti fuerza bruta), `POST /bookings/` → **20/minuto** (anti spam del formulario público). | **Bug de tests encontrado y corregido en el camino:** el `Limiter` es un singleton en memoria que vive durante **todo el proceso de pytest**, no por test — sin reset, los tests de login/booking de archivos distintos se acumulaban y la suite empezaba a fallar con 429 en vez de probar la lógica real (`test_login_wrong_password`, `test_login_nonexistent_email`). Se agregó un fixture `autouse=True` en `conftest.py` (`reset_rate_limiter`) que llama `limiter.reset()` antes de cada test — el rate limiting real en producción queda intacto, solo se aísla entre tests. |

**Estado de tests tras Bloque 3:** 27 tests, 74% cobertura, todos verdes.

---

### 🟡 Bloque 4 (parcial) — T13 Docker production-ready (completado 22 jun 2026)

| Tarea | Archivo(s) tocados | Qué se hizo | Cómo se verificó |
|---|---|---|---|
| **T13** | `docker/entrypoint.sh` (nuevo), `docker/Dockerfile.backend`, `docker/docker-compose.yml` | Nuevo `entrypoint.sh`: corre `alembic upgrade head` y luego `exec uvicorn ... --port "${PORT:-8000}"` (Railway inyecta `PORT` dinámicamente, no siempre 8000). El `Dockerfile.backend` ahora usa `ENTRYPOINT ["/entrypoint.sh"]` en vez de lanzar uvicorn directo — así **toda imagen que arranca ya migró el schema**, nunca depende de que alguien corra `alembic upgrade head` a mano antes del deploy. En `docker-compose.yml` (el stack de **desarrollo local**, Postgres+Redis en contenedores — Railway no lo usa, construye directo del Dockerfile) se quitó el default inseguro `SECRET_KEY=change-me-in-production` (ahora `${SECRET_KEY:?...}` truena si no está en `.env`, en vez de arrancar con un secreto público) y se cambió `ENVIRONMENT=production` → `development`, porque ese compose corre contra Postgres local, no contra Supabase real — tenerlo en `production` activaba sin sentido la validación fail-fast (T5) que exige secretos reales de Stripe/Resend que el dev local no necesita. | `sh -n docker/entrypoint.sh` confirma sintaxis válida. **No se pudo correr `docker build` en esta sesión** (el usuario de WSL no está en el grupo `docker` y `sudo` no tiene contraseña configurada para uso no interactivo) — **queda pendiente que Marlon corra `docker build -f docker/Dockerfile.backend -t classvip-backend .` una vez, manual, antes de conectar el repo a Railway**, para confirmar que la imagen compila limpia. |

---

### 📋 CHECKLIST DE DEPLOY — para ejecutar manualmente (GitHub → Railway → Vercel)

> El código ya quedó listo (Bloques 1-3 completos + T13). Esto es lo que falta — son pasos
> manuales en las plataformas, no requieren más cambios de código salvo que algo falle.

**1. GitHub (subir el repo por primera vez)**
```bash
cd ~/classvip-transfers-python
git init
git add .
git status   # confirmar que NO aparece backend/.env (solo .env.example) — el .gitignore ya lo protege
git commit -m "Initial commit — ClassVIP Transfers Python backend + frontend"
gh repo create classvip-transfers-python --private --source=. --push
# o: crear el repo vacío en GitHub.com y luego `git remote add origin <url> && git push -u origin main`
```

**2. Railway (backend)**
- Conectar el repo de GitHub recién subido.
- Root directory del servicio: la raíz del repo (Railway lee `docker/Dockerfile.backend` — confirmar
  que el "Dockerfile path" en la config del servicio apunte ahí, no a la raíz).
- Variables de entorno a copiar de `backend/.env` real (rotar `SECRET_KEY` antes de copiar):
  `DATABASE_URL`, `DATABASE_URL_DIRECT`, `SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_BCC`,
  `ENVIRONMENT=production` (activa T5 fail-fast — si falta algo, Railway lo va a decir en los logs
  de deploy, no en producción silenciosa), `LOG_LEVEL=INFO`.
- `FRONTEND_URL` y `ALLOWED_ORIGINS` **se actualizan después de tener la URL de Vercel** (paso 3).
- Tras el primer deploy exitoso: visitar `https://<tu-app>.up.railway.app/health/ready` — debe
  responder `{"status": "ready", ...}` (confirma que sí conectó a Supabase real).

**3. Vercel (frontend)**
- Conectar el mismo repo, root directory: `frontend/`.
- Variable de entorno: `VITE_API_URL=https://<tu-app>.up.railway.app` **(host pelado, SIN `/api/v1`).**
  ⚠️ El frontend **ya añade `/api/v1` por su cuenta** en cada llamada (ver `getApiBaseUrl()` en
  `frontend/src/shared/lib/api.ts` + los `apiUrl('/api/v1/...')` de cada componente). Si pones
  `.../api/v1` aquí, las URLs quedan duplicadas (`/api/v1/api/v1/...`) y todo el admin da 404.
  Por eso el `.env` local es `http://localhost:8000` a secas — replica ese contrato en Vercel.
- Tras el deploy, volver a Railway y actualizar `FRONTEND_URL` y `ALLOWED_ORIGINS` con el dominio
  real de Vercel (`https://<tu-proyecto>.vercel.app`) — si no, el navegador bloquea las llamadas
  del frontend al backend por CORS.

**4. Verificación final post-deploy**
- Abrir el frontend en Vercel → hacer una reserva de prueba → confirmar que aparece en
  `GET /api/v1/admin/bookings` (login admin primero).
- Si algo falla, revisar primero `/health/ready` del backend — si dice `not_ready`, el problema
  es la conexión a Supabase (credenciales o `DATABASE_URL` mal copiada a Railway), no el código.

---

### ✅ Fase 12.5 — Cableado Frontend ↔ Backend (22 jun 2026)

> **LEE ESTO antes de tocar el frontend.** Todo `frontend/src/` se **copió tal cual del
> proyecto TypeScript viejo** (`classvip-live-correct2`), que hablaba con un backend **Express**
> distinto a este FastAPI. Ese backend viejo usaba: rutas `/api/...` (sin `/v1`), envoltorio
> `{success, data}` en las respuestas, `{error}` en los errores, y campos en **camelCase**.
> Este backend Python usa: rutas `/api/v1/...`, **objetos directos sin envoltorio**, errores
> `{detail}`, y campos en **snake_case**. Por eso cada componente del frontend tuvo que
> reconectarse. **No "arregles" un componente asumiendo el contrato viejo — primero mira esta
> tabla para saber cuáles ya están migrados y cuáles NO.**

#### Contrato de URL (clave, no romper)
`getApiBaseUrl()` (`frontend/src/shared/lib/api.ts`) devuelve **solo el host** (`VITE_API_URL`
o `http://localhost:8000`), sin sufijo. Cada componente añade el path completo `/api/v1/...`.
→ `VITE_API_URL` **nunca** debe incluir `/api/v1` (ver advertencia en el checklist de deploy arriba).

#### Estado del cableado por área

| Área del frontend | Archivos | Estado | Notas |
|---|---|---|---|
| **Auth admin** | `useAdminAuth.ts`, `AdminLogin.tsx` | ✅ Conectado | `/api/v1/auth/login\|me\|logout` |
| **Reservas (admin)** | `AdminBookings.tsx` | ✅ Conectado | list/get/export/pdf/confirm/cancel/assign/patch/resend + edición de cliente |
| **RRHH (drivers/vehicles)** | `RRHHTab.tsx` | ✅ Conectado | `/api/v1/admin/drivers\|vehicles` |
| **Cuentas de cliente** | `AccountsTab.tsx` | ✅ Conectado | accounts + charges + payments + bookings + PATCH charge |
| **Finanzas** | `FinanzasTab.tsx` | ✅ Conectado | bookings + accounts |
| **Dashboard** | `DashboardOverviewTab.tsx` | ✅ Conectado | bookings por rango |
| **Marketing** | `MarketingTab.tsx` | ✅ Conectado | dashboard + bookings |
| **Precios (admin)** | `PricingManager.tsx` | ✅ Conectado (esta sesión) | ver detalle abajo |
| **Funnel público de reserva** | `Book.tsx`, `Checkout.tsx`, `Confirmation.tsx`, `CheckoutSuccess.tsx`, `ChatWidget.tsx` | 🟡 **Conectado, con 2 huecos** | `Book.tsx` arreglado en Fase 13.4; falta corregir prefijo `/api` vs `/api/v1` para producción y construir backend de AI para `ChatWidget.tsx` (ver "Lo que falta" abajo) |

#### Detalle — `PricingManager.tsx` reconectado (esta sesión)

| Qué | Antes (Express viejo) | Ahora (FastAPI) |
|---|---|---|
| Paths | `/api/admin/pricing/{rules,extras,areas,hotels}` | `/api/v1/pricing/{...}` (constante `PRICING_BASE`) |
| Respuesta de lista | `{success, data:[...]}` | `{items:[...], total, page, page_size}` |
| Errores | `{error}` | `{detail}` |
| Casing | camelCase directo | **mappers** `mapArea/mapRule/mapExtra/mapHotel` (snake→camel al leer) + payloads snake al escribir (`one_way_price_cents`, `is_active`, etc.) |
| Editar | `PUT /...{id}` | `PATCH /...{id}` (el backend **no tiene PUT**) |
| Borrar/desactivar | `DELETE /...{id}` | `PATCH /...{id}` con `{active:false}` (rules/extras) o `{is_active:false}` (areas/hotels) — **el backend no tiene DELETE**; desactivar = soft-delete |

Helpers nuevos en el archivo: `readList()` (mapea `{items}` → camelCase), `ensureOk()` (lanza
el `{detail}` si no es 2xx). Se eliminó `parseJsonResponse` (asumía `{success,data}`).
**Verificado:** `tsc --noEmit` limpio; en vivo contra Supabase real los 4 GET → 200 con forma
correcta, y un round-trip de escritura guardó `one_way_price_cents=12300` exactamente como lo
mapea el componente (fila de prueba borrada después, prod limpio).

#### Dos arreglos de backend que salieron de la auditoría (esta sesión)

| Issue | Archivo(s) | Qué se hizo | Cómo se verificó |
|---|---|---|---|
| **Seguridad: escrituras de pricing sin auth** | `backend/app/api/v1/pricing.py` | El `AdminAuthMiddleware` tiene `/api/v1/pricing` en `PUBLIC_PATHS` (correcto para los GET — el formulario público necesita ver precios). Pero eso dejaba **POST/PATCH también abiertos**: un `POST /pricing/areas` sin login devolvía 201 (cualquiera podía reescribir tarifas). Se agregó `_admin: str = Depends(get_current_admin)` a las **8 escrituras** (create/update de hotels, areas, rules, extras). Los GET siguen públicos. | En vivo: POST sin auth → **401**, GET sin auth → **200**, POST con login → **201**. Tests nuevos: `test_pricing_writes_require_auth`, `test_pricing_reads_are_public`. Los 5 tests viejos de pricing se actualizaron para loguearse antes de escribir. |
| **Robustez: nombre duplicado → 500** | `backend/app/main.py` | Un nombre de área repetido reventaba la constraint `areas_name_key` y burbujeaba como **500** (`asyncpg.UniqueViolationError`). Se agregó un **exception handler global** `@app.exception_handler(IntegrityError)` → **409** con `{detail}`. `get_db()` ya hace rollback al propagarse la excepción, así que el handler solo traduce el código. Cubre toda la app, no solo pricing. | En vivo: 2º POST con el mismo nombre → **409** (antes 500). Test nuevo: `test_duplicate_area_name_returns_409`. |

#### ✅ Actualizado en Fase 13.4 — esta tabla quedó obsoleta, ver estado real abajo

> Esta tabla describía el estado de la Fase 12.5 (antes de las correcciones de Fase 13.4). Ya no es
> precisa: `Book.tsx` se arregló (camelCase + cents + `totalPrice`), y se confirmó que
> `usePricing.ts` era código muerto (nadie lo importaba salvo a sí mismo) — se eliminó junto con
> `public-data.ts` y `supabase-public.ts`, también huérfanos. Estado real verificado contra el
> código actual:

| Archivo frontend | Llama a | Estado real |
|---|---|---|
| `Book.tsx` | `POST /api/v1/bookings/` | ✅ Arreglado (Fase 13.4): payload en camelCase mapeado vía `alias_generator=to_camel`, precios en centavos, `totalPrice` agregado |
| `Checkout.tsx`, `Confirmation.tsx`, `CheckoutSuccess.tsx` | `GET /api/bookings/{id}` (sin `/v1`) | ✅ Funciona en dev porque el proxy de Vite reescribe `/api` → `/api/v1`. ⚠️ En producción (build estático, sin proxy de Vite) esto **rompe** salvo que el backend también sirva un alias sin `/v1` o se corrija la URL en el código — pendiente de decidir antes de deploy |
| `Checkout.tsx` | `POST /api/stripe/create-payment-intent` | ✅ Funciona igual que arriba (mismo tema del prefijo en producción) |
| `Checkout.tsx` | `POST /api/stripe/confirm-payment` | ❌ No existe en backend, **pero no es bloqueante**: el código tiene try/catch y el webhook de Stripe finaliza la reserva igual si esta llamada falla |
| `usePricing.ts`, `public-data.ts`, `supabase-public.ts` | rutas viejas (`/api/pricing/zones`, `/quote`, Supabase directo) | 🗑️ **Eliminados** (código muerto, sin consumidores reales — `useBookingCatalog.ts` ya los reemplazó) |
| `ChatWidget.tsx` | `/api/ai/chat`, `/api/ai/transcribe` | ❌ **No existen rutas de AI** — y a diferencia de antes, confirmado que el widget SÍ está montado en `Layout.tsx` (visible en todo el sitio público), así que esto está roto de cara al usuario hoy, no es solo deuda técnica |

**Estado de tests tras Fase 12.5:** 48 tests (45 + 3 nuevos de pricing), todos verdes.

---

### ✅ Fase 12.6 — Admin completo + Nueva Reserva (reserva manual sin pago) (22 jun 2026)

> **Causa raíz de "el admin no es igual al de TypeScript y no funciona".** El
> `frontend/src/features/admin/pages/Admin.tsx` era un **stub de 87 líneas** que solo
> conectaba 2 pestañas (Dashboard y Reservas); Precios/Finanzas/Marketing/RRHH mostraban un
> placeholder **"Próximamente"** y la pestaña **"Nueva Reserva" no existía**. Los componentes
> reales (FinanzasTab, MarketingTab, PricingManager, RRHHTab, TareasTab) **estaban copiados del
> proyecto TS pero huérfanos** — nunca se importaban. No era que estuvieran rotos: nunca se
> renderizaban. El proyecto TS de referencia vive en `/home/conde/classvip-live-correct2`.

#### Qué se hizo

| Capa | Archivo(s) | Qué se hizo |
|---|---|---|
| **Frontend** | `frontend/src/features/admin/pages/Admin.tsx` | Reemplazado el stub por el **Admin real del TS** (974 líneas): 8 pestañas conectadas de verdad (Dashboard, Reservaciones, **Nueva Reserva**, Tareas, Finanzas, Marketing, RRHH, Configuración/Precios), sidebar con grupos OPERACIONES/ANALYTICS/EQUIPO, branding, navegación móvil. Adaptado al contrato Python: el `QuickBookingTab` ahora pega a `/api/v1/admin/bookings` (snake_case, precios en **centavos**, `payment_method` en vez de `status`), lee la respuesta `{booking, email_sent}` (sin `{success,data}`), carga cuentas desde el **array pelado** de `/api/v1/admin/accounts` (mapea `balance_cents`→`balanceCents`), y enlaza servicios a cuenta vía `POST /api/v1/admin/accounts/{id}/bookings` con `{booking_id}`. Lleva `// @ts-nocheck` como el resto de los componentes copiados. |
| **Backend (schema)** | `backend/app/schemas/booking.py` | Nuevos `CreateManualBookingRequest` (incluye `payment_method: none\|cash\|stripe`, `send_confirmation`, `send_payment_link`, items en centavos) y `ManualBookingResponse` (`{booking, payment_method, email_sent}`). Añadido `from typing import Literal`. |
| **Backend (servicio)** | `backend/app/services/booking.py` | Nuevo `BookingService.create_manual(data, status)` — mismo patrón de reintento de código de confirmación que `create_draft`, pero `source=ADMIN`, status parametrizable y **sin** validar fecha futura (el admin puede registrar servicios del mismo día). |
| **Backend (endpoint)** | `backend/app/api/v1/admin.py` | Nuevo `POST /api/v1/admin/bookings` (protegido con `get_current_admin`). Mapea el método de pago a status: **none→OFFLINE_HOLD, cash→CONFIRMED, stripe→PENDING_PAYMENT**. Email best-effort (T8): cash+send_confirmation → `send_booking_confirmation`; stripe+send_payment_link → `send_booking_pending`. Un fallo de email reporta `email_sent:false` pero **no** tumba la reserva. |

#### Cómo crea el admin reservas SIN pago (lo que pidió Marlon)
En la pestaña **Nueva Reserva**, el admin elige método de pago:
- **Save only** → reserva en `OFFLINE_HOLD`, sin email. (reserva directa sin cobrar)
- **Paid in cash** → reserva `CONFIRMED` + email de confirmación. (pagada offline, sin Stripe)
- **Send Stripe Link** → reserva `PENDING_PAYMENT` + email con link de pago.
También soporta **"Add to Account"**: crea el servicio y lo carga a una cuenta abierta existente.

#### Verificación
- `tsc --noEmit` → **0 errores**.
- Live contra Supabase real: `POST /api/v1/admin/bookings` con `payment_method:cash` → **201**, `status:CONFIRMED`, `source:ADMIN`, `total_amount:15000`, `email_sent:false` (sin RESEND key real). Fila de prueba borrada después.
- 5 tests nuevos en `test_admin_booking_actions.py`: requiere auth (401 sin login), cash→CONFIRMED, none→OFFLINE_HOLD, stripe→PENDING_PAYMENT, y que la reserva manual aparece en la lista del admin.

**Estado de tests tras Fase 12.6:** 53 tests (48 + 5 nuevos de reserva manual), todos verdes.

#### ⚠️ Notas para el próximo agente
- El `QuickBookingTab` con `payment_method:'stripe'` crea la reserva en `PENDING_PAYMENT` y manda el email "pending" (`send_booking_pending`). **No genera todavía un link real de Stripe Checkout** — eso requiere construir la generación+envío del link (reusar `StripeService.create_payment_intent` + un template con la URL de checkout). Cash y Save Only sí están 100% funcionales.
- `AdminBookings` recibe props `onDataChanged` e `initialSearchQ` desde el nuevo `Admin.tsx`; si esa búsqueda-semilla no funciona, revisar que el componente acepte esos props (no rompe nada si los ignora).
- El funnel **público** sigue pendiente (ver Fase 12.5 "Lo que FALTA") — esto fue solo el admin.

### 📐 Fase 13 (planificación) — Lógica del negocio + auditoría de gaps (22 jun 2026)

> **Esta sección es CONCEPTO + VALIDACIÓN, no implementación.** Marlon pidió explícitamente:
> "antes de proceder, entiendas la lógica del negocio y que todas las funciones conecten de manera
> correcta y funcional. No tiene que hacerse todo junto." Aquí queda fijado **el propósito real del
> producto** para que ningún agente vuelva a perder el concepto. Lo que sigue son hallazgos auditados
> contra el código real (no suposiciones), con su evidencia.

#### 🧠 La lógica del negocio (cómo opera ClassVIP de verdad)

1. **Un round trip = DOS servicios operativos**, no uno. Ejemplo real dado por Marlon:
   - **Llegada (arrival):** 23 jun, vuelo `212`, aterriza 4:00 PM → servicio de llegada el 23 a las 16:00.
   - **Salida (departure):** Hotel Sandos, vuelo `AA1212` despega 3:00 PM → **el pickup se pone 3 horas antes** → salida 12:00 PM del Hotel Sandos al aeropuerto.
   - Operativamente la empresa ve **dos eventos en su agenda** (una llegada y una salida en fechas/horas distintas), aunque comercialmente sea una sola reserva round trip.
2. **Esta info es CRÍTICA y debe verse detallada en 3 lugares:** (a) al **buscar** un servicio, (b) en los **PDFs**, (c) al **abrir** la reservación (lectura fácil).
3. **Pagos en efectivo y crédito abierto** son flujo principal, no excepción:
   - Muchos clientes **pagan en efectivo** → se guarda **reserva directa** saltando el funnel de pago.
   - Otros tienen **crédito abierto** y **pagan a su salida / al final** → hay que poder **marcar después "ya pagó"**.
4. **Precios por zonas** es pieza central de la operación (cotizar SJD → cada hotel/zona).
5. **PDF para subcontratar:** a veces el servicio se pasa a **otra empresa** que lo ejecuta. Ese PDF debe traer **TODOS los datos del servicio detallados PERO SIN ningún precio**.

#### 🔍 Auditoría: qué existe, qué falta (validado contra el código, 22 jun 2026)

| # | Necesidad del negocio | Estado real | Evidencia |
|---|----------------------|-------------|-----------|
| 1 | Campos de llegada y salida en la reserva | ✅ Existen | `models/booking.py:90-96` tiene `flight_number/arrival_time/arrival_airline` (llegada) y `departure_flight_number/departure_time/departure_airline` (salida) + `pickup_time` |
| 2 | La lista del admin separa llegada vs salida | ✅ Sí | `AdminBookings.tsx:244-245,405` filtra por `operationType` arrival/departure |
| 3 | Pickup = 3h antes del vuelo de salida (auto) | ❌ No automático | `pickup_time` y `departure_time` son campos manuales independientes; no hay cálculo |
| 4 | PDF con datos completos del servicio | ⚠️ Incompleto | `templates/pdfs/booking_confirmation.html` solo muestra 1 vuelo, pickup, dropoff; **no muestra la pierna de salida** (departure_flight/time/airline) ni airline de llegada ni pickup_time |
| 5 | **PDF SIN precios para subcontratar** | ❌ No existe | El template **siempre** imprime `Total: $...` (`booking_confirmation.html:40`); hay 1 sola plantilla y 1 solo endpoint `GET /api/v1/bookings/{id}/pdf` |
| 6 | Crear reserva directa (efectivo / sin pago) | ✅ Existe (Fase 12.6) | `POST /api/v1/admin/bookings`: none→OFFLINE_HOLD, cash→CONFIRMED, stripe→PENDING_PAYMENT |
| 7 | Marcar después "ya pagó" | ⚠️ Parcial | `UpdateBookingRequest.status` permite cambiar estado vía `PATCH /api/v1/admin/bookings/{id}`, pero **no hay botón/acción clara "Marcar como pagado"** en el admin |
| 8 | Crédito abierto (paga al final) | ⚠️ Existe infra, falta validar flujo | Tablas `client_accounts/account_charges/account_payments` + endpoints de cuentas existen; falta verificar el flujo completo reserva→cargo→saldo→pago de punta a punta |
| 9 | Precios por zonas en el admin | ⚠️ Existe pero **vacío** | `PricingManager.tsx` SÍ está montado en la pestaña "Configuración" y pega a `/api/v1/pricing/{areas,rules,extras,hotels}` (los 4 responden 200), **pero `areas` está vacío (`total:0`)** → por eso "no se ve" |
| 10 | Zona pricing alimenta la cotización | ❌ Desconectado | Crear reserva manual usa precios escritos a mano; el pricing por zona no auto-cotiza (funnel público sigue desconectado, ver Fase 12.5) |

#### 🎯 Plan por fases propuesto (NO ejecutado aún — esperar luz verde de Marlon)

Orden sugerido por impacto operativo. Cada fase se valida y se marca aquí al terminar.

- **✅ F13.1 — PDF operativo + PDF sin precio (subcontratación). HECHO (22 jun 2026).** Ver detalle en "Fase 13.1 completada" más abajo. *(Gap #4, #5 — el más pedido explícitamente.)*
- **✅ F13.2 — Marcar "pagado" + flujo crédito abierto. HECHO (22 jun 2026).** Ver detalle en "Fase 13.2 completada" más abajo. *(Gap #7, #8.)*
- **✅ F13.3 — Detalle de reserva legible (llegada/salida) en búsqueda y al abrir. HECHO (22 jun 2026).** Ver detalle en "Fase 13.3 completada" más abajo. *(Gap #2 refinado, #4.)*
- **✅ F13.4 — Pricing real por zona/hotel conectado al formulario público. HECHO (23 jun 2026).** Ver detalle en "Fase 13.4 completada" más abajo. *(Gap #9.)*
- **F13.4 — Precios por zona usables.** Cargar/gestionar áreas y reglas; idealmente auto-cotizar al crear reserva. *(Gap #9, #10.)*
- **F13.5 — (opcional) pickup auto 3h antes** del vuelo de salida como default editable. *(Gap #3.)*

#### ✅ Fase 13.1 completada — PDF operativo + orden de servicio sin precios (22 jun 2026)

**Qué se construyó:**

| Capa | Archivo | Cambio |
|------|---------|--------|
| Endpoint | `api/v1/bookings.py` | `GET /bookings/{id}/pdf` ahora acepta `?precios=true|false`. `false` = orden de servicio para subcontratar (filename `...-orden-servicio.pdf`). |
| Endpoint | `api/v1/bookings.py` | `_booking_to_dict` ampliado: ahora pasa **toda** la data operativa (pierna de llegada Y salida, `pickup_time`, `trip_type`, teléfono, items, subtotal/descuento/tax). Antes solo pasaba 1 vuelo y total. |
| Servicio | `services/pdf.py` | `generate_booking_confirmation(booking, show_prices=True)`. Convierte centavos→USD solo cuando `show_prices`. |
| Template | `templates/pdfs/booking_confirmation.html` | Reescrito: bloque **LLEGADA** (verde) y bloque **SALIDA** (rojo) separados, cada uno con vuelo/hora/aerolínea; pickup destacado en salida; precios **condicionales** (`{% if show_prices %}`); badge "ORDEN DE SERVICIO" + nota "sin precios" cuando aplica. |
| Frontend | `admin/components/AdminBookings.tsx` | `downloadPdf(withPrices)`; **dos botones** en el detalle: "PDF / Print" (con precios) y "PDF sin precio" (orden de servicio). |

**Lógica de negocio cubierta:** un round trip se ve con sus DOS piernas (llegada vuelo 212 16:00 / salida AA1212 con pickup 12:00 = 3h antes). El PDF de subcontratación lleva **todos los datos del servicio pero CERO precios** — exactamente lo pedido para pasar el servicio a otra empresa.

**Validación:**
- 5 tests nuevos en `app/tests/test_pdf.py` (template con/sin precios + endpoint con/sin precios). La aserción clave: la orden de servicio contiene todos los datos operativos y **ningún `$` ni total**.
- Suite completa: **58 tests verdes** (53 + 5). `tsc --noEmit` = 0 errores.
- Prueba en vivo contra Supabase real: creado round trip, descargados ambos PDFs (válidos `%PDF`), datos de prueba **borrados** después.

**Nota para el próximo agente:** las ubicaciones (`pickup_location`/`dropoff_location`) son **una sola por reserva** en el modelo; para un round trip ambas piernas comparten esos campos. Si en el futuro se necesita origen/destino distinto por pierna, hay que extender el modelo (hoy no lo pidió el negocio).

##### 🔧 F13.1 — corrección (mismo día): ruta por pierna + pickup como hora de servicio

Marlon señaló (con razón) que la primera versión del PDF **no decía de dónde sale cada pierna** (Aeropuerto SJD / el hotel) ni trataba el **pickup time como la hora del servicio** — y eso es imprescindible en transporte. Causa: el PDF mostraba los vuelos pero no la RUTA origen→destino de cada servicio.

**Qué se corrigió:**
- Nuevo `services/booking_operations.py` — **espejo en Python** de `frontend/.../lib/booking-operations.ts` (`build_operation_legs`, `subtract_three_hours`). Descompone la reserva en piernas con: `origin`, `destination`, `service_time`, `flight`, `airline`, `service_date`.
  - **Llegada** (`route='airport-hotel'` o roundtrip): Aeropuerto → Hotel; hora de servicio = `booking_time`/`arrival_time`.
  - **Salida** (`route='hotel-airport'`, o inversa en roundtrip): Hotel → Aeropuerto; **hora de servicio = `pickup_time`** (o `departure_time` − 3h si no hay pickup).
  - Round trip → genera AMBAS piernas (la salida puede ir en `metadata.departureDate`).
- `_booking_to_dict` ahora pasa `route` y `metadata`.
- Template: cada pierna muestra un bloque con **HORA DE SERVICIO destacada** (en salidas etiquetada "Hora de PICKUP (hora del servicio)") y la **RUTA `origen → destino`** explícita, además de vuelo/aerolínea/hora de vuelo.
- **Importante:** la lógica de dirección sale del campo `route` y de `trip_type`, igual que el frontend — NO se adivina invirtiendo pickup/dropoff (salvo el caso roundtrip, donde sí se invierte porque el pickup de ida es el aeropuerto). Mantener ambos archivos sincronizados si cambia uno.
- Cálculo automático **pickup = vuelo − 3h** ya existe (en `subtract_three_hours`), como en el TS. Eso adelanta parte de la F13.5.

**Validación:** 8 tests en `test_pdf.py` (incluyen ruta correcta por pierna, pickup como hora de servicio, salida de una vía, y auto-3h). Suite completa **61 verdes**. Probado en vivo contra Supabase (round trip Aeropuerto SJD ↔ Hotel Sandos) y datos borrados.

#### ✅ Fase 13.3 completada — detalle de reserva legible y profesional, llegada/salida con ruta (22 jun 2026)

Marlon pidió que la vista de detalle de una reserva (admin) y la lista de búsqueda mostraran toda la información pero **mejor organizada y más profesional**, en línea con el rediseño del PDF (F13.1).

**Bug real encontrado y corregido de paso:** `mapBooking` en `AdminBookings.tsx` **nunca mapeaba el campo `metadata`** del backend. Como `expandBookingOperations` (en `booking-operations.ts`) necesita `booking.metadata.departureDate` para saber la fecha de la pierna de SALIDA en un round trip, la condición `isRoundTrip && departureDate` siempre era falsa — **la pierna de salida de los round trips nunca aparecía en la lista del admin**. Se corrigió mapeando `metadata`, además de `arrival_airline`/`departure_airline` (existían en el backend desde F13.1 pero no se mapeaban al frontend).

**Qué se cambió:**

| Archivo | Cambio |
|---------|--------|
| `admin/lib/booking-operations.ts` | Cada `AdminOperationEvent` ahora incluye `origin`, `destination` y `airline`, calculados con la **misma lógica que `booking_operations.py`** (llegada = aeropuerto→hotel; salida = hotel→aeropuerto, invertida en roundtrip) y los mismos fallbacks ("Aeropuerto" / "Hotel / Pickup"). |
| `admin/components/AdminBookings.tsx` (tipo `Booking` + `mapBooking`) | Se agregan `arrivalAirline`, `departureAirline`, `metadata` — antes no llegaban al frontend. |
| `admin/components/AdminBookings.tsx` (tabla de búsqueda + tarjetas mobile) | Columna "Operación" → **"Ruta"**: ahora muestra `origen → destino` real (nombres de hotel/aeropuerto) en vez de una etiqueta genérica ("Airport -> Hotel"). |
| `admin/components/AdminBookings.tsx` (`BookingDetailView`) | "Operational Timeline" rediseñada: cada pierna es una tarjeta con borde de color (azul llegada / naranja salida), bloque navy/dorado con la **hora de servicio destacada** (etiquetado "Hora de PICKUP" en salidas — igual que el PDF), línea de **ruta `origen → destino`** con flecha, y vuelo+aerolínea. Se eliminó la tarjeta "Flight Dossier" y las filas pickup/dropoff de "Locations" porque quedaban duplicadas con la nueva vista por pierna — la info sigue toda presente, solo que en un solo lugar y no repetida. |

**Validación:** `tsc --noEmit` = 0 errores. No se tocó el backend en esta fase (los campos ya existían en `BookingResponse`, solo faltaba mapearlos en el frontend).

**Pendiente real (no bug, limitación conocida):** igual que en F13.1, el modelo tiene **una sola** ubicación pickup/dropoff por reserva; para round trips funciona porque la salida es la ruta inversa, pero un hotel de salida distinto al de llegada en la misma reserva requeriría extender el modelo.

#### 🔧 Fase 13.3 — corrección real (22 jun 2026): la SALIDA no era un bug de mapeo, era un bug de **datos nunca guardados**

Marlon probó con una reserva real (round trip, llegada 23, salida 30) y reportó que la SALIDA **no aparecía en ningún lado** (ni lista ni detalle) y que el detalle no mostraba "toda la información" — la corrección de arriba (mapear `metadata` en el frontend) **no fue suficiente**, porque el problema real estaba más arriba en la cadena:

**Causa raíz (confirmada leyendo el código, no adivinada):**
1. `metadata.departureDate` es la **única** forma de guardar una fecha de salida distinta a `booking_date` (Booking no tiene columna `departure_date`). Pero **ningún schema de request la exponía**: ni `CreateBookingRequest` (público), ni `CreateManualBookingRequest` (admin → Quick Booking), ni el `UpdateBookingRequest` real (PATCH admin). Resultado: `metadata` quedaba `NULL` siempre, sin importar qué llenara el usuario.
2. El formulario de **Quick Booking** del admin (`Admin.tsx`) sí tiene un campo "Departure Date" en pantalla (`form.departureDate`) — pero el payload que se construye para `POST /api/v1/admin/bookings` (líneas ~227-257) **nunca lo incluía**. El usuario llenaba la fecha, se perdía silenciosamente antes de salir del navegador. Esta es la reserva de prueba que hizo Marlon — se creó vía este formulario.
3. Bug secundario en el frontend (`booking-operations.ts`): aun si `metadata.departureDate` existiera, la pierna de SALIDA de un round trip solo se generaba si `isRoundTrip && departureDate` — sin fallback. El equivalente en Python (`booking_operations.py`, `_departure_date_from_metadata(...) or arrival_date`) sí tenía fallback a la fecha de llegada. Es decir, el backend (PDF) era más tolerante que el admin (pantalla).

**Qué se corrigió (backend):**
- `schemas/booking.py`: se agregó `departure_date: str | None` a `CreateBookingRequest`, `CreateManualBookingRequest` y al `UpdateBookingRequest` real (el de la línea ~229; **ojo:** hay una clase duplicada `UpdateBookingRequest` en la línea ~22 que Python sobreescribe — es código muerto inalcanzable, no se tocó por estar fuera de alcance de este fix, pero es una trampa para el próximo agente que la edite pensando que es la activa).
- `services/booking.py`: nuevo helper `_build_metadata(trip_type, departure_date)` → `{"departureDate": ...}` solo si `trip_type == "roundtrip"` y hay fecha. Se usa en `create_draft()` y `create_manual()`. En `update()` se manejó aparte (no es columna directa): se extrae `departure_date` del `model_dump(exclude_unset=True)` y se mergea dentro de `metadata_` existente (sin pisar otras claves que pudiera tener).
- 4 tests nuevos en `test_admin_booking_actions.py`: round trip guarda `metadata.departureDate`; un oneway NO genera metadata aunque se mande por error; PATCH puede agregar/corregir `departure_date` después de creada la reserva. Suite completa: **65 tests verdes** (61 + 4), `--no-cov` exit 0.

**Qué se corrigió (frontend):**
- `Admin.tsx` (Quick Booking): el `body` que se envía a `/api/v1/admin/bookings` ahora incluye `departure_date` cuando `tripType === 'roundtrip'` y el campo tiene valor.
- `booking-operations.ts` (`expandBookingOperations`): la pierna de SALIDA en round trip ahora se genera siempre que `isRoundTrip` sea true, usando `departureDate || arrivalDate` como fecha — igual fallback que `booking_operations.py`, para que reservas viejas (creadas antes de este fix, sin metadata) sigan mostrando la pierna de salida en vez de desaparecer.
- `AdminBookings.tsx` (`EditBookingForm`): se agregó un campo **"Departure date"** (solo visible si `isRoundTrip`) en la tarjeta "Departure leg", que lee/escribe `metadata.departureDate` vía PATCH. Esto es necesario para **corregir reservas ya creadas** (como la de prueba de Marlon) sin tener que borrarlas y recrearlas.
- `tsc --noEmit` = 0 errores.

**⚠️ Acción pendiente para la reserva de prueba existente de Marlon:** la reserva que ya creó (llegada 23, salida 30) se guardó **antes** de este fix, así que su `metadata` sigue en `NULL` en la base de datos real. Con el fallback nuevo del punto anterior, la pierna de SALIDA **ya debería aparecer** (con fecha = la de llegada, el 23, porque no hay mejor dato). Para que muestre la fecha correcta (30), hay que abrir esa reserva en el admin → Edit → llenar el nuevo campo "Departure date" con el 30 → guardar. No se corrigió automáticamente en la base de datos porque no se debe escribir directo a producción sin que Marlon lo confirme.

**🚨 Hallazgo nuevo, NO corregido — requiere decisión de Marlon antes de tocarlo:** mientras se investigaba esto se encontró que el **funnel público de reservas del sitio** (`frontend/src/features/booking/pages/Book.tsx`, y aparentemente también `Checkout.tsx`/`Confirmation.tsx`/`CheckoutSuccess.tsx`) tiene DOS problemas independientes y graves:
1. Llama a `${getApiBaseUrl()}/api/bookings` (sin `/v1`) — esa ruta **no existe** en este backend (confirmado con `curl`: 404; la ruta real es `/api/v1/bookings`, que sí responde).
2. El payload que construye es **camelCase** (`bookingDate`, `pickupLocation`, `tripType`, `departureDate`, etc.) — el backend actual (FastAPI/Python) espera **snake_case** (`booking_date`, `pickup_location`, `trip_type`...). Pydantic ignora silenciosamente los campos que no reconoce, así que aunque se arreglara la URL, el `POST` fallaría con 422 por falta del campo requerido `booking_date`.

Esto sugiere que `Book.tsx` es un remanente de un backend anterior (Node/TS, de ahí el camelCase) que nunca se migró al backend Python actual — **el funnel de reservas del sitio público probablemente no puede crear una reserva real hoy**. No se tocó en esta sesión porque: (a) no es lo que reportó Marlon (su reserva de prueba se hizo vía el panel admin, que sí funciona y ya quedó corregido arriba), y (b) el alcance del fix es mucho mayor (rehacer el payload completo de 4 archivos, no solo agregar un campo) y merece su propia fase con luz verde explícita, no un parche de paso.

#### ✅ Fase 13.2 completada — "Marcar pagado" + flujo de crédito abierto validado (22 jun 2026)

**Gap #7 — Acción "Marcar pagado" en la reserva.** Antes solo existía "Confirm (offline)" que cambiaba el estado a CONFIRMED pero **no registraba ningún pago** (por eso un cobro en efectivo no aparecía en Finanzas). Ahora hay una acción dedicada que pone la reserva en **PAID y crea un registro en `payments`** (status COMPLETED), que es justo lo que la pestaña Finanzas usa para "Cobrado Mes/Hoy".

- **Backend:**
  - `schemas/booking.py` → nuevo `MarkPaidRequest` (`method`: cash/bank_transfer/card/manual; `amount_cents` opcional = total de la reserva; `reference`, `notes`).
  - `services/booking.py` → nuevo `BookingService.mark_paid()`. Permitido desde DRAFT/PENDING_PAYMENT/OFFLINE_HOLD/CONFIRMED; **rechaza 409 si ya está PAID** (evita duplicar el pago) o si está CANCELLED/COMPLETED. Mapea el método a `PaymentProvider` (cash→CASH, bank_transfer→BANK_TRANSFER, card/manual→MANUAL). Crea el `Payment` con `completed_at=now`, monto = total (o el monto enviado).
  - `api/v1/admin.py` → nuevo `POST /api/v1/admin/bookings/{id}/mark-paid`.
  - 4 tests nuevos en `test_admin_booking_actions.py`: registra pago + status PAID por el total; acepta monto/referencia custom; rechaza doble cobro (409); rechaza cancelada (409).
- **Frontend (`AdminBookings.tsx`):**
  - Botón **"Marcar pagado"** (dorado) en las acciones del detalle, visible salvo cuando la reserva ya está PAID/CANCELLED/COMPLETED. Pregunta el método de cobro (1 efectivo / 2 transferencia / 3 tarjeta) y registra el total. El estado de pago del detalle ya muestra "Pagado" porque lee `payments[].status === 'COMPLETED'`.

**Gap #8 — Flujo de crédito abierto, validado de punta a punta.** La infra (`AccountService`, endpoints de cuentas, recálculo de balance) ya existía y estaba parcialmente probada; se agregó un test que recorre el **flujo completo real**: crear cuenta → cargar 2 reservas → saldo sube a 10000 → abono parcial (4000) → saldo 6000 → abono del resto → saldo 0 → marcar un cargo como PAID sin alterar el balance. (`test_open_credit_full_flow_booking_to_settled` en `test_admin_accounts.py`.) Confirmado que la UI (`AccountsTab.tsx`) ya expone todas las acciones: crear cuenta, cargo manual, cargar reserva, registrar abono, cambiar estado de cargo.

**Validación:** suite backend **70 tests verdes** (`pytest --no-cov`), `tsc --noEmit` 0 errores, y prueba end-to-end contra el servidor vivo: reserva OFFLINE_HOLD → `mark-paid` (efectivo) → PAID con un Payment COMPLETED de 15000; segundo intento → 409. El pago alimenta Finanzas (filtra `status==COMPLETED` por `completed_at`).

**Diferencia clave Confirm vs Marcar pagado (para no confundir):** *Confirm (offline)* deja la reserva CONFIRMED sin registrar dinero — sirve para "cliente confirmado, cobro pendiente/aparte". *Marcar pagado* deja PAID y **sí registra el cobro** en Finanzas. Ambos botones conviven.

#### 🔧 Fase 13.3 — segunda corrección real (22 jun 2026): bug de zona horaria, fechas se mostraban UN DÍA ANTES en todo el admin

Después del fix de `departure_date` arriba, Marlon volvió a probar (reserva real: llegada 23, salida 30) y reportó que **seguía mal**: la lista decía "el servicio es para mañana" pero al abrir el detalle decía **"llega 22 y salida 22"** — ambas fechas mal, no solo la de salida. Esto ya no era el bug de metadata (ese solo afectaba la fecha de SALIDA en round trips); era un bug distinto que afectaba **cualquier fecha mostrada en el admin**, incluida la de llegada.

**Causa raíz (confirmada y reproducida con Node, no adivinada):** `AdminBookings.tsx` tenía una función `fmt(d)` usada en **8 lugares** (lista, tarjetas mobile, detalle, formulario de edición, impresión) que hacía:
```ts
new Date(d).toLocaleDateString('en-US', {...})
```
`d` es un string solo-fecha tipo `"2026-06-23"`. El spec de JS (ECMA-262) dice que un string así se parsea como **medianoche UTC**, no medianoche local. Pero `.toLocaleDateString()` lo muestra en la **zona horaria local del navegador**. Los Cabos/México está en UTC-7 — medianoche UTC del 23 son las 17:00 del **22** en hora local. Resultado: el admin abierto desde una computadora en México siempre mostraba la fecha real **menos un día**. Reproducido con Node simulando `TZ=America/Mazatlan`:
```
BUGGY  (fmt viejo): Jun 22, 2026   ← para booking_date = "2026-06-23"
FIXED  (fmt nuevo): Jun 23, 2026
```
El mismo patrón exacto estaba duplicado en `AccountsTab.tsx` (`formatDate`, usado para mostrar la fecha de servicio de los cargos a cuenta).

El proyecto **ya tenía la solución correcta** para este problema en otro archivo (`admin/lib/admin-date.ts` → `addLocalDays`, `monthStartKey`, etc.), que construyen el `Date` con año/mes/día explícitos a mediodía en vez de parsear el string ISO directamente — `fmt()` simplemente no seguía ese patrón ya establecido.

**Qué se corrigió:**
- `admin-date.ts`: nueva función exportada `parseDateOnlyAsLocalNoon(value)` — parsea los dígitos YYYY-MM-DD y construye el `Date` con el constructor `(año, mes, día, 12, 0, 0, 0)`, que es local por definición y no se puede correr de día sin importar la zona horaria del navegador.
- `AdminBookings.tsx`: `fmt()` ahora usa `parseDateOnlyAsLocalNoon` antes de formatear. Afecta los 8 call-sites de una sola vez (lista, tarjetas, detalle, formulario de edición, impresión) sin tocar cada uno.
- `AccountsTab.tsx`: mismo fix en `formatDate()` (usado para fechas de servicio de cargos a cuenta).

**Validación:** reproducido el bug y el fix con Node bajo `TZ=America/Mazatlan` (ver arriba — confirma el "Jun 22" exacto que reportó Marlon). `tsc --noEmit` = 0 errores. Suite backend sin cambios (este bug era 100% frontend de visualización, no tocó datos).

**Importante para el próximo agente:** si se agrega una nueva pantalla que muestre `booking_date`/`serviceDate`/cualquier fecha solo-fecha (`YYYY-MM-DD`, sin hora), **nunca** hacer `new Date(stringSoloFecha)` directo — siempre usar `parseDateOnlyAsLocalNoon` de `admin-date.ts`. `fmtDateTime` (para timestamps reales con hora, como `createdAt`) SÍ puede usar `new Date(d)` normal porque esos strings traen información de hora/zona y mostrarlos en hora local del navegador es lo correcto, no un bug.

#### 🚨 Fase 13.3 — causa raíz REAL de "sigue saliendo mal" (22 jun 2026): el backend nunca se reinició

Marlon volvió a probar después de los dos fixes anteriores y reportó, con razón, que **seguía mal** y que "no analizas antes de hacer las cosas". Tenía razón: los dos fixes de arriba estaban bien escritos en el repo, pero **el proceso de `uvicorn` corriendo en el WSL llevaba corriendo desde antes de que se escribiera el fix de `departure_date`**, y se había arrancado **sin `--reload`**. Es decir: cada reserva que Marlon creó para probar el fix se procesó con el código VIEJO (sin `departure_date` en el schema, sin `_build_metadata`), porque el servidor nunca recargó los archivos editados.

**Cómo se confirmó (no se asumió):**
1. `ps`/`/proc/<pid>/cmdline` del proceso uvicorn (`PID 20158`) mostró `--host 0.0.0.0 --port 8000` **sin `--reload`**.
2. `lstart` del proceso: arrancó **18:42:08**. `stat` de `backend/app/services/booking.py` y `schemas/booking.py`: editados **19:24–19:25**, es decir **después** de que el proceso ya estaba arriba.
3. Prueba directa contra el servidor vivo: `POST /api/v1/admin/bookings` con `trip_type=roundtrip` + `departure_date=2026-06-30` → respondió `"metadata": null` (el bug seguía vivo en runtime aunque el archivo en disco ya tenía el fix).
4. Se mató el proceso viejo y se reinició con `uvicorn ... --reload` (para que esto no se repita). Se repitió la MISMA prueba → ahora respondió `"metadata": {"departureDate": "2026-06-30"}`. Confirmado con datos reales, no con tests unitarios.
5. El frontend (Vite) **no tenía este problema** — `/tmp/vite.log` muestra `hmr update` picking up `AdminBookings.tsx`, `AccountsTab.tsx`, `Admin.tsx` en los mismos timestamps en que se editaron (Vite usa file-watcher + HMR, no necesita reinicio manual como uvicorn sin `--reload`).
6. Se ubicaron en la base de datos viva las reservas reales que Marlon había creado de prueba (cliente "Second test", `booking_date = 2026-06-23`, `trip_type = roundtrip`, `metadata = null` — exactamente el síntoma reportado) y se corrigieron con `PATCH /admin/bookings/{id}` `{"departure_date": "2026-06-30"}`, usando el mismo fix ya validado. Ambas quedaron con `metadata.departureDate = "2026-06-30"`. No requieren que Marlon las recree.

**Lección para cualquier agente futuro en este proyecto:** un fix validado con tests unitarios y `tsc --noEmit` **no está validado en producción/local hasta que se prueba contra el servidor realmente corriendo**, con datos reales, end-to-end. Si el usuario dice "sigue igual" después de un fix que pasó tests, **lo primero que hay que descartar es que el proceso vivo no tenga el código nuevo** (servidor sin `--reload`, build viejo, caché de browser, deploy no disparado) — no asumir que el código está mal otra vez. El backend de este proyecto ahora corre con `--reload` para evitar que se repita este caso específico.

#### 🚨 Fase 13.3 — CUARTO bug real (22 jun 2026): el filtro de fecha del admin casi nunca encontraba nada

Después de reiniciar el backend, Marlon probó otra vez y reportó (con toda razón) que las reservas seguían "sin aparecer en sus fechas" y que **el filtrador de reservaciones no funciona**. Investigando desde cero (no asumiendo que ya estaba todo arreglado) se encontraron DOS bugs independientes en el filtrado por fecha, uno en frontend y otro en el backend:

**Bug 4a — frontend, `AdminBookings.tsx`:** el date-picker `dateFilter` (con el que el admin busca una reserva de un día específico) era **puramente un filtro del lado del cliente** sobre lo que ya se hubiera traído del servidor. La ventana que se pide al servidor (`date_from`/`date_to`) la decide únicamente `period` (Hoy/Semana/Mes/Custom) vía `getDateRange()` — `dateFilter` NUNCA se usaba para ampliar esa ventana ni estaba en las dependencias de `fetchBookings`. Si el admin dejaba `period = "Hoy"` (rango por defecto: hoy-120 días hasta hoy) y buscaba una reserva con fecha futura (p.ej. llegada el 23, hoy es el 22), esa reserva **nunca se traía del servidor** — el filtro mostraba 0 resultados aunque la reserva existiera. Fix: `fetchBookings` ahora amplía `date_from`/`date_to` para garantizar que cubran `dateFilter` cuando está fuera del rango de `period`, y `dateFilter` se agregó a las dependencias del `useCallback` para que dispare un nuevo fetch.

**Bug 4b — backend, `booking_service.list_paginated` (`backend/app/services/booking.py`), EL MÁS GRAVE:** la condición `Booking.booking_date <= date_to` compara una columna TIMESTAMP contra un parámetro DATE (sin hora). Postgres castea `date_to` a medianoche (`00:00:00`) de ese día. Como las reservas casi siempre se guardan con hora (mediodía local, etc.), **prácticamente ninguna reserva del día `date_to` pasaba ese filtro** — solo las que cayeran exactamente a medianoche. Esto significa que el filtro "Hoy" (`date_from == date_to == hoy`) llevaba roto desde siempre y mostraba 0 o casi 0 resultados sin importar cuántas reservas hubiera ese día. Fix: límite superior ahora exclusivo al día siguiente (`Booking.booking_date < date_to + timedelta(days=1)`), que sí incluye cualquier hora del día `date_to`.

**Validación:**
- Probado directo contra el servidor vivo: `GET /admin/bookings?date_from=2026-06-23&date_to=2026-06-23` antes del fix excluía una reserva con `booking_date = 2026-06-23T19:00:00Z` (19:00 > medianoche); después del fix la incluye (`total: 4`, las 4 reservas reales de prueba de Marlon entre ellas).
- Test nuevo anti-regresión: `test_list_bookings_date_filter_includes_exact_day` en `test_admin_bookings.py` — crea una reserva con hora explícita (no medianoche) y filtra por `date_from == date_to ==` su día exacto; falla con el código viejo, pasa con el fix.
- Suite completa: **65 tests, todos verdes** (`pytest --no-cov`). `tsc --noEmit`: 0 errores.

**Nota para el próximo agente:** este bug NO tenía ningún test que lo cubriera — no existía ningún test que filtrara por `date_from`/`date_to` antes de hoy. Si se toca el filtrado por fecha en el futuro, correr `test_list_bookings_date_filter_includes_exact_day` y pensar en términos de TIMESTAMP vs DATE: cualquier comparación de un campo con hora contra un límite superior tipo "día" debe ser exclusiva del día siguiente, nunca `<=` directo contra el DATE.

#### 🚨 Fase 13.3 — QUINTO arreglo (22 jun 2026): la vista por defecto no mostraba reservas FUTURAS

Auditando los cuatro bugs anteriores en busca de más casos del mismo tipo, se encontró un problema de diseño que explica directamente "no las encuentro en sus fechas": en `AdminBookings.tsx` el `period` por defecto era `'today'`, que pedía al servidor el rango `[hoy-120 días, hoy]` — **cero días hacia el futuro**. Para una empresa de transfers, donde casi TODAS las reservas activas son a futuro, abrir el panel mostraba solo lo de hoy/pasado: una reserva hecha para dentro de unos días simplemente no aparecía en la vista inicial. Además, el `period` solo controlaba el rango pedido al servidor pero **no había filtrado por rango del lado del cliente**, así que los botones Hoy/Semana/Mes no acotaban realmente lo mostrado (la sobre-descarga de -120 días filtraba reservas viejas a la vista).

**Qué se cambió en `AdminBookings.tsx`:**
- `period` por defecto: `'today'` → `'month'`. Al abrir el panel se ven las operaciones próximas.
- `getDateRange()` ahora es **rodante hacia adelante** desde hoy: `today` = `[hoy, hoy]`, `week` = `[hoy, hoy+6]`, `month` = `[hoy, hoy+30]` (antes eran semana/mes de calendario, que miraban hacia atrás). Lo operativamente relevante es lo que viene, no lo que ya pasó este mes.
- Filtrado por rango del lado del cliente: `filteredBookings` ahora acota por la **fecha de servicio** de cada pierna dentro de `[rangeFrom, rangeTo]` cuando el date-picker está vacío; si el date-picker tiene un día, ese manda (override). Así una reserva round trip muestra su LLEGADA en su día (23) y su SALIDA en el suyo (30), cada una visible cuando su fecha cae en el rango.
- Limpieza: se eliminaron los helpers muertos `weekStart`/`monthStart`/`monthEnd` y los imports `startOfCurrentWeekKey`/`monthStartKey`/`monthEndKey` que quedaron sin uso.

**Validación end-to-end (no solo unit tests):** se replicó la cadena COMPLETA del frontend (expandBookingOperations + filtro + fmt) en Node bajo `TZ=America/Mazatlan`, corriendo contra el servidor real con las reservas reales de Marlon. Resultado con la vista por defecto (`period=month`, sin filtro de día): las reservas "Second test" aparecen con **LLEGADA → "Jun 23, 2026"** y **SALIDA → "Jun 30, 2026"**, cada pierna en su día correcto. Filtrar por el 23 muestra las llegadas; filtrar por el 30 muestra las salidas. `tsc --noEmit`: 0 errores. Suite backend: 65 verdes.

**Resumen de la auditoría completa de fechas (clases de bug revisadas en todo el código):**
1. **TIMESTAMP vs DATE en el backend:** revisadas TODAS las comparaciones de `booking_date`. La única con `<=` directo era el filtro de `list_paginated` (arreglada). El dashboard (`get_dashboard_stats`) usa `func.date(booking_date)` que es correcto. La columna es `timestamptz` y las comparaciones usan la TZ de sesión consistentemente.
2. **`new Date(stringSoloFecha)` en el frontend:** revisados TODOS los usos en `features/admin`. Los únicos paths de display date-only eran `fmt` (AdminBookings) y `formatDate` (AccountsTab), ya arreglados con `parseDateOnlyAsLocalNoon`. El resto usa el truco de mediodía (`T12:00:00`) o opera sobre timestamps completos (correcto). `sameMonth`/`MarketingTab` reciben timestamps reales con hora, no date-only — sin bug.
3. **Filtros desconectados del fetch:** arreglado el date-picker (4a) y ahora el rango del period filtra también del lado del cliente.
4. **Proceso vivo con código viejo:** backend ahora con `--reload`.

#### ⚠️ Notas para el próximo agente (Fase 13)
- **No "arreglar" la lentitud local** tocando `database.py`: es latencia de red WSL→Supabase us-east-1. Decisión de Marlon: se resuelve **co-ubicando el deploy en us-east-1**, no cambiando el pool. El `NullPool` actual es a propósito (evita el error "prepared statement already exists" del transaction pooler).

#### ✅ Fase 13.4 completada — pricing real por zona/hotel conectado al formulario público (23 jun 2026)

El gap #9 no era "falta el módulo de pricing" — el módulo (modelos, servicio, endpoints, UI admin `PricingManager.tsx`) ya estaba completo y correcto. El problema real era doble: (1) las tablas `areas`/`hotels` del backend Python estaban vacías (nunca se cargó data real), y (2) el hook del formulario público `useBookingCatalog.ts` usaba 100% datos mock, sin llamar nunca al backend.

**Origen de la data real:** Marlon confirmó que el pricing real (zonas, hoteles, tarifas 1-5 pax vs. 6+ pax "sprinter") ya existe en el proyecto de producción `classvip-live-correct2` (Node + Prisma + Supabase Postgres). Se extrajo en modo solo-lectura vía `psql` directo contra esa base (sin escribir nada en producción), usando `SELECT ... row_to_json(...) ... json_agg(...)` por tabla, y se migró a la base propia del backend Python con `backend/scripts/migrate_pricing_from_live.py`.

**Resultado de la migración (verificado en vivo vía curl contra `http://localhost:8000/api/v1/pricing/*`):**
- Áreas: **6** (ej. "Cabo Pacific Area": one-way $130.00 / round-trip $234.00)
- Hoteles: **252**, agrupados por zona real
- Reglas de precio: **36** importadas, 2 omitidas (basura de pruebas: `passengers_min > passengers_max`)
- Extras: **16**

**Fix del frontend:** se reescribió `frontend/src/features/booking/hooks/useBookingCatalog.ts` para hacer `fetch()` real a `/api/v1/pricing/{areas,hotels,extras}` (vía `getApiBaseUrl()`), desempaquetando el envelope `{items: [...]}` y mapeando snake_case → camelCase con el mismo patrón de `PricingManager.tsx` (`mapArea`/`mapHotel`/`mapExtra`). Mantiene fallback estático de 3 hoteles solo si el fetch de hoteles falla o devuelve vacío (`hotelsError` para que la UI lo muestre). **`Book.tsx` no requirió ningún cambio** — su lógica de precio (incluida la regla 1-5 pax vs. 6+ pax sprinter) ya esperaba exactamente esta forma de datos.

**Validación:** `tsc --noEmit` sin errores en el archivo nuevo; `curl` confirmó 200 OK en los tres endpoints desde la URL configurada en `.env` del frontend (`VITE_API_URL=http://localhost:8000`); CORS (`ALLOWED_ORIGINS`) ya incluye `http://localhost:5173` (origen del dev server), así que el fetch directo desde el navegador no se bloquea.

#### ✅ Fase 13.4 — segunda parte (23 jun 2026): el servidor recalcula el precio de la reserva pública, no confía en el cliente

Al revisar el flujo de creación de reservas públicas se encontraron 3 bugs reales que hacían que **el formulario público `/book` nunca pudiera crear una reserva** (la cadena de submit estaba rota desde antes de esta sesión, no es algo que yo introduje):

1. **Mismatch camelCase vs snake_case:** `Book.tsx` mandaba `bookingDate`, `areaId`, `unitPrice`, etc. (camelCase), pero `CreateBookingRequest`/`BookingItemCreate` solo aceptaban snake_case (`booking_date`, `unit_price`...). Confirmado con un POST real: `422 Field required: body.booking_date` — el campo nunca llegaba.
2. **`total_price` nunca se mandaba:** el tipo `BookingLineItem` del frontend no tenía ese campo, pero el backend lo exige.
3. **Unidades de precio mezcladas:** el backend guarda TODO en centavos (igual que Stripe — confirmado en `email.py`: `total_amount / 100` para mostrar dólares). `Book.tsx` mandaba precios en **dólares** (ej. `130` en vez de `13000`), 100x menos de lo real.

**Fix aplicado:**
- `app/schemas/booking.py`: `CreateBookingRequest` y `BookingItemCreate` ahora usan `alias_generator=to_camel` + `populate_by_name=True` — aceptan camelCase (frontend) y snake_case (admin/tests) sin romper nada existente.
- Se agregó el campo `area_id` (`areaId`) a `CreateBookingRequest`: identifica qué zona eligió el cliente en el formulario público.
- `Book.tsx`: se agregó `totalPrice` a cada item y se convirtieron todos los precios a centavos antes de enviarlos (`Math.round(precio * 100)`).

**El fix real de seguridad — recalculo server-side (`BookingService.create_draft`):** si la request trae `area_id`, el servidor busca esa `Area` en su propia base de datos y **recalcula el precio del item TRANSPORTATION** con la misma regla de negocio (1-5 pax = tarifa normal, 6+ pax = tarifa sprinter si la zona la tiene configurada, si no cae a la normal) — **ignorando totalmente** el `unit_price`/`total_price` que mandó el cliente para ese item. Si no viene `area_id` (ej. reserva de solo actividades, sin transporte), no se toca nada — comportamiento idéntico al de antes, sin regresión.

**Validado en vivo (no solo unit tests):**
- POST manipulado mandando `unitPrice: 1, totalPrice: 1` con `areaId` de "Cabo Pacific Area" (one-way real = $130.00) → el booking se creó con `total_amount: 13000` ($130.00) — el servidor ignoró el precio falso del cliente.
- 8 pasajeros + roundtrip, zona sin tarifa sprinter configurada → cae correctamente a la tarifa roundtrip normal ($234.00) — misma regla que ya usa el frontend.
- Reserva sin `area_id` (solo actividad) → se respeta el precio del item, sin regresión.
- Suite completa de backend: **todos los tests verdes** (`......` 100%, cobertura 77.9%). `tsc --noEmit` en frontend: 0 errores.
- Reservas/clientes de prueba creados durante la verificación, eliminados de la base de datos al terminar.

**Importante — alcance de este fix (primera parte):** solo cubría el item `TRANSPORTATION`. Ver tercera parte abajo — ya se cerró también para `ACTIVITY`/`ADDON`/`COMBO`.

#### ✅ Fase 13.4 — tercera parte (23 jun 2026): cierre del hueco de precios en actividades y extras

Se agregó un campo `code` a `BookingItemCreate` (`app/schemas/booking.py`) que identifica el item en un catálogo server-side. `BookingService.create_draft` ahora recalcula también estos items, ignorando el precio del cliente cuando reconoce el código:

- **ADDON** (extras reales: baby seat, grocery stop, etc.): se busca el `code` contra la tabla `PricingExtra` real (ya migrada con los 16 extras) y se usa `price_cents` de la DB.
- **ACTIVITY** (camel, horseback, atv, skyBikes, rzr) y **COMBO/CRAZY_COMBO**: no existe tabla en DB para esto todavía, así que se agregó un catálogo fijo en `services/booking.py` (`ACTIVITY_PRICE_CENTS`, `COMBO_PRICE_CENTS`) que **debe coincidir exactamente** con los precios hardcodeados en `Book.tsx` — documentado en el comentario del código para que quien edite un precio en el frontend sepa que también debe actualizar el backend (mientras no se migre esto a una tabla real).
- `Book.tsx` ahora manda `code` en cada item (`act.id` para actividades, `'COMBO'`/`'CRAZY_COMBO'`, `ex.code` para extras) para que el servidor pueda cruzarlo.
- Si un item no manda `code` o el código no se reconoce, se respeta el precio del cliente sin cambios — mismo comportamiento que antes, sin romper nada.

**Validado en vivo:** ATV (`code: "atv"`) y Baby Seat (`code: "BABY_SEAT"`) mandados con precio manipulado a $0.01 cada uno → el servidor los corrigió a $120.00 c/u y $15.00 respectivamente (total $255.00 para 2 pax de ATV + 1 baby seat). Un item ADDON sin `code` reconocido mandado en $42.42 → se respetó tal cual (sin regresión). Suite completa de backend: 100% verde, cobertura 77.6%. `tsc --noEmit`: 0 errores. Reservas de prueba eliminadas al terminar.

#### 🔧 Fase 13.4 — corrección del modelo de negocio (23 jun 2026): no se venden actividades sueltas

Marlon aclaró: **no se vende ninguna actividad individual** — el producto es el **combo** (el cliente elige 2 actividades) o el **crazy combo** (elige 3), y el precio es siempre del combo completo, no de cada actividad. El código que acababa de escribir tenía una rama muerta que vendía actividades sueltas con precio individual (`ACTIVITY_PRICE_CENTS` con camel/horseback/atv/skyBikes/rzr) — nunca era alcanzable desde la UI real (`data.activities` solo se llena cuando hay `comboMode` activo, ver `toggleActivity` en `Book.tsx`), pero era código confuso y un catálogo de precios que no correspondía a ningún producto real.

**Limpieza aplicada:**
- `Book.tsx`: se eliminó la rama `else` que armaba items `ACTIVITY` sueltos; ahora solo existe el camino de combo/crazy combo, y el nombre del item incluye qué actividades eligió el cliente (ej. `"Crazy Combo: ATV, Camel, Horseback"`) para que quede claro en el admin/PDF qué seleccionó sin necesitar un item por actividad.
- `services/booking.py`: se eliminó el diccionario `ACTIVITY_PRICE_CENTS` y la rama `ACTIVITY` de `_recalculate_item_price` — solo queda `COMBO_PRICE_CENTS` (`COMBO`=$100/persona, `CRAZY_COMBO`=$125/persona).

**Validado en vivo:** combo de 3 personas (`CRAZY_COMBO`) mandado con precio manipulado a $1.25/persona → el servidor lo corrigió a $125.00/persona × 3 = $375.00 total. Suite de backend: 100% verde. `tsc --noEmit`: 0 errores.

**Lo que queda fuera (deuda técnica conocida, no urgente):** los combos no tienen tabla propia en DB — viven como constantes duplicadas en frontend (`Book.tsx`) y backend (`COMBO_PRICE_CENTS`). Si algún día cambia el precio del combo o crazy combo, hay que actualizar AMBOS lugares o se vuelve a abrir el hueco de manipulación. La solución correcta a futuro sería extender `Area`/`PricingExtra` o una tabla `ComboPricing` con su propio CRUD admin — no se hizo en esta sesión por alcance.

---

### ✅ Fase 14 — Backend de IA público (chat + voz) construido (23 jun 2026)

> Gap #10 de la tabla de módulos (sección 0, "AI Chat") estaba marcado como roto desde Fase 12.5:
> `ChatWidget.tsx` está montado en `Layout.tsx` (visible en TODO el sitio público) pero llamaba a
> rutas que no existían en el backend. Petición explícita de Marlon: el agente debe **contestar
> preguntas y dar precios**, y cuando el cliente quiera reservar, **dirigirlo a los 4 canales**
> (web, WhatsApp, email, iMessage) — **nunca tomar la reserva él mismo**. También debe **negarse a
> hablar de cualquier tema que no sea Class VIP Transfers o el destino Los Cabos**.

**Qué se construyó:**

| Capa | Archivo(s) | Qué hace |
|---|---|---|
| Conocimiento | `backend/app/lib/ai_knowledge.py` (nuevo) | Base de conocimiento bilingüe (actividades, ubicaciones, extras, beneficios, canales de reserva) + `get_knowledge_for_prompt()` que arma el bloque con **precios reales en vivo** (consulta `Area`/`PricingExtra` de la DB, no precios fijos en texto). Combos: `COMBO`=$100/persona, `CRAZY_COMBO`=$125/persona (mismos valores que `COMBO_PRICE_CENTS` de `services/booking.py` — **ver advertencia de sincronización en Fase 13.4**). |
| Schemas | `backend/app/schemas/ai.py` (nuevo) | `ChatRequest`/`ChatResponse`, `TranscribeResponse` — `alias_generator=to_camel` (mismo patrón que el resto del backend) para hablar camelCase con `ChatWidget.tsx`. |
| Servicio | `backend/app/services/ai.py` (nuevo) | `AIService`: system prompt bilingüe con **restricción estricta de tema** (solo empresa + Los Cabos; frase de rechazo fija para lo demás), detección de intención de reserva por regex (`BOOKING_INTENT_RE`) que alimenta `next_action` (`ask_more`/`proceed_to_payment`, contrato que el frontend ya esperaba sin cambios), respuestas locales gratis para saludos simples (`SIMPLE_LOCAL_REPLIES`, no gasta tokens), `chat()` (OpenAI `chat.completions`) y `transcribe()` (Whisper). Degradación elegante: si `OPENAI_API_KEY` está vacía, lanza `AIServiceError` y el endpoint responde 400 — el resto del sitio sigue funcionando. |
| Endpoints | `backend/app/api/v1/ai.py` (nuevo) | `POST /api/v1/ai/chat` (rate limit 20/min) y `POST /api/v1/ai/transcribe` (rate limit 10/min, máx 10MB de audio) — límites más estrictos que el resto porque cada llamada cuesta dinero (OpenAI). |
| Historial de conversación | `backend/app/models/ai_conversation.py` (ya existía, **huérfano desde el día 0** — tabla creada en la migración inicial pero nunca conectada a nada) | `AIService._get_history()`/`_save_turn()` ahora leen/escriben esta tabla real (`ai_conversations`) en vez de un diccionario en memoria del proceso — el historial de cada sesión **sobrevive a reinicios/deploys** de uvicorn, igual que cualquier otro dato del negocio. |
| Config | `backend/app/core/config.py`, `backend/.env.example` | `openai_api_key` (vacío = chat deshabilitado, NO está en el validador fail-fast de producción — la IA es opcional, a diferencia de Stripe/Resend), `openai_model` (`gpt-4o-mini`), `openai_whisper_model`, `openai_temperature`, `openai_max_tokens`. |
| Dependencias | `backend/pyproject.toml` | `openai>=1.50,<2.0` (cliente async) y `python-multipart>=0.0.12,<0.1` (requerido por FastAPI para `UploadFile`/`File()`; faltaba y tronaba la app al importar — se encontró y arregló en el camino). |

**Decisión deliberada de alcance:** a diferencia del `ai.service.ts` viejo (906 líneas, TS), este backend **NO crea ni edita reservas** — el agente solo informa y dirige a los 4 canales. Tampoco se portó el esquema de extracción estructurada (`ExtractedBookingData`) ni el catálogo de precios por actividad individual del TS (`ai-knowledge.ts` viejo tenía precios de camello/ATV/etc. sueltos) — eso **contradice el modelo de negocio real** (Fase 13.4: solo se vende combo de 2 o 3 actividades, nunca sueltas). Esto mantiene intacto el modelo de seguridad ya establecido: el precio final de cualquier reserva real siempre lo recalcula el servidor en `BookingService.create_draft`/`create_manual`, nunca un texto generado por IA.

**Validación:** 7 tests nuevos en `app/tests/test_ai.py` (sin API key → 400; saludo → respuesta local sin llamar a OpenAI; detección de intención de reserva → `next_action: proceed_to_payment`; mensaje >2000 chars → 422; el system prompt enviado a OpenAI contiene la restricción de tema; transcripción con/sin API key). Suite completa de backend: **77 tests verdes**, cobertura 77.8% (mínimo exigido 50%).

#### 🚨 Gap nuevo encontrado al cerrar esta fase — mismo patrón de bug que ya tenía `Checkout.tsx`

`ChatWidget.tsx` llama a `${getApiBaseUrl()}/api/ai/chat` y `/api/ai/transcribe` — **sin `/v1`** (líneas ~112 y ~142). El backend nuevo vive en `/api/v1/ai/chat` y `/api/v1/ai/transcribe`. En **dev** funciona porque el proxy de Vite reescribe `/api` → `/api/v1` (ver Fase 12.5, "Contrato de URL"); en un **build de producción** (estático, sin proxy de Vite) esto **rompe igual que ya rompía `Checkout.tsx`/`Confirmation.tsx`/`CheckoutSuccess.tsx`** (Fase 13.3, hallazgo del funnel público). **No se corrigió en esta sesión** — mismo motivo que el de `Checkout.tsx`: es un problema de un solo lugar (el prefijo `/api/v1` falta en 5 archivos del frontend en total, no solo en el nuevo ChatWidget) y merece corregirse junto con los demás de una sola vez, no parchado componente por componente. **Acción recomendada para el próximo agente:** antes de hacer el primer deploy real a producción, grep `getApiBaseUrl()}/api/` en todo `frontend/src/` y agregar `/v1` donde falte (afecta: `Checkout.tsx`, `Confirmation.tsx`, `CheckoutSuccess.tsx`, `ChatWidget.tsx`); alternativa más robusta: hacer que `getApiBaseUrl()` devuelva el host **+** `/api/v1` ya incluido y quitar el prefijo de cada call-site, para que esta clase de bug no pueda volver a aparecer componente por componente.

---

### 🛡️ Fase 15 — Auditoría de SEO, seguridad y gaps funcionales (23 jun 2026)

> Marlon pidió explícitamente que TODO funcione bien (web pública + admin) y que SEO y
> seguridad también queden documentados para que ningún agente futuro pierda el hilo. Esta
> fase es **auditoría, no implementación** — quedan los hallazgos fijados aquí; la corrección
> de cada uno es trabajo futuro a priorizar con Marlon.

#### 🔍 SEO — estado real

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | `index.html` tiene `<title>`/meta description **estáticos** (un solo valor para todo el sitio a nivel HTML crudo) | `frontend/index.html` |
| 2 | Por ruta, sí hay SEO real vía `SEO.tsx` (`react-helmet-async`): title, description, canonical, OG, Twitter card, soporte JSON-LD — usado en `Index.tsx`, `Transfers.tsx`, `Activities.tsx`, `Portfolio.tsx`, `Contact.tsx`, `Book.tsx` | grep confirmado |
| 3 | **`robots.txt` existe y apunta a un sitemap que NO existe** — `public/robots.txt` referencia `Sitemap: https://classviptransfers.com/sitemap.xml`, pero `public/sitemap.xml` **no está en el repo** | `ls public/` no lo lista |
| 4 | ⚠️ **El sitio es SPA pura (Vite, sin SSR/prerender)** — `vite.config.ts` no tiene plugin de SSR/prerender. Helmet solo actualiza el `<head>` **después** de que el JS corre en el navegador. Un crawler que no ejecute JS (o lo ejecute con presupuesto limitado) ve el title/description **genéricos** de `index.html` en TODAS las páginas, no el de `SEO.tsx` por ruta — esto le pega directo a SEO real en Google para páginas como `/activities` o `/transfers` | Estructura de `vite.config.ts` + comportamiento conocido de Helmet en CSR |
| 5 | Alt text en imágenes de marketing: en general correcto; algunas imágenes decorativas de carrusel usan `alt=""` a propósito (`Activities.tsx`, `Index.tsx`) — no es un bug | spot-check |

**Pendiente de decisión con Marlon:** si SEO es prioridad de negocio (tráfico orgánico de Google para "transfers Cabo San Lucas", etc.), la solución real es migrar a SSR/prerender (Next.js, o `vite-plugin-ssr`/prerendering estático por ruta) — no es un parche chico. Mientras tanto, lo barato-y-rápido es generar `public/sitemap.xml` real (rutas públicas conocidas) para que al menos no esté roto el link que ya promete `robots.txt`.

#### 🔒 Seguridad — estado real

| # | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| 1 | **No hay middleware de security headers** — cero `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy` en todo el backend | Media-Alta | `app/middleware/` solo tiene `auth.py` + `dependencies.py`; `main.py` solo registra CORS + `AdminAuthMiddleware` + `SlowAPIMiddleware` |
| 2 | CORS: allowlist explícita (`allowed_origins`), no `*` — **correcto** | — (sin issue) | `core/config.py` |
| 3 | Cookie de sesión admin: `samesite="lax"` + `secure` condicional a `environment=="production"` (correcto, ver Bloque 2). **No hay token CSRF separado** — la protección depende 100% de `SameSite=Lax` | Baja-Media (Lax ya mitiga la mayoría de CSRF cross-site en navegadores modernos, pero no es defensa en profundidad) | `api/v1/auth.py` |
| 4 | `bandit -r app`: limpio — el único hallazgo es `assert` en tests (`B101`), ya ignorado a propósito vía `ruff` (`S101`) | Sin issue | corrido en vivo esta sesión |
| 5 | **`pip-audit` encontró 2 CVEs reales en dependencias instaladas**: `msgpack 1.2.0` (GHSA-6v7p-g79w-8964, fix en 1.2.1) y `pydantic-settings 2.14.1` (GHSA-4xgf-cpjx-pc3j, fix en 2.14.2) | Media (revisar el detalle de cada CVE antes de asumir explotabilidad real en este proyecto) | corrido en vivo esta sesión |
| 6 | No se encontraron secretos logueados/impreso por error (`grep` de `api_key`/`secret` contra `log`/`print` — limpio) | Sin issue | — |
| 7 | **`POST /api/v1/customers/` no tiene auth NI rate limit** — endpoint de escritura pública abierto y sin throttle (a diferencia de `/bookings/`, `/auth/login`, `/ai/chat`, `/ai/transcribe`, que sí están limitados) | Media (vector de spam/abuso de la tabla de clientes) | `api/v1/customers.py` línea 18 |

**Acción recomendada (no ejecutada, pendiente de luz verde):** (a) agregar un middleware mínimo de security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` son baratos y sin riesgo de romper nada; CSP requiere más cuidado por el admin React y debe probarse aparte); (b) correr `pip install -U msgpack pydantic-settings` y validar que nada truene; (c) agregar `@limiter.limit(...)` a `POST /customers/`.

#### 🧩 Gaps funcionales re-confirmados (ya documentados antes, siguen igual hoy)

| # | Gap | Estado |
|---|---|---|
| 1 | `Checkout.tsx`, `Confirmation.tsx`, `CheckoutSuccess.tsx` siguen llamando `/api/bookings`, `/api/stripe/*` (sin `/v1`) | ❌ Sin corregir (Fase 13.3) — ahora **el mismo patrón también aparece en `ChatWidget.tsx`** (ver Fase 14 arriba), son 4 archivos con el mismo bug, no 3 |
| 2 | `POST /api/stripe/confirm-payment` no existe en el backend (`stripe.py` solo tiene `create-payment-intent` y `webhook`) | ❌ Sin corregir, pero no bloqueante (try/catch + webhook de Stripe finaliza la reserva igual) |
| 3 | Audit log (`models/audit.py`/`services/audit.py`) sigue sin un solo endpoint que lo use — `grep` de `AuditLog\|audit_service\|log_action` en `api/v1/` da cero resultados | ❌ Sin corregir |
| 4 | "Send Stripe Link" del admin (Quick Booking) sigue sin generar un link real de Stripe Checkout — solo cambia status a `PENDING_PAYMENT` y manda un email "pending" sin link de pago real | ❌ Sin corregir (ya señalado en Fase 12.6) |
| 5 | `COMBO_PRICE_CENTS` sigue siendo una constante duplicada a mano entre `services/booking.py` y `Book.tsx` (sin tabla DB) | ❌ Deuda técnica conocida, sin urgencia (Fase 13.4) |

**Estado de tests tras Fase 14:** 77 tests, todos verdes, cobertura 77.8%. No se tocó código en Fase 15 (auditoría pura).

---

### ✅ Fase 16 — Auditoría funcional admin + funnel público: código muerto y bugs corregidos (23 jun 2026)

> Marlon pidió: auditar que **todas las funciones del admin** funcionen, **sin código muerto, sin
> bugs**, y luego pasar a la **web pública / proceso de reservas**. Esto es auditoría CON corrección
> (no solo hallazgos): se arregló lo encontrado y se verificó (pytest 77 verdes, `tsc --noEmit` 0
> errores, smoke test en vivo contra el backend corriendo).

#### Admin — resultado

| Área | Resultado |
|---|---|
| **Contratos frontend↔backend** | ✅ **Todos correctos.** Las 21 llamadas del admin usan `/api/v1/...` (vía `apiUrl()` = `getApiBaseUrl()+path`, URL absoluta a `:8000`); cada una mapea a un endpoint real de `admin.py`/`bookings.py`/`customers.py`/`pricing.py` con el casing correcto (`MarketingTab` mapea el dashboard snake→camel bien, etc.). **El bug de prefijo `/api/v1` NO afecta al admin** — solo afectaba la web pública (ver abajo). |
| **Código muerto eliminado** | 🗑️ (1) Clase `UpdateBookingRequest` duplicada en `schemas/booking.py` (la de la línea ~23 estaba **sombreada** por la de la línea ~284 — Python usaba la segunda; la primera era inalcanzable y menos capaz, le faltaba `status`/`departure_date`/`arrival_airline`). Eliminada la sombreada; la activa quedó con docstring corregido. Esta era la "trampa para el próximo agente" que ya avisaba la Fase 13.3. (2) Variable `booking` asignada y nunca usada en `BookingService.assign` (`services/booking.py`) — se convirtió en `await self.get_by_id(...)` sin asignar (preserva el guard de 404). Confirmado con `ruff` que ya no quedan F841/F811/F401. |
| **`/admin/users` (3 endpoints)** | ℹ️ **NO es código muerto: es API intencional sin UI.** `list_admins`/`get_admin`/`update_admin` no tienen pantalla en el frontend, pero `AdminService` lo usa también `auth.py` (login/me) y hay un test (`test_auth.py` verifica que `/admin/users` exige auth). Se deja — es superficie de API válida (gestión de admins por API), solo le falta pantalla. |
| **`TareasTab`** | ℹ️ **Limitación de diseño, no bug.** Las tareas se guardan **solo en `localStorage`** del navegador (no hay backend de tareas). Funciona, pero las tareas son por-navegador: no se comparten entre dispositivos ni usuarios, y se pierden al limpiar el navegador. Si Marlon espera tareas compartidas por el equipo, hay que construir un backend de tareas (no existe hoy). |

#### Web pública / proceso de reservas — el hallazgo grande

**El funnel público de reservas estaba roto de punta a punta — y peor de lo que decía el WORKPLAN.** La Fase 13.3/15 documentaban que `Checkout.tsx` etc. llamaban a `/api/...` sin `/v1` y que "rompe en producción (el proxy de Vite lo salva en dev)". **Eso era incorrecto: también rompe en DEV.** Causa real confirmada esta sesión: estas páginas llaman a `` `${getApiBaseUrl()}/api/...` `` que es una **URL absoluta** (`http://localhost:8000/api/...`) — y el proxy de Vite (`vite.config.ts`, reescribe `^/api`→`/api/v1`) **solo intercepta rutas relativas servidas desde el origen del dev server, NO URLs absolutas a otro puerto.** El backend solo monta routers en `/api/v1` (sin alias). Por tanto `/api/bookings` daba **404 en dev y en prod**. El proxy de Vite es, de hecho, **config muerta** (nadie usa rutas relativas `/api`). La Fase 13.4 "validó en vivo" haciendo `curl` directo a `/api/v1/...`, no clickeando el formulario real en el navegador — por eso el bug pasó desapercibido.

Además, las páginas de display (`Confirmation`, `Checkout`, `CheckoutSuccess`) tenían **dos bugs más**, encadenados:
- Leían `payload.data` / `bookingData.data` — asumían el envoltorio `{success, data}` del backend TS viejo. El backend Python devuelve el objeto **directo** → `booking` quedaba `undefined`.
- Accedían a campos **camelCase** (`pickupLocation`, `totalAmount`, `item.totalPrice`...) pero el backend responde **snake_case** (`pickup_location`, `total_amount`, `total_price`) → campos vacíos y line-items mostrando **$0.00**.

**Qué se corrigió:**

| Archivo | Cambio |
|---|---|
| `frontend/src/features/booking/lib/booking-api.ts` (**nuevo**) | Helper compartido `fetchBooking(id, token)` + `mapBookingResponse(raw)` que resuelve los 3 bugs en un solo lugar: pega a `/api/v1/bookings/{id}`, lee el objeto directo (sin `.data`), y normaliza snake→camel incluyendo `items[]` (`unit_price`→`unitPrice`, `total_price`→`totalPrice`) y `customer`. Mismo patrón que los `mapBooking` del admin. |
| `Book.tsx` | URL de creación `/api/bookings` → `/api/v1/bookings`. |
| `Confirmation.tsx`, `CheckoutSuccess.tsx` | Reemplazado el `fetch` + `.data` por `fetchBooking()`; el tipo local de booking ahora es `ApiBooking`. (Estos archivos SÍ están type-checked — no son `@ts-nocheck`.) |
| `Checkout.tsx` | GET de la reserva ahora vía `fetchBooking()`; URLs de Stripe `/api/stripe/*` → `/api/v1/stripe/*`. Eliminado `getBookingToken()` que quedó huérfano tras el cambio (código muerto nuevo evitado). |
| `ChatWidget.tsx` | `/api/ai/chat` y `/api/ai/transcribe` → `/api/v1/ai/...` (el backend de IA de la Fase 14 vive en `/api/v1`). El envelope `data.data.*` aquí **sí es correcto** — los endpoints de IA devuelven `{success, data}` a propósito para calzar con el contrato del widget. |

**Verificación:**
- `grep` final: **cero** llamadas `/api/...` sin `/v1` en todo `frontend/src`.
- `tsc --noEmit`: **0 errores** (incluido el nuevo `booking-api.ts` tipado).
- Backend: **77 tests verdes**, `ruff` sin F-codes (sin código muerto/imports sin uso).
- Smoke test en vivo (backend corriendo en `:8000`): `GET /api/v1/bookings/{inexistente}` → 404 controlado; `POST /api/v1/ai/chat {"message":"hola"}` → **200** con `{success, data:{reply, sessionId, nextAction}}` (saludo local, sin gastar OpenAI) — exactamente el contrato que consume `ChatWidget`.

#### ⚠️ Lo que sigue pendiente tras esta auditoría (NO corregido — necesita decisión/alcance mayor)
- **`POST /api/v1/stripe/confirm-payment` sigue sin existir** en el backend. `Checkout.tsx` lo llama (ahora con el prefijo correcto) pero está envuelto en try/catch y el webhook de Stripe finaliza la reserva igual — **no bloqueante**, pero el flujo "pago con tarjeta → confirmación inmediata en pantalla" depende de que el webhook llegue. Construir este endpoint cerraría el hueco.
- **Link real de Stripe Checkout para el admin** ("Send Stripe Link" en Quick Booking) sigue sin generarse (ver Fase 12.6/15).
- **Hallazgos de la Fase 15** (sin security headers, `sitemap.xml` faltante, 2 CVEs en dependencias, `POST /customers/` sin rate limit, SPA sin SSR para SEO) siguen abiertos.
- **Backend de tareas** para `TareasTab` (hoy solo-localStorage) si se quiere que sean compartidas.

**Estado de tests tras Fase 16:** 77 backend verdes, `tsc --noEmit` 0 errores. No se tocó `database.py` (regla de Marlon).

---

### ✅ Fase 17 — Hardening: cierre de pendientes de seguridad de la auditoría (23 jun 2026)

> Continuación directa de las Fases 15/16. Se cerraron los pendientes de seguridad **de bajo
> riesgo y sin decisión de negocio** (los que sí requieren decisión sobre el flujo de pago siguen
> abiertos, ver abajo). Todo verificado: 78 tests verdes, `pip-audit` limpio, smoke test en vivo.

| Fix | Archivo(s) | Qué se hizo | Verificación |
|---|---|---|---|
| **🔒 Endpoints `/customers` sin auth (vuln real, peor de lo reportado)** | `api/v1/customers.py`, `middleware/auth.py`, `tests/test_customers.py` | La Fase 15 lo reportó como "POST sin rate limit". Investigando se vio que era **más grave**: el `AdminAuthMiddleware` solo bloquea `/api/v1/admin/*`, así que **los 3 endpoints de `/customers` estaban 100% públicos** — incluido `PATCH /customers/{id}`, que dejaba a **cualquiera sin login modificar los datos (PII) de cualquier cliente**. Se confirmó que el único consumidor real es el admin (PATCH desde `AdminBookings`, ya autenticado) y que el funnel público NO los usa (crea el cliente vía `find_or_create` dentro de `create_draft`). Fix: `Depends(get_current_admin)` en los 3 endpoints + se quitó `/api/v1/customers` de `PUBLIC_PATHS`. | En vivo: `POST /customers/` sin auth → **401**. Tests: nuevo `test_customer_endpoints_require_auth` (POST/GET/PATCH → 401 sin login); los 5 tests existentes ahora se loguean primero (patrón `_login_as_admin` igual que pricing). |
| **🛡️ Sin security headers** | `middleware/security_headers.py` (**nuevo**), `main.py` | Nuevo `SecurityHeadersMiddleware`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` en todas las respuestas; `Strict-Transport-Security` **solo en producción** (en dev se sirve HTTP plano). **CSP se omitió a propósito** — una CSP correcta para el admin React + Stripe.js necesita armarse y probarse aparte para no romper la UI (documentado en el docstring). | En vivo: `curl -D-` muestra los 3 headers en `/health`. |
| **🐛 2 CVEs en dependencias** | venv (`msgpack`, `pydantic-settings`) | `msgpack 1.2.0 → 1.2.1` (GHSA-6v7p-g79w-8964) y `pydantic-settings 2.14.1 → 2.14.2` (GHSA-4xgf-cpjx-pc3j). `pydantic-settings` ya cabe en el rango de `pyproject.toml` (`>=2.6,<3.0`); `msgpack` es transitiva. | `pip-audit` → **"No known vulnerabilities found"**. |
| **🔍 `sitemap.xml` roto (faltaba)** | `frontend/public/sitemap.xml` (**nuevo**) | `robots.txt` ya apuntaba a `https://classviptransfers.com/sitemap.xml` pero el archivo no existía. Se creó con las 6 rutas crawleables reales (`/`, `/transfers`, `/activities`, `/book`, `/portfolio`, `/contact`) — se excluyeron las que `robots.txt` tiene en `Disallow` (`/admin`, `/checkout`, `/confirmation`, `/gallery`). | XML válido; rutas verificadas contra el router del frontend. |

**Hallazgo extra (CORREGIDO en Fase 21 — la nota original era un malentendido):** el warning
`requires fastapi<0.116` NO venía del `pyproject.toml` (que ya tenía `fastapi>=0.115` sin tope),
sino de la **metadata instalada vieja** (`dist-info` generado de un pyproject anterior). Ver Fase 21
abajo para el fix real.

#### ⚠️ Pendientes que siguen abiertos tras Fase 17 (requieren decisión de Marlon / alcance mayor)
- **`POST /api/v1/stripe/confirm-payment`** sigue sin existir (no bloqueante: webhook de Stripe finaliza la reserva).
- **Link real de Stripe Checkout** para el admin ("Send Stripe Link").
- **SEO real**: el sitio es SPA sin SSR — el `sitemap.xml` ayuda, pero para que Google vea el `<title>`/OG por ruta haría falta SSR/prerender (decisión de negocio, no es parche chico).
- **Audit log** (`models/audit.py`/`services/audit.py`) sigue sin engancharse a ningún endpoint.
- **Backend de tareas** para `TareasTab` (hoy solo-localStorage).

**Estado de tests tras Fase 17:** 78 backend verdes, `pip-audit` limpio, `tsc --noEmit` 0 errores (sin cambios de frontend en esta fase salvo `sitemap.xml`).

---

### ✅ Fase 18 — `stripe/confirm-payment` construido + bug de estado de pago corregido (23 jun 2026)

> Pendiente desde la Fase 12.5/16: `Checkout.tsx` llamaba a `POST /api/v1/stripe/confirm-payment`
> tras el `confirmCardPayment()` de Stripe.js, pero **el endpoint no existía** (404). El flujo
> dependía 100% de que llegara el webhook. Ahora existe el "fast-path": la reserva pasa a PAID de
> inmediato sin esperar el webhook, y de forma segura.

**Bug pre-existente encontrado y corregido en el camino (afectaba también al webhook):** las
reservas públicas nacen en **DRAFT** (`create_draft`), pero `PaymentService.mark_completed` solo
promovía **PENDING_PAYMENT → PAID**. Resultado: una reserva pública pagada con tarjeta quedaba con
el pago `COMPLETED` pero **la reserva atascada en DRAFT** — tanto por el webhook como por cualquier
confirmación. Es decir, el flujo de pago con tarjeta **nunca dejaba una reserva en PAID**. Se
corrigió en dos frentes:
1. `create-payment-intent` ahora transiciona la reserva **DRAFT → PENDING_PAYMENT** al crear el intent (semántica correcta: ya está esperando pago).
2. `mark_completed` ahora promueve a PAID desde **DRAFT o PENDING_PAYMENT** (defensivo: un pago completado = dinero recibido, la reserva nunca debe quedar atascada). No toca CONFIRMED/COMPLETED/CANCELLED.

**Qué se construyó:**

| Capa | Archivo | Cambio |
|---|---|---|
| Servicio Stripe | `services/stripe.py` | Nuevo `retrieve_payment_intent(pi_id)` — recupera el PaymentIntent de Stripe para verificar su estado **real** y su `metadata.booking_id`. |
| Servicio pago | `services/payment.py` | `mark_completed` ahora promueve la reserva a PAID desde DRAFT o PENDING_PAYMENT (ver bug arriba). |
| Endpoint | `api/v1/stripe.py` | Nuevo `POST /confirm-payment`. **No confía en el cliente**: recupera el PaymentIntent de Stripe y exige (a) `status == "succeeded"` y (b) que `metadata.booking_id` coincida con la reserva. Completa el pago pendiente de Stripe de forma **idempotente con el webhook** (si el webhook ya lo completó, o gana la carrera lanzando `ValidationError`, responde 200 sin duplicar). Devuelve `{status, bookingStatus}`. También transiciona DRAFT→PENDING_PAYMENT en `create-payment-intent`. |

**Contrato con el frontend:** `Checkout.tsx` ya manda `{bookingId, paymentIntentId, bookingToken}` y solo checa `response.ok` (no lee el body). El endpoint acepta camelCase (`bookingId`/`paymentIntentId`) y snake_case. No requirió cambios de frontend (la URL ya se corrigió a `/api/v1` en la Fase 16).

**Validación:**
- 5 tests nuevos en `app/tests/test_stripe.py` (Stripe mockeado, sin llamadas reales): pago exitoso → reserva PAID; idempotencia (doble confirm → sigue PAID); rechazo si el intent no está `succeeded` (409, reserva sigue PENDING_PAYMENT); rechazo si el `booking_id` del intent no coincide (400); validación de campos (400). También verifican la transición DRAFT→PENDING_PAYMENT en `create-payment-intent`.
- Suite completa: **83 tests verdes** (78 + 5). `ruff` sin código muerto.
- Smoke test en vivo: `POST /confirm-payment` responde (400 validando campos, **ya no 404**).

**⚠️ Lo que NO se pudo verificar (necesita Marlon):** el camino real contra Stripe (recuperar un PaymentIntent real con una tarjeta de prueba) requiere las claves de Stripe test reales + correr el front. La lógica nuestra (transiciones de estado, verificación server-side, idempotencia) está cubierta por tests; falta una pasada end-to-end con tarjeta de prueba `4242 4242 4242 4242` cuando se tengan las claves de test en el `.env`.

---

### ✅ Fase 19 — Link de pago real para el admin ("Send Stripe Link") (23 jun 2026)

> Pendiente desde la Fase 12.6: el Quick Booking del admin con `payment_method=stripe` ponía la
> reserva en PENDING_PAYMENT y mandaba el email "pending", **pero sin link de pago real**. Ahora el
> email incluye un botón que lleva a la página de checkout pública.

**Decisión de diseño:** en vez de crear Stripe Checkout Sessions (otra integración), se **reutiliza
la página `/checkout` pública** que ya hace `create-payment-intent` + Stripe Elements +
`confirm-payment` (recién construido en Fase 18). El "link de Stripe" es simplemente
`{FRONTEND_URL}/checkout?bookingId={id}`. Menos superficie, reúsa el flujo ya probado.

| Archivo | Cambio |
|---|---|
| `services/email.py` (`send_booking_pending`) | Construye `payment_url = {frontend_url}/checkout?bookingId={id}` y lo pasa al template. |
| `templates/emails/customer_pending.html` | Botón **"Complete Payment"** condicional (`{% if payment_url %}`); si no hay link, cae al texto genérico de antes (sin botón roto). |

**No requirió cambios en `admin.py`:** el endpoint de Quick Booking ya llamaba a
`send_booking_pending(booking_dict)` con `booking_dict["id"]` para el método `stripe` — el email
ahora arma el link solo. Tampoco cambió el frontend.

**Validación:** 2 tests nuevos en `test_email.py` (el email pending con `id` trae el link a
`/checkout?bookingId=...` y el botón; sin `id` no arma botón). Suite: **85 tests verdes**.

**Nota:** igual que en Fase 18, el cobro real end-to-end necesita claves de Stripe test + tarjeta
de prueba para verificarse en vivo; la lógica está cubierta por tests.

---

### ✅ Fase 20 — Audit log enganchado (dejó de ser código huérfano) (23 jun 2026)

> Desde el día 0, `models/audit.py` + `services/audit.py` existían pero **ningún endpoint los
> usaba** (confirmado en Fases 12/15/16: `grep AuditLog|audit_service|log_action` en `api/` = 0).
> Ahora las acciones administrativas sobre reservas quedan registradas y son consultables.

**Qué se hizo:**

| Capa | Archivo | Cambio |
|---|---|---|
| Servicio | `services/audit.py` | Nuevo `list_paginated(page, page_size, entity_id)` (lo más reciente primero, filtro opcional por entidad). |
| Schema | `schemas/audit.py` (**nuevo**) | `AuditLogResponse` + `AuditLogListResponse`. |
| Endpoints (registro) | `api/v1/admin.py` | Helper `_audit(...)` **best-effort** (un fallo de log NUNCA revierte ni tumba la acción — filosofía T8, igual que los emails). Enganchado en las 6 acciones: `create_manual`→CREATE, `update`→UPDATE, `confirm`→CONFIRM, `cancel`→CANCEL, `mark-paid`→PAYMENT, `assign`→ASSIGN. Registra el email del admin (de `get_current_admin`) + descripción + `changes` (en update/assign). |
| Endpoint (lectura) | `api/v1/admin.py` | Nuevo `GET /api/v1/admin/audit-logs` (paginado, `?entity_id=` opcional, requiere auth). |

**Detalle técnico:** `AuditService.log` hace su propio `commit()`. Como la sesión usa
`expire_on_commit=False` (`database.py`), llamar al log **después** de que el action ya hizo commit
no expira el objeto booking ni rompe la serialización de la respuesta. El registro es un INSERT
separado, idempotente respecto al action.

**Validación:** 3 tests nuevos en `test_audit.py` (el endpoint exige auth → 401; un `cancel` genera
una entrada CANCEL con el email del admin y el motivo; un `mark-paid` genera una entrada PAYMENT).
Suite completa: **88 tests verdes**, `ruff` sin código muerto.

**Pendiente (no bloqueante):** no hay **pantalla** en el admin para ver el log (el dato se registra
y se puede leer por API, pero `Admin.tsx` no tiene una pestaña de auditoría). Es el único pedazo que
falta para cerrarlo 100% de cara al usuario — se puede agregar como una vista simple que consuma
`GET /admin/audit-logs`.

---

### ✅ Fase 21 — Empaquetado: el proyecto ahora es `pip install`-able (23 jun 2026)

> Cierre del "hallazgo extra" de la Fase 17. Investigado a fondo, la conclusión fue distinta a la
> sospecha inicial.

**Diagnóstico real:**
- El `pyproject.toml` en disco **ya estaba bien**: `fastapi>=0.115` / `weasyprint>=62`, sin topes que choquen con lo instalado (0.137.1 / 69.0). El warning de "conflicto" venía de la **metadata instalada** (`classvip_transfers-0.1.0.dist-info/METADATA`), generada de un `pyproject` anterior que sí tenía `<0.116`.
- Al intentar regenerar esa metadata (`pip install -e .`) **el build fallaba**: faltaba `[build-system]` y, con auto-discovery de setuptools en flat-layout, encontraba **dos** paquetes top-level (`app` y `alembic`) y se negaba a construir. Además `readme = "README.md"` apuntaba a un archivo inexistente en `backend/`.
- **No es un bloqueador de deploy:** el `Dockerfile.backend` instala dependencias con `uv pip compile pyproject.toml` (solo resuelve `[project.dependencies]`) y **copia** el código — nunca hace `pip install .`. Así que el deploy nunca dependió de que el proyecto fuera instalable.

**Fix (buena higiene, riesgo cero para Docker):**
- `pyproject.toml`: agregado `[build-system]` (setuptools) + `[tool.setuptools] packages = ["app"]` (empaqueta solo `app`, ignora `alembic`).
- Creado `backend/README.md` (faltaba; lo referenciaba `readme =`).

**Verificación:** `pip install -e . --no-deps` → **exit 0** (antes fallaba). La metadata se regeneró a
`fastapi>=0.115` / `weasyprint>=62` (los topes viejos desaparecieron). `pip-audit` → "No known
vulnerabilities found" **sin** el warning de conflicto. Suite: **88 tests verdes**.

---

## Fase 22 — Backend de tareas compartidas (TareasTab) (24 jun 2026)

**Qué se hizo:** Las tareas del panel admin (`TareasTab.tsx`) vivían solo en `localStorage` del
navegador — no se compartían entre dispositivos ni entre miembros del equipo. Se construyó un
backend real:

- `app/models/admin_task.py` (**nuevo**): modelo `AdminTask` (tabla `admin_tasks`) con
  `id, titulo, descripcion, fecha, hora, categoria, status, creado_en`. `categoria` y `status`
  son enums nuevos (`AdminTaskCategory`, `AdminTaskStatus` en `app/models/enums.py`) con los
  mismos valores que ya usaba el frontend (`servicio-vehiculo`, `operacion`, `admin`, `otro` /
  `pendiente`, `completada`, `cancelada`) — cero cambios de vocabulario para el equipo.
- `app/schemas/admin_task.py` (**nuevo**): `CreateAdminTaskRequest`, `UpdateAdminTaskStatusRequest`,
  `AdminTaskResponse`, `AdminTaskListResponse` — todos con `alias_generator=to_camel` para que el
  JSON sea camelCase (`creadoEn`, etc.), igual que el resto de la API.
- `app/services/admin_task.py` (**nuevo**): `AdminTaskService` con `list_all`, `create`,
  `update_status`, `delete`. `update_status`/`delete` lanzan `NotFoundError` si el id no existe.
- `app/api/v1/admin.py`: 4 endpoints nuevos, todos con `Depends(get_current_admin)`:
  - `GET /api/v1/admin/tasks` — lista todas, ordenadas por fecha+hora.
  - `POST /api/v1/admin/tasks` — crea (201).
  - `PATCH /api/v1/admin/tasks/{id}` — cambia status (404 si no existe).
  - `DELETE /api/v1/admin/tasks/{id}` — borra (204; 404 si no existe).
- Migración Alembic `55e1faff1097_admin_tasks.py` (**nueva**, generada con `--autogenerate` contra
  el Supabase real — el diff solo detectó la tabla nueva, sin drift de schema) y **aplicada ya**
  con `alembic upgrade head` contra producción (tabla `admin_tasks` existe en Supabase).
- `app/tests/test_admin_tasks.py` (**nuevo**, 7 tests): auth requerida, crear+listar, categoría
  por default, actualizar status, 404 en update/delete de id inexistente, borrar.
- Frontend: `TareasTab.tsx` reescrito — quitado `localStorage`/`STORAGE_KEY`/`loadTasks`/`saveTasks`,
  ahora usa `fetch` contra los 4 endpoints (patrón `apiUrl()` + `getAuthHeaders()` ya usado en
  `AccountsTab.tsx` y otras pestañas). Mismo diseño visual, sin cambios de UI.

**Verificación:**
- Suite completa: **95 tests verdes** (antes 88; +7 de tasks).
- `tsc --noEmit` en frontend: sin errores.
- Smoke test real contra el servidor local (conectado al Supabase de producción): registro/login
  de admin → `POST /admin/tasks` (201, devuelve `creadoEn` en camelCase) → `GET /admin/tasks`
  (aparece) → `DELETE` (204) — verificado y limpiado, no quedó data de prueba en producción.

---

## Fase 23 — Activar RLS en todas las tablas (cerrar la puerta de PostgREST) (24 jun 2026)

**Problema (lo reportó el linter de seguridad de Supabase):** las 21 tablas de `public` tenían
**RLS apagado** (`rls_disabled_in_public`, nivel ERROR), más 2 avisos de `sensitive_columns_exposed`
(`ai_conversations.session_id`, `drivers.license_number`). Esto NO lo "desactivó" nadie: RLS viene
apagado por default en Postgres para toda tabla nueva (creada por Alembic/SQLAlchemy). El riesgo:
Supabase expone **automáticamente** cada tabla de `public` por su API REST (PostgREST) con la
`anon key`. Sin RLS, quien tenga esa key podría leer/escribir `admin_users` (hashes), `customers`,
`bookings`, `payments`, etc. **saltándose el backend FastAPI y su login de admin**. El frontend hoy
NO usa la `anon key` (no hay `supabase-js` en el código), así que no había explotación activa, pero
era un hueco real para un proyecto que debe ser seguro.

**Por qué se podía arreglar sin romper nada (verificado ANTES de tocar):** se consultó la base real
y el backend se conecta como el rol `postgres`, con **`rolbypassrls = true`** y además dueño de las
tablas. Ese rol **ignora RLS** — sus queries no se ven afectadas. (Esto es lo contrario del bug del
proyecto TS `classvip-live-correct2`, donde el problema era RLS **con una policy `USING:false`** que
sí bloqueaba lecturas; aquí no se crean policies, solo se activa RLS.)

**Qué se hizo:**
- Migración Alembic `53814fa057f0_enable_rls_all_public_tables.py` (**nueva**): un `DO $$` que
  recorre todas las tablas de `public` y les hace `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
  **Solo ENABLE, NUNCA FORCE** — FORCE sometería también al dueño a RLS y rompería el backend.
  Sin policies para `anon`, la API pública de Supabase pasa a devolver cero filas. `downgrade()`
  hace `DISABLE` en todas (reversible). Aplicada con `alembic upgrade head` contra Supabase real.

**Verificación (contra la base real, después de aplicar):**
- 21/21 tablas de `public` con RLS activado (`pg_class.relrowsecurity = true`).
- 0 tablas con FORCE RLS (`relforcerowsecurity = false` en todas) — el bypass del dueño sigue vivo.
- El backend (misma `AsyncSessionLocal` que usa la app) **sigue viendo los datos**: 6 bookings,
  5 customers — idéntico a antes de la migración. El admin no se rompe.
- Los 2 avisos de `sensitive_columns_exposed` también se resuelven (dependían de "sin RLS").

**Nota para futuros agentes:** si algún día el frontend necesitara leer Supabase directo con la
`anon key` (hoy NO lo hace), habría que crear policies RLS explícitas para el rol `anon`. Mientras
toda lectura/escritura pase por el backend FastAPI (rol `postgres`, bypassrls), no hace falta
ninguna policy — RLS activado + cero policies es exactamente lo que se quiere: backend ve todo,
mundo exterior por PostgREST no ve nada.

---

## Fase 24 — Policies RLS de denegación + reset de contraseña admin (24 jun 2026)

**Parte A — Policies RLS (`rls_enabled_no_policy`).** Tras la Fase 23 (RLS activado), el linter de
Supabase pasó a avisar `rls_enabled_no_policy`: RLS activo pero sin policies. Para esta arquitectura
la intención **no** es dar acceso por la API de Supabase (PostgREST/`anon key`) — el frontend nunca
la usa; todo pasa por el backend FastAPI (rol `postgres`, bypassrls). Por eso la policy correcta es
**denegar explícitamente, no abrir** (poner policies permisivas para `anon` reabriría el hueco de la
Fase 23).

- Migración `38eca4d0c9e6_rls_deny_policies_public_tables.py` (**nueva**): crea en cada tabla de
  `public` una policy `deny_public_access` `AS RESTRICTIVE FOR ALL TO public USING (false) WITH
  CHECK (false)`. RESTRICTIVE = se combina con AND, así que aunque alguien agregue después una
  policy PERMISSIVE por error, el deny sigue bloqueando a `anon`. El backend (`postgres`, bypassrls)
  no se ve afectado. `downgrade()` borra la policy de todas las tablas. Aplicada con `alembic upgrade head`.
- **Verificación (base real):** 21/21 tablas con policy; 0 tablas con RLS-on-sin-policy (el linter
  queda satisfecho); backend sigue viendo 6 bookings / 5 customers; y vía **API real** (login admin →
  `GET /admin/bookings`) → 200 y devuelve las 6 reservaciones. El admin no se rompe.

**Parte B — Contraseña del admin.** Marlon pidió fijar la contraseña de `admin@classviptransfers.com`.
El primer intento (`3661372`, 7 dígitos) fue **rechazado por el propio sistema**: `LoginRequest` y el
registro exigen `min_length=8` (`app/schemas/auth.py`) — regla de seguridad que se respetó (NO se bajó
el mínimo). Se fijó `Class361372` (11 chars) escribiendo el hash argon2 (`app.core.security.hash_password`)
directo en `admin_users.password_hash`. Verificado: `verify_password` → True, y login vía API → 200 con
token; la contraseña anterior → 401.

**Smoke test completo del admin tras todos los cambios (RLS + policies + password), todo vía API real:**
login 200, `bookings` 200 (6 reservaciones), `dashboard` 200, `tasks` 200, `drivers`/`vehicles`/
`accounts` 200, `audit-logs` 200. (`GET /api/v1/customers/` da 405 **por diseño**: el router de
customers solo expone `POST /` y `GET/PATCH /{id}`, no hay "listar todos" — no es bug.)

**Nota operativa para futuros agentes:** el backend en local se corre con
`python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`. Levantarlo en background con `&`/`nohup`/
`setsid` desde `wsl.exe -d Ubuntu bash -lc "..."` **no sobrevive** al cierre de la sesión WSL; hay que
usar el modo background del runner de Claude Code (o dejarlo en foreground en su propia terminal).

---

## Fase 27 — Emails de confirmación detallados (port del proyecto viejo) (26 jun 2026)

**Pedido de Marlon:** las confirmaciones deben ser detalladas con TODOS los datos de la reservación:
cliente (nombre, correo, teléfono), servicio, hotel/pickup, pickup time, vuelos, desglose de precio y
**método de pago (Stripe, con su badge)**. Copiar/mejorar del proyecto viejo
(`/home/conde/classvip-live-correct2/`).

**Hallazgo clave (hueco real):** el webhook de Stripe (`payment_intent.succeeded`) marcaba el pago como
completado pero **NO enviaba email de confirmación**. El cliente que pagaba con tarjeta solo recibía el
email "pending" inicial y nunca una confirmación final. Corregido (ver abajo).

**Cambios:**
- `app/templates/emails/customer_confirmed.html` — **reescrito**: portado de Handlebars (proyecto viejo)
  a Jinja2. Tarjeta profesional bilingüe (membrete dorado/navy) con secciones: badge de confirmación +
  código, **Datos del huésped** (nombre/email/teléfono/pasajeros), **Detalles del viaje**
  (servicio/fecha/pickup-hotel/dropoff/pickup time/tipo de viaje/vuelos llegada y salida), **Desglose de
  precios** (items + subtotal/descuento/IVA + total) y **Método de pago** con badge de Stripe, incluidos,
  política de cancelación, notas y footer de contacto.
- `app/services/email.py` — nueva `build_confirmation_context(booking, payment_method)` que arma TODAS
  las variables del template (formatea fecha, dinero `$x,xxx.xx USD`, texto de vuelos, items, y el texto
  del método de pago + si mostrar el badge). Mapa `_PAYMENT_METHODS`: stripe/card/pending → badge Stripe;
  cash/offline/none → sin badge. Default = **stripe** (el flujo público se cobra con Stripe).
  `send_booking_confirmation(booking, payment_method="stripe")` ahora renderiza con ese contexto.
- `app/api/v1/stripe.py` — webhook `payment_intent.succeeded`: tras `mark_completed`, ahora carga el
  booking (`BookingService.get_by_id`, eager-load de customer+items) y envía
  `send_booking_confirmation(..., payment_method="stripe")`. **Best-effort**: un fallo de email se loguea
  como warning y NO rompe el webhook (Stripe reintentaría).
- `app/api/v1/admin.py` — la reserva manual en efectivo ahora llama
  `send_booking_confirmation(booking_dict, payment_method="cash")` para que el método de pago salga
  correcto (sin badge Stripe).

**Verificación:** render del template con un booking de ejemplo → 16.5 KB HTML, presentes y correctos:
nombre, correo, teléfono, código, hotel/pickup, pickup time, pasajeros, vuelo de llegada y de salida,
"Paid securely with card · Stripe", badge `stripe_logo`, total `$309.00 USD`. **60 tests verdes**
(email/booking/stripe/admin), imports limpios, backend reiniciado y `login` 200. Preview guardado en
`/tmp/preview_confirmed.html`.

**Pendiente menor (no bloqueante):** los templates `customer_pending.html` y `company_notification.html`
siguen con el diseño simple anterior; si Marlon los quiere igual de detallados, replicar el mismo patrón.
→ **Hecho en Fase 27.1 (abajo).**

## Fase 29 — Calidad de código: quitar @ts-nocheck, ruff limpio, +cobertura (26 jun 2026)

Marlon pidió arreglar los 3 puntos de la revisión de código sin afectar funcionalidad.

**1. `@ts-nocheck` (type safety frontend).** Se quitaron los **18** `// @ts-nocheck` de `frontend/src/`
(componentes admin, Book/Checkout, hooks, libs). Resultado: `npx tsc --noEmit` → **0 errores**. Eran
defensivos de la migración JS→TS; el código ya compilaba limpio. Type-checking reactivado en todo el
frontend sin un solo cambio de lógica.

**2. Lint (ruff).** `ruff check app/ --fix` (imports) + `ruff format app/` (20 archivos, envuelve líneas
largas a la `line-length=100` ya configurada) + 6 líneas largas restantes (strings/subjects/descriptions)
partidas a mano con concatenación implícita / continuación `\` (sin cambiar el texto resultante).
Resultado: **`ruff check app/` → All checks passed!** (antes 29 avisos). Cero cambios de comportamiento
(formato puro). Verificado: emails siguen renderizando idénticos (piernas + subjects), 114 tests verdes.

**3. Cobertura de tests (booking/pricing).**
- `app/tests/test_booking_pricing.py` (**nuevo**, 6 tests): valida la regla de bandas por área en
  `create_draft` — 1-5 pax (ida/redondo) vs 6-11 pax (sprinter), corte exacto en 6 pax, override
  server-side del precio del cliente (seguridad), y `area_id` inválido → 400.
- `app/tests/test_booking_service.py` (**nuevo**, 10 tests): `create_manual`, `get_by_id`, `confirm`,
  `cancel` (+ reason), `mark_paid`, `update`, `list_paginated` (+ search), `get_dashboard_stats`,
  `assign` (chofer+vehículo, upsert), y ramas de error (`cancel` ya cancelado, `confirm` estado inválido).
- `app/tests/test_pricing.py` (**ampliado**): update/deactivate de área, deactivate de hotel,
  update/deactivate de extra, PATCH a área inexistente → 404.
- **Resultado:** `services/booking.py` **45% → 72%**, `api/v1/pricing.py` **50% → 60%**, total del
  proyecto **81% → 84%**. Tests **94 → 114**, todos verdes. (Lo que queda sin cubrir en booking.py es el
  bucle de reintento por colisión de código de confirmación — rama que solo se dispara bajo IntegrityError
  y ya tiene un test dedicado del happy-path de colisión.)

**Validación global:** ruff limpio, `tsc` limpio, 114 tests verdes, emails renderizan igual, backend
reiniciado con el código nuevo (health 200, login 200, `/pricing/rules` 404). Sin cambios de funcionalidad.

**Nota sobre el skill instalado:** Marlon instaló `development/code-reviewer` de `claude-code-templates`
(`C:\Users\conde\.claude\skills\code-reviewer\`). Es boilerplate: el `code_quality_checker.py` es un stub
(no analiza) y los `references/*.md` son plantillas placeholder. La revisión/calificación (B+ → mejorada
con esta fase) se hizo con herramientas reales (ruff/pytest/tsc), no con ese skill.

## Fase 31p — Email de confirmación tras el pago (no dependía del webhook) (28 jun 2026)

**Síntoma (Marlon):** al terminar la reserva solo llega el correo de "Pago Pendiente";
NUNCA llega la confirmación (el más importante) ni el aviso a la compañía.

**Causa raíz (confirmación):** `send_booking_confirmation` SOLO se disparaba desde el webhook de
Stripe (`payment_intent.succeeded`). El fast-path `confirm-payment` —que el frontend SIEMPRE llama
tras `confirmCardPayment`— marcaba el pago como completado pero no enviaba la confirmación. Si el
webhook no está configurado en producción (endpoint + `STRIPE_WEBHOOK_SECRET` en el dashboard de
Stripe), la confirmación nunca salía.

**Fix (`stripe.py` confirm-payment):** tras `mark_completed`, si fue ESTE request el que completó el
pago (`just_paid`), envía `send_booking_confirmation` (cliente) + `send_company_notification`
(operaciones). Idempotente con el webhook: el que gane la carrera manda los correos una sola vez.
Best-effort (un fallo de email no rompe la confirmación del pago). Logger de módulo agregado.

**Diagnóstico del correo de compañía:** los 3 templates (pending/confirmed/company) renderizan OK en
prueba local — NO es bug de código. El de pago pendiente (mismo Resend, mismo `from`) sí llega al
cliente, así que el envío FROM `bookings@classviptransfers.com` funciona. Que el de compañía a
`armando@classviptransfers.com` no llegue apunta a ENTREGA de Resend (dominio/destinatario/spam) o a
que el buzón de armando@ aún no recibe (MX en configuración). Acción de Marlon: revisar el dashboard
de Resend → Logs (estado Delivered/Bounced) y confirmar que armando@ recibe correo externo.
Pendiente opcional: registrar envíos en la tabla EmailLog para visibilidad en el admin.

---

## Fase 31o — Fix checkout (Stripe) + verificación end-to-end del flujo de reservas (28 jun 2026)

**Pedido de Marlon:** "verifica que el flujo de reservas funciona perfectamente, se guarda
en la base de datos, y también las reservaciones del admin. Es de suma importancia."

**Bug encontrado y corregido (el 400 que veía el usuario al reservar):**
El error NO estaba en crear la reserva (esa daba 201 y se guardaba bien). Estaba en el paso
siguiente, el checkout. Diagnosticado mandando reservas reales a la API de producción:
- `POST /api/v1/stripe/create-payment-intent` devolvía `400 {"detail":"booking_id es requerido"}`.
- Causa 1 (request): el frontend manda `bookingId` (camelCase) pero ese endpoint solo leía
  `booking_id` (snake). Su hermano `confirm-payment` en el MISMO archivo ya aceptaba ambos.
  Fix (`stripe.py`): `booking_id = body.get("bookingId") or body.get("booking_id")` — consistente
  con el hermano, sin duplicar lógica.
- Causa 2 (response): el frontend leía `intentData.data.clientSecret` pero el backend devuelve
  `client_secret` DIRECTO (sin envoltorio `.data`). Mismo bug heredado del backend TS viejo que ya
  se corrigió en `Book.tsx`. Fix (`Checkout.tsx`): leer `intentData.client_secret`.
- Antes, en la misma sesión: `Book.tsx` leía `result.data?.id` (→ "No booking ID returned") y
  pegaba a `/api/v1/bookings` sin slash final (→ 307 redirect que rompía cross-origin en prod;
  en dev no, por el proxy de Vite). Ambos corregidos.

**Verificación end-to-end contra PRODUCCIÓN (14/14 pruebas verdes):**
Script `/tmp/verify_bookings.sh` ejecutado contra la API real:
1. Flujo público: `POST /bookings/` → 201; precio recalculado server-side (11000); status DRAFT;
   `GET /bookings/{id}` recupera la MISMA reserva (persistida en DB); cliente e items persistidos.
2. Checkout: `create-payment-intent` con `bookingId` → 200 con `client_secret` real
   (`pi_3TnFWK...`) → claves de Stripe en Railway válidas y funcionando.
3. Admin: login 200; la reserva pública aparece en `GET /admin/bookings` (búsqueda por código);
   `POST /admin/bookings` (reserva manual, payment_method=none) → 201, status OFFLINE_HOLD, total
   9000; persistida y visible en el panel.

**Conclusión:** flujo de reservas público + admin verificado funcionando y persistiendo en la DB.

**Botón "Borrar" reserva (hard delete) + limpieza de las pruebas:**
Marlon pidió un botón permanente para borrar reservas (no solo limpiar las de prueba).
- Backend: `DELETE /api/v1/admin/bookings/{id}` (auth + audit). `BookingService.delete()` hace
  hard delete; los hijos caen por las reglas ondelete de las FK: items/payments/pricing_overrides/
  assignments/email_logs → CASCADE; account_charges + ai_conversations → SET NULL (se conservan).
  El audit log sobrevive (`entity_id` es String, no FK).
- Frontend (`AdminBookings.tsx`): botón "Borrar" rojo en el detalle, con doble confirmación que
  muestra el código; tras borrar cierra el detalle (no refresca, daría 404) y refresca la lista.
  Distinto de "Cancel" (que solo cambia el status). Helper `doDelete` + prop `onClose`.
- Verificado en producción: las 9 reservas de prueba ("Test Guest"/"VERIFY ...") borradas vía el
  endpoint nuevo, 0 restantes. El panel quedó limpio.

---

## Fase 31n — Deploy en vivo + notificación a operaciones + base SEO/performance (28 jun 2026)

**Contexto:** Marlon ejecutó el deploy real. Esta fase cubre los fixes que surgieron al levantar
producción + el primer bloque de SEO/performance. **Ver el "PLAN SEO PROFESIONAL" arriba** para el
roadmap completo por fases.

**Fixes de arranque en producción (Railway):**
- `database.py` + `alembic/env.py`: `_asyncpg_url()` ahora también **quita `?pgbouncer=true`** de la
  `DATABASE_URL` (Supabase Session Pooler lo agrega; asyncpg lo pasa como kwarg a `connect()` y
  truena con `TypeError: connect() got an unexpected keyword argument 'pgbouncer'`). Parsea query,
  hace `params.pop("pgbouncer")`, reconstruye. Mantiene la conversión `postgresql://`→`+asyncpg`.
- `Dockerfile`: agregado `COPY scripts ./scripts` — faltaba, así que `ensure_admin.py` no existía en
  la imagen y `start.sh` reiniciaba en loop (`No such file or directory`).
- `start.sh`: `export PYTHONPATH="/app:..."` — `pip install .` con `packages=["app"]` solo instala el
  nivel superior (sin subpaquetes), así que `python scripts/ensure_admin.py` daba
  `ModuleNotFoundError: No module named 'app.core'`. Con `/app` al frente del path resuelve contra el
  código fuente completo. También llama `ensure_admin.py` tras las migraciones.
- CORS cross-origin (Vercel↔Railway): se maneja en `AdminAuthMiddleware` (NO `CORSMiddleware` de
  Starlette — interceptaba preflights). OPTIONS→200 directo, headers CORS en todas las respuestas.
  Cookie `admin_token` con `samesite=none; secure` en producción. Requiere `ENVIRONMENT=production`
  en Railway (con `development` la cookie cross-origin no viaja).
- **Resultado:** login admin funciona en `https://classviptransferspy.vercel.app`. Logs de Railway en
  ROJO que dicen `INFO`/`200 OK` son normales (alembic/uvicorn escriben a stderr).

**Notificación interna de reservas:**
- `config.py`: nuevo `company_email` (default `armando@classviptransfers.com`).
- `email.py`: `send_company_notification` usa `settings.company_email` (antes
  `email_bcc or admin_email`). Cada nueva reserva notifica a Armando. Override sin redeploy con
  la env var `COMPANY_EMAIL`.

**SEO + performance (base, sin tocar el flujo de reservas):**
- `vite.config.ts`: `manualChunks` (forma de función) separa vendor chunks pesados
  (`vendor-react`, `vendor-query`, `vendor-motion`, `vendor-charts`). `vendor-charts` (recharts,
  ~367kB) ya NO carga en el sitio público — solo al abrir el admin (lazy). `cssMinify: false` se
  mantiene a propósito: Tailwind v4 (`--spacing()`) revienta lightningcss; Vercel sirve CSS con brotli.
- `index.html`: fuentes Google **no bloqueantes** (`preload as=style` + `onload` + `<noscript>`
  fallback), `theme-color`, geo meta (region MX-BCS, lat/long), `robots` meta, preconnect a
  Cloudinary. Reducido el set de pesos de fuentes cargados.
- `sitemap.xml` + `robots.txt`: migrados a `www.classviptransfers.com` con `lastmod`.
- `SEO.tsx` + `Index.tsx`: `canonical`/JSON-LD consistentes en `www` (una sola URL canónica).
- ⚠️ El primer intento de bundle splitting rompió el build de Vercel (overload de tipos de Rollup con
  `manualChunks` como objeto, y `cssMinify:'esbuild'`/`true` incompatibles con rolldown-vite +
  Tailwind v4). Corregido: función + `cssMinify:false`. `npm run build` verificado verde.

**Pendiente del usuario:** configurar dominio en Vercel (FASE SEO-0) + rotar `SECRET_KEY`.

---

## Fase 31m — Preparación de deploy (Railway + Vercel + Supabase) + seguridad (27 jun 2026)

**Pedido de Marlon:** "deja todo listo para el deploy, que la base de datos funcione bien y sobre todo cosas de seguridad. Railway $5/mes."

**🔴 Fuga de seguridad encontrada y remediada:**
- `backend/-X` era un archivo de cookies de curl (`curl -c -X`) con un **JWT admin real**. Se había subido en el commit inicial a GitHub.
- Remediación: `git rm`, se reescribió el commit inicial (`--amend`), `force-with-lease` push, `reflog expire` + `gc --prune=now`. Verificado: 0 rastros de la firma del token en todo el historial (local y `origin/main`).
- `.gitignore` y `backend/.dockerignore`: agregados patrones `-X`, `*.cookie`, `cookies*.txt`.
- ⚠️ Pendiente del usuario: **rotar `SECRET_KEY` en producción** (invalida el token filtrado; además ya estaba expirado).

**Endurecimiento de seguridad:**
- `main.py`: `/docs`, `/redoc`, `/openapi.json` → `None` en producción (no exponer el esquema de la API). En dev siguen activos.

**Archivos de deploy creados:**
- `backend/Dockerfile` — `python:3.12-slim` + libs de sistema de WeasyPrint (libpango, libcairo, libgdk-pixbuf, fonts-dejavu). Usuario no-root (uid 10001). `pip install .` resuelve `[project.dependencies]`.
- `backend/start.sh` — `alembic upgrade head` y luego `uvicorn` con `--proxy-headers --forwarded-allow-ips='*'` (rate limiter por IP correcto detrás del proxy de Railway). Workers vía `WEB_CONCURRENCY` (default 2).
- `backend/railway.toml` — builder dockerfile, healthcheck `/health`, restart on_failure. Requiere Root Directory = `backend` en Railway.
- `backend/.dockerignore` — excluye .venv, caches, .env, tests del contexto de build.
- `frontend/vercel.json` — framework vite, SPA rewrites (todas las rutas → index.html, evita 404 al refrescar /admin), cabeceras de seguridad, cache de assets.
- `DEPLOY.md` (raíz) — guía completa paso a paso con tabla de variables de entorno.

**Punto crítico documentado (Supabase + Railway):**
- La "Direct connection" de Supabase es solo IPv6; Railway no garantiza salida IPv6 → las migraciones fallarían. Solución documentada: usar el **Session pooler (5432, IPv4)** para `DATABASE_URL` y dejar `DATABASE_URL_DIRECT` vacía. `database.py` no se modificó (auto-detecta).
- `VITE_API_URL` va SIN `/api/v1` (el código ya antepone ese prefijo en cada fetch).
- Railway y Supabase en la **misma región US East (Virginia)** para latencia mínima backend↔DB.

**Verificado:** 114 tests backend verdes con el cambio de docs; `main.py` importa OK. Push limpio a `origin/main` (commit 5b79fb8).

---

## Fase 31k — FinanzasTab: textos legibles en dark mode + botón imprimir (27 jun 2026)

**Pedido de Marlon:** textos negros no se ven en fondo oscuro, y el botón imprimir no hacía nada.

**Problemas encontrados:**
- `XAxis` y `YAxis` de Recharts usan `fill: black` por defecto — invisible sobre `bg-white/[0.04]` en dark mode
- No existía ningún botón ni función de impresión en el archivo

**Cambios en `FinanzasTab.tsx`:**
- `CartesianGrid`: `stroke="rgba(255,255,255,0.1)"` (antes opacity heredada, resultaba negro)
- `XAxis`: `tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}`, `axisLine rgba(255,255,255,0.15)`, `tickLine: false`
- `YAxis`: mismo fill blanco/55, sin ejes, `tickFormatter` con prefijo `$`
- `Tooltip`: `contentStyle` fondo `#0f1623`, borde blanco/12, color blanco; `labelStyle` blanco/55; cursor gold/30
- Agregado import `Printer` de lucide-react
- Nueva función `printSummary()`: abre ventana con HTML blanco, tabla de reservaciones cobradas + KPIs, llama `window.print()` automático y cierra después de imprimir
- Botón "Imprimir" visible solo en tab `summary`, junto al botón "Actualizar"

**Estado:** `npm run build` ✓ sin errores TypeScript.

---

## Fase 31j — Calidad de código: linters a 0 errores + build de producción reparado (27 jun 2026)

**Pedido de Marlon:** "arregla todo esto" (los hallazgos de los linters).

**Backend (Python) — ya estaba casi limpio:**
- ruff check: 2 issues → 0 (try/except/pass + variable sin usar en `pdf.py`)
- ruff format: aplicado a los 3 archivos pendientes
- bandit: 0 Medium/High (solo Low en asserts de tests)
- mypy strict: 329 "errores" pero 84% son anotaciones faltantes + 22 falsos positivos (forward-refs de SQLAlchemy). Cero bugs de runtime.

**Frontend (TypeScript) — de 76 errores eslint → 0:**
- **21 variables/imports muertos** eliminados (AdminBookings, Admin, Book, Confirmation, DashboardOverviewTab, etc.)
- **30 usos de `any`** tipados con interfaces raw (snake_case) por archivo: PricingManager, useBookingCatalog, booking-api, AccountsTab, AdminBookings, FinanzasTab, MarketingTab, DashboardOverviewTab, Admin.
- eslint.config.js: `no-unused-vars` ahora honra prefijo `_`; `set-state-in-effect` bajado a `warn` (18 efectos de carga de datos/reseteo derivado, revisados uno por uno, son patrones correctos)
- shadcn ui (button/tabs): inline-disable de `only-export-components` (solo HMR dev)
- ChatWidget: `Date.now()` movido a helper de módulo `nextMessageId()` (regla purity)

**Código muerto duplicado eliminado:**
- Carpeta literal **`@/`** en la raíz del frontend (19 archivos UI duplicados). Se creó por una herramienta que escribió a la ruta del alias en vez de resolverla (`@`→`src`). Nunca importada, ni compilada (tsconfig solo incluye `src`). Respaldo en scratchpad. Quitarla resolvió 2 errores eslint.

**🔴 Build de producción reparado (estaba roto desde antes):**
- Descubierto al correr `npm run build`: el `tsconfig.json` raíz tiene `"files": []`, así que `tsc --noEmit` no verificaba NADA. El chequeo real es `tsc -b`, que fallaba.
- **react-day-picker v10**: `calendar.tsx` era de v8. Reescrito con las clases nuevas (month_caption, weekdays, week, day_button, button_previous/next…) y el componente `Chevron` (reemplaza IconLeft/IconRight). `initialFocus` → `autoFocus` en Book.tsx (2 usos).
- **Checkout.tsx**: tenía un `interface Booking` que duplicaba `ApiBooking` y no calzaba (faltaba currency). Eliminado el duplicado → usa `ApiBooking` directo, con `customer?.` para el caso nullable.
- **Confirmation.tsx**: bug pre-existente — la función local `fetchBooking` hacía shadowing del import y se llamaba a sí misma (recursión). Renombrada a `loadBooking`.
- **Book.tsx**: `upsellActivities` tipado explícito (`UpsellActivity[]`) — la inferencia colapsaba a `never`.

**Estado final:** `npm run build` ✓ (3860 módulos), eslint 0 errores / 18 warnings documentados, tsc -b limpio, ruff limpio, 114 tests backend verdes.

---

## Fase 31i — Auditoría de base de datos: conexión, tablas, escalabilidad, seguridad (27 jun 2026)

**Pedido de Marlon:** "cheques que siempre la base de datos conecta bien en todas las cosas, que las tablas están bien hechas, escalable sin errores, sin vulnerabilidades."

**Conexión (verificada contra Supabase real, PG 17.6):**
- `database.py` maneja correctamente: Transaction pooler (6543) con NullPool + statement_cache_size=0 + prepared_statement_name_func uuid; Direct/Session pooler con pool_size=5/max_overflow=5/pool_pre_ping/pool_recycle=300; SSL `require` salvo localhost. NO se tocó (regla del proyecto).
- `get_db()` (dependencies.py): una sesión por request, commit/rollback/close automático. Patrón correcto.
- Health checks: `/health` (liveness sin DB), `/health/ready` (SELECT 1, 503 si DB caída).
- Ningún código crea engine/session por fuera de `database.py` salvo el readiness check (uso correcto con `async with`). Sin fugas de conexión.

**Tablas (20, verificadas en DB real):**
- **SIN DRIFT** — todas las columnas de los modelos coinciden con la DB.
- Migración DB = head (`d1e2f3a4b5c6`). Historial lineal, un solo head, sin migraciones pendientes.
- **TODAS las FK tienen índice** → sin full-table-scans en joins ni cascadas (escalable).
- Booking bien diseñado: índices en customer_id, status, booking_date, created_at, (type,status), FKs con ondelete CASCADE, cascade delete-orphan en items/payments/etc.

**Bug de escalabilidad encontrado y corregido:**
- `bookings.confirmation_code` tenía DOS índices: `bookings_confirmation_code_key` (de `unique=True`) + `ix_bookings_confirmation_code` (explícito redundante). El índice duplicado costaba escritura extra y espacio sin aportar nada.
- Fix: quitado el `Index(...)` explícito del modelo + migración `d1e2f3a4b5c6_drop_redundant_confirmation_code_index` (DROP INDEX IF EXISTS, idempotente). Aplicada a la DB → ahora solo queda el índice único.

**Seguridad (verificada, SÓLIDA):**
- **RLS activo en las 20 tablas** del schema public (verificado en DB: NINGUNA sin RLS). Bloquea el acceso directo por la anon key de Supabase/PostgREST saltándose el backend. ENABLE sin FORCE → el rol `postgres` (bypassrls, dueño) que usa el backend no se ve afectado.
- **Sin riesgo de inyección SQL:** ningún `text(f"...")`, concatenación ni `.format()`/`%` en queries. Todo vía ORM/parámetros.
- Endpoints de escritura exigen `get_current_admin`.

**Efecto secundario:** el rediseño del PDF (Fase 31f/g) usaba texto en minúscula + CSS uppercase; 2 tests de `test_pdf.py` verificaban literales en MAYÚSCULA en el HTML crudo. Se pusieron los literales del template en mayúscula (LLEGADA/SALIDA/PICKUP/TOTAL/ORDEN DE SERVICIO) — visual idéntico, tests válidos.

**Validación:** 114 tests verdes (suite completa), `import app.main` OK, DB en sync.

---

## Fase 31h — Auditoría de precios: seguridad, reflejo en página, código muerto (27 jun 2026)

**Pedido de Marlon:** "CHEQUES QUE LO DE LOS PRECIOS FUNCIONA BIEN, QUE SI CAMBIAMOS LOS PRECIOS FUNCIONE BIEN y se vea reflejado en la página, código óptimo, sin fallas de seguridad, sin código duplicado o muerto."

**Seguridad (verificada, SÓLIDA):**
- `BookingService.create_draft` recalcula TODO precio server-side e ignora lo que manda el navegador:
  - TRANSPORTATION → desde `Area` real en DB por `area_id` (one-way/round-trip, sprinter si ≥6 pax)
  - ADDON → desde `PricingExtra.price_cents` por `code` (solo extras `active`)
  - COMBO/CRAZY_COMBO → desde `COMBO_PRICE_CENTS` server-side
  - El cliente NUNCA puede fijar/manipular un precio desde el navegador. Aunque su página tenga un precio viejo en caché, el server cobra el precio vigente.
- Todos los endpoints de escritura (`POST`/`PATCH` hotels/areas/extras) exigen `get_current_admin`.

**Reflejo en página — 2 BUGS encontrados y corregidos:**
1. **Áreas desactivadas seguían apareciendo al cliente.** `useBookingCatalog.ts → fetchAreas` no filtraba `is_active` (extras y hoteles SÍ lo hacían). Fix: `.filter((a) => a.is_active)`. Ahora desactivar un área en el admin la quita del formulario público.
2. **Precio de `LUXURY_WELCOME` hardcodeado en el display.** `Book.tsx` línea 1206 mostraba `$100` fijo (`ex.code === 'LUXURY_WELCOME' ? 10000 : ex.priceCents`) mientras el total y el cobro real usaban `ex.priceCents` de la DB → inconsistencia: cambiar ese precio en el admin no se reflejaba en la tarjeta. Fix: usar `ex.priceCents` siempre. Ahora el precio mostrado = precio cobrado = precio de la DB.

**Código muerto eliminado:**
- `api/v1/pricing.py`: sección vacía "REGLAS DE PRECIO" (solo comentarios, sin endpoints) → eliminada.

**Código muerto detectado pero NO eliminado (requiere migración, anotado para después):**
- Modelo `PricingOverride` (`models/pricing_override.py`) + relación en `Booking.pricing_overrides`: tiene tabla en DB pero NINGÚN servicio/endpoint crea overrides. Es una feature definida y nunca cableada. Quitarla requiere Alembic migration — dejarla no rompe nada. Pendiente decidir si se implementa (anular precio manual con razón/auditoría) o se elimina.

**Duplicación de precios (intencional y EN SYNC, verificada):**
- `COMBO_PRICE_CENTS` (backend) vs Book.tsx: COMBO=$100 (10000¢), CRAZY_COMBO=$125 (12500¢) — coinciden. El backend recalcula igual, así que aunque se desincronizaran el server manda. Documentado en el comentario de `booking.py`.

**Validación:**
- 27 tests verdes: `test_pricing.py` (17) + `test_booking_pricing.py` + `test_booking_service.py`
- `tsc --noEmit` frontend: 0 errores
- `import app.api.v1.pricing` OK

---

## Fase 31g — PDF: footer fijo al fondo + logo verificado (27 jun 2026)

**Problema reportado por Marlon:** "SI ESTA LINEA AZUL NO SALE HASTA ABAJO DE LA HOJA COMO TIENE QUE SER Y NO TIENE LOGO EL PDF ES MUY DIFICIL PONERSELO O QUE PASA"

**Fixes en `backend/app/templates/pdfs/booking_confirmation.html`:**
- Footer: cambiado de `margin-top` a `position: fixed; bottom: 0; left: 0; right: 0` — WeasyPrint soporta `position: fixed` para repetir en cada página
- `body { padding-bottom: 72px }` para que el contenido no quede tapado por el footer fijo
- Footer ahora tiene logo pequeño semitransparente a la derecha del texto de contacto
- Template completamente reescrito (versión limpia, sin residuos de versiones anteriores)

**Verificación:**
- Logo URI: 92,570 chars (PNG 300×300 desde WebP vía Pillow) — cargado OK
- PDF generado: ~86KB (con precios) / ~84KB (sin precios)
- Archivos de prueba: `Desktop/test_booking_FULL.pdf` y `Desktop/test_booking_OPS.pdf`

---

## Fase 31f — PDF profesional con logo, marca de agua, layout premium (27 jun 2026)

**Objetivo:** El PDF de reserva/orden de servicio debe verse como documento corporativo de lujo.

**Cambios en `backend/app/services/pdf.py`:**
- Lee el logo (`frontend/src/assets/logo-class-tio.webp`) al arrancar el módulo
- Lo convierte a data URI base64 para que WeasyPrint lo embeba sin rutas externas
- Redimensionado a 300×300 con `img.thumbnail((300, 300), Image.LANCZOS)` para evitar fallo silencioso de WeasyPrint con imágenes grandes
- Lo pasa al template como variable `logo_data_uri`

**Rediseño completo de `backend/app/templates/pdfs/booking_confirmation.html`:**
- **Marca de agua:** logo semi-transparente (opacity 0.05) centrado en página, `position: fixed`
- **Header:** logo oficial a la izquierda · número de confirmación + badge (Confirmación/Orden) a la derecha — fondo navy `#1a1a2e`
- **Franja dorada:** 4px bajo el header
- **Franja cliente:** tarjeta gris clara con campos en columnas
- **Timeline de servicio:** cada leg con cabecera de color, bloque tiempo en navy con hora dorada 26px
- **Notas:** caja con borde dorado izquierdo
- **Desglose:** tabla con header navy/dorado, bloque TOTAL 24px
- **Footer FIJO:** `position: fixed; bottom: 0` navy — aparece al fondo de CADA página
- Textos descriptivos / explicativos eliminados completamente

---

## Fase 31e — BookingDetailView: pulido UI profesional (27 jun 2026)

**Cambios en `AdminBookings.tsx`:**
- Texto descriptivo "Cada servicio es independiente. En las salidas, la hora mostrada es el pickup..." → eliminado del header del timeline
- Header timeline simplificado: ya no tiene h3 ni párrafo explicativo, solo "Timeline de Servicio" con icono gold
- Etiqueta "Hora de PICKUP (hora del servicio)" → simplificada a "Pickup" / "Hora de llegada"
- Sección Items → rediseñada como "Concepto del Servicio": tarjeta con header separado, cada item tiene nombre grande, badge de tipo pill, y precio en dorado
- Sección Notes → rediseñada como "Notas": header gold, sección Notas del cliente (blanco) y Notas internas (ámbar) con padding propio y divisores sutiles
- Se agregó `MessageSquare` a los imports de lucide-react
- `tsc --noEmit` → 0 errores

---

## Fase 31d — BookingDetailView: tema oscuro completo + pago/cuenta en Edit (27 jun 2026)

Marlon reportó (en mayúsculas) que al dar click en una reserva el texto seguía negro/ilegible, y pidió:
1. Todo el texto legible en la vista de detalle de reserva
2. Vista de detalle organizada: Datos del Cliente / Datos del Servicio / Método de Pago
3. En el formulario de Edit: poder marcar estado de pago (Pendiente / Pagado) y agregar a Cuenta Abierta

**Cambios en `AdminBookings.tsx` (script Python):**

- `Row` component value span: faltaba `text-white` → ahora `text-right text-white ...`
- Items list spans (nombre del item, precio): añadido `text-white`
- Assignment cards driver/vehicle: contenedor sin `text-white` → añadido
- Email log error: `text-red-600` → `text-red-300`
- EditBookingForm departure leg box: `bg-orange-50/40 border-orange-200/70 text-orange-700` → `bg-orange-500/10 border-orange-500/20 text-orange-300`
- Textareas en EditBookingForm: añadido `text-white` a ambas
- Tipo `BookingEditorPayload`: extendido con campo opcional `paymentAction`
- Nuevo tipo `AccountOption` para la lista de cuentas
- `EditBookingForm`: nuevo estado `paymentType`, `paymentMethod`, `selectedAccount`, `accounts`
- `EditBookingForm`: useEffect que carga las cuentas abiertas de `GET /api/v1/admin/accounts`
- `EditBookingForm`: nueva sección UI "Cobro / Cuenta" con 3 opciones (Sin cambios / Marcar como Pagado / Agregar a Cuenta Abierta)
- `BookingDetailView.onSave`: maneja `paymentAction` llamando a `mark-paid` o `/accounts/{id}/bookings` según el tipo
- `tsc --noEmit` → 0 errores tras los cambios

---

## Fase 31c — Eliminar botones muertos + residuos de tema (27 jun 2026)

Revisión de código pedida por Marlon ("que no haya funciones o botones que no funcionen, sin nada... que no se use").

**Botones muertos eliminados — `FinanzasTab.tsx`:**
- Había 2 botones "Recordar" / "Enviar recordatorio" (vista móvil y tabla desktop de Cuentas por Cobrar) cuyo `onClick` solo hacía `console.log('[Finance] Send reminder', item.id)` — **no existe endpoint de recordatorios en el backend** (verificado: 0 coincidencias de `reminder`/`recordatorio` en `app/api/` y `app/services/`). Eran código muerto.
- Eliminados ambos botones, la columna "Accion" de la tabla, y el import `Bell` (que ya no se usaba). `tsc` pasó en verde, confirmando que `Bell` no se usaba en ningún otro lugar.
- Si Marlon quiere recordatorios de cobro reales en el futuro, hay que construir: endpoint backend + plantilla de email + (opcional) registro en `email_logs`. NO se dejó un botón que aparenta funcionar sin hacerlo.

**Residuos de tema claro corregidos (legibilidad en oscuro):**
- 5 `divide-border` (FinanzasTab, PricingManager ×3, TareasTab) → `divide-white/[0.08]`. Eran divisores de tabla que referenciaban la variable `--border` del tema claro, casi invisibles sobre fondo oscuro.

**Validaciones de la revisión completa (27 jun 2026):**
- Frontend `tsc --noEmit` → 0 errores.
- Frontend `vite build` → build de producción OK.
- Backend `import app.main` → OK.
- Backend `pytest` → **114 passed**, cobertura 83.92%.
- DB Supabase real → conecta OK, 6 bookings presentes (3 CANCELLED, 1 DRAFT, 1 PAID, 1 OFFLINE_HOLD).
- Endpoint `POST /api/v1/admin/bookings` (el que usa el form de Nueva Reserva) → cubierto por tests, devuelve 201 y persiste. Tests corren contra SQLite en memoria, aislados de producción.

---

## Fase 31b — Legibilidad completa AdminBookings.tsx (26 jun 2026)

Marlon reportó que los nombres de clientes y datos en el área de Bookings aparecían en negro (ilegibles sobre fondo oscuro).

**Causa:** `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-background`, `hover:bg-muted`, `bg-muted/*` — variables CSS del tema claro — quedaron sin convertir en: mobile cards, tabla desktop, vista de detalle BookingDetailView, headers de columna, KPI de Servicios.

**Fix (script Python — archivo con encoded comments):** reemplazo global de todas las variables CSS de tema claro:
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-white/55` (con variantes `/60`→`/35`, `/70`→`/40`)
- `bg-card` → `bg-white/[0.04]`
- `border-border` → `border-white/10` (con variantes `/50`→`/08`, `/70`→`/08`)
- `hover:bg-muted` → `hover:bg-white/[0.06]`
- `bg-muted` → `bg-white/[0.06]`
- `bg-background` → `bg-white/[0.05]`
- `bg-gray-100 text-gray-700` (badge fallback) → `bg-white/10 text-white/70`

**Resultado:** 0 residuos de tema claro en el archivo. `tsc --noEmit` → 0 errores.

---

## Fase 31 — Rediseño visual admin: navy real, sin textos descriptivos, forms oscuros (26 jun 2026)

Marlon reportó que el diseño seguía viéndose genérico/poco profesional: fondo demasiado negro, textos descriptivos que no pertenecen a la operación, y formularios con fondos blancos flotando sobre fondo oscuro.

**Cambios en `frontend/src/features/admin/pages/Admin.tsx`:**

1. **Fondo de pantalla**: de near-black (`#04091c`/`#050d22`) a navy visible (`#07112e`/`#0c1c3d`). El sidebar también a `#0b1427`/`#102240`. Ahora el azul profundo se lee claramente, no parece black genérico.
2. **Eliminación de textos descriptivos** que no pertenecen a la interfaz operativa:
   - Removido: "View, search and manage all reservations" (sección Bookings)
   - Removido: "Manage transfer rates and service pricing" (sección Pricing)
   - Removido: subtítulo de QuickBookingTab ("Manual reservation entry with cleaner payment handling...")
3. **QuickBookingTab completamente oscuro**: todos los `bg-background`/`border-border`/`text-muted-foreground` reemplazados por equivalentes dark-glass:
   - Inputs y textareas: `border-white/10 bg-white/[0.05] text-white`
   - Selects: `bg-[#0a1628] text-white`
   - Service type buttons inactivos: `border-white/10 bg-white/[0.04]`
   - Payment method buttons inactivos: `border-white/10 bg-white/[0.03]`
4. **Info boxes**: `bg-emerald-50`, `bg-indigo-50`, `bg-amber-50`, `bg-slate-50`, `bg-blue-50` (todos light) → versiones dark `bg-{color}-500/10 border border-{color}-500/25 text-{color}-300`
5. **Result banner** éxito/error: de colores light → dark emerald/red
6. **Pickup time display**: de `bg-amber-50 border-amber-200/80` → `bg-amber-500/10 border-amber-500/25`

**Cambios en `frontend/src/features/admin/components/DashboardOverviewTab.tsx`:**
- Removido: "Servicios, salidas, llegadas y pendientes operativos en una sola vista." (subtítulo redundante)
- Corregido: "No hay servicios programados." de `text-muted-foreground` a `text-white/40`

**Validación:** `tsc --noEmit` → 0 errores.

---

## Fase 30 — Rediseño hoja operacional del día (26 jun 2026)

Marlon pidió que las cards de servicios del día y el formato de impresión sean más detallados y con diseño profesional.

**Cambios en `frontend/src/features/admin/components/DashboardOverviewTab.tsx`:**

**1. Cards de pantalla (OperationsCard expandida).**
Cada servicio del día ahora muestra una tarjeta con borde de color izquierdo:
- Azul para **ARR** (llegadas), naranja para **DEP** (salidas).
- Header de la card: badge `ARR`/`DEP`/`SVC` con color + hora en monospace + descripción de ruta + badge de status.
- Cuerpo: nombre del cliente (bold), hotel/ruta, vuelo (`✈ AA123`) y número de pax a la derecha.
- Pie (si hay notas): `📝 {notas}` separado con border-top.

**2. Tabla de impresión (PDF operacional).**
- Header profesional: logo + "Hoja Operacional" + fecha grande + hora de impresión.
- Resumen pre-tabla: 3 celdas (Total · ARR · DEP) con contadores.
- Tabla rediseñada con thead oscuro (`bg #1e293b text-white`):
  - Primera columna: badge `ARR`/`DEP`/`SVC` con color (azul/naranja/gris).
  - Columnas: Tipo | Hora (monospace, bold 13px) | Cliente | Hotel / Ruta | Vuelo | Pax | Notas.
  - Filas alternas con fondo #f8fafc para legibilidad.
- Footer: orden de impresión + datos de contacto.
- CSS de impresión limpio: `@page` con margin 10mm, sin borders en tabla (solo entre filas), badges inline con color real en papel.

**Validación:** `tsc --noEmit` → 0 errores. Sin cambios de lógica ni datos (solo UI).

## Fase 28 — Eliminar pricing_rules (lógica duplicada) (26 jun 2026)

Marlon (regla suya: cero código/lógica duplicada): el precio ya se define por **área** (tabla `areas`,
bandas 1-5 y 6-11 pax). El tab "Pricing Rules" del admin + la tabla `pricing_rules` (SUV/SPRINTER por
zona) eran legacy y duplicaban esa lógica, confundiendo el sistema. Confirmado que NADA en vivo los usaba:
`PricingService.calculate_price` (que leía rules) no tenía un solo llamador; el booking cobra directo de
`areas` (`booking.py: create_draft`).

**Eliminado (backend):**
- `app/services/pricing.py` — borrado completo (servicio muerto: calculate_price + get_extras +
  calculate_extras_total, sin llamadores).
- `app/models/pricing.py` — quitada la clase `PricingRule` (+ imports `ServiceType/TripType/VehicleClass`).
- `app/models/__init__.py` — quitado `PricingRule` del import y `__all__`.
- `app/schemas/pricing.py` — quitados `CreatePricingRuleRequest/UpdatePricingRuleRequest/
  PricingRuleResponse/PricingRuleListResponse` y enums no usados.
- `app/api/v1/pricing.py` — quitados los 3 endpoints `/rules` (GET/POST/PATCH) y sus imports.
- `scripts/seed.py` — quitado el bloque de PricingRule + import + print "Reglas".
- `scripts/migrate_pricing_from_live.py` — **borrado** (script de un solo uso ya ejecutado, importaba el
  modelo eliminado).
- `app/tests/test_pricing.py` — quitados `test_create_pricing_rule`, el POST de rules en
  `test_pricing_writes_require_auth`, y `"rules"` del loop de lectura pública.
- Migración **`c9f1a2b3d4e5_drop_pricing_rules_table.py`** (head nuevo sobre `b7c4d9e1a2f3`):
  `DROP TABLE IF EXISTS pricing_rules CASCADE`. Aplicada; `to_regclass('public.pricing_rules')` → None.

**Eliminado (frontend):** `PricingManager.tsx` — quitado el tab "Pricing Rules", su interfaz `PricingRule`,
`mapRule`, estados (`rules/editingRule/showRuleForm`), `handleSaveRule`/`handleDeleteRule`, la tabla del
tab y el componente `RuleForm`. Quedan los tabs **Areas / Extras / Hotels** (los reales).

**Verificación:** imports backend OK; **67 tests verdes**; `tsc --noEmit` limpio; migración aplicada
(tabla dropeada); `GET /api/v1/pricing/rules` → **404**, `/areas` y `/extras` → **200**; el booking sigue
cobrando correcto desde `areas` (5 pax banda baja, 6-11 banda alta — sin cambios). Backend reiniciado,
health 200. (`PricingOverride` es otra cosa, NO se tocó.)

**Nota — "muchas funciones del admin no funcionan":** Marlon lo mencionó pero NO especificó cuáles. Queda
**pendiente que indique qué pestañas/acciones del admin fallan** para diagnosticarlas una por una (no se
asumió nada para no romper).

### Fase 27.4 — .env completo con todas las variables (26 jun 2026)

Marlon pidió dejar el `.env` listo con TODAS las variables (ya tenía DB/básicos; faltaban Resend, OpenAI,
Stripe, etc.). Se reescribió `backend/.env` conservando los valores reales de DB/SECRET_KEY y agregando,
bien comentado y agrupado: **Stripe** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`), **Resend/Email**
(`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_BCC`), **OpenAI/agente** (`OPENAI_API_KEY`, `OPENAI_MODEL`,
`OPENAI_WHISPER_MODEL`, `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`), **Admin** (`ADMIN_EMAIL`,
`ADMIN_PASSWORD_HASH`) y `SENTRY_DSN`. Las claves secretas se dejaron **vacías** (variable presente, lista
para pegar) para no romper la degradación con gracia (chat sin OpenAI → 400; emails best-effort). Todas
las claves corresponden 1:1 a `Settings` en `app/core/config.py`. Verificado: `get_settings()` carga sin
error; `.gitignore` raíz ya cubre `.env` (`!.env.example`); el proyecto aún NO es repo git (sin riesgo de
leak por ahora). `.env.example` ya estaba completo, se dejó como plantilla pública.

### Fase 27.3 — Email de cancelación con el mismo diseño detallado (26 jun 2026)

Marlon pidió aplicar el mismo diseño al email de **cancelación** (los más críticos —cliente y empresa—
ya quedaron en 27.1/27.2). `customer_cancelled.html` **reescrito**: badge rojo "Booking Cancelled ✕" +
código, datos del huésped (nombre/email/teléfono/pax), **servicio cancelado por piernas** (mismo
`leg_block.html` LLEGADA/SALIDA con pickup 3h antes), total tachado y nota de política de reembolso, y
footer de contacto. `send_booking_cancelled` ahora usa `build_confirmation_context(payment_method="offline")`.
**Verificación:** render OK (14.3 KB) con todos los datos (cancelado, LLEGADA/SALIDA, SJD→hotel,
pickup 15:00, cliente/correo). 68 tests verdes, backend reiniciado, login 200. Preview
`/tmp/preview_cancelled.html`.

### Fase 27.2 — CORRECCIÓN: emails por piernas (LLEGADA/SALIDA) con lógica real (26 jun 2026)

Marlon corrigió (con razón): la primera versión de los emails mostraba "Pickup / Hotel" plano y vuelos
sueltos, sin la lógica operativa real de la empresa. La regla correcta (ya documentada en Fase 13/F13.1 y
en `booking_operations.py`):
- **LLEGADA (arrival):** Aeropuerto **SJD → Hotel**. Datos: fecha, arrival flight, aerolínea, **hora de
  llegada**, pax.
- **SALIDA (departure):** **Hotel → Aeropuerto**. Datos: fecha de salida (de `metadata.departureDate`),
  departure flight, hora del vuelo, y **PICKUP en el hotel = hora del vuelo − 3h** (hora del servicio).

**Fix:** se reutiliza `build_operation_legs` (la MISMA función que ya usa el PDF) en
`build_confirmation_context` → ahora el contexto trae `legs`. Nuevo partial
`app/templates/emails/leg_block.html` (LLEGADA verde / SALIDA roja) con: fecha, hora del servicio
(en salida etiquetada "Pickup · 3h antes del vuelo"), ruta origen→destino, vuelo, hora del vuelo y
aerolínea. Los 3 templates (`customer_confirmed`, `customer_pending`, `company_notification`) ahora hacen
`{% for leg in legs %}{% include 'leg_block.html' %}{% endfor %}` en vez de los campos planos. Se eliminó
el helper muerto `_flight_text` y las vars `pickup_time/has_*_flight/*_flight_text` del contexto.

**Verificación (round trip realista):** llegada 15 jul AA1212 16:00 (SJD→Grand Velas); salida 20 jul
AA1300 18:00 (Grand Velas→SJD) con **pickup calculado 15:00 = 18:00 − 3h**. Render OK en los 3, **68 tests
verdes** (incl. PDF), imports limpios, backend reiniciado, login 200. Previews regenerados.

### Fase 27.1 — pending + company con el mismo diseño detallado (26 jun 2026)

Marlon pidió aplicar el mismo diseño a los otros dos correos. Ambos reusan `build_confirmation_context`:
- `customer_pending.html` — **reescrito**: badge ámbar "Pending Payment", **botón CTA "Complete Payment"**
  (`payment_url`), datos del huésped, detalles del viaje (hotel/pickup/hora/vuelos), total a pagar y
  método de pago "Payment pending · Stripe" con badge. `send_booking_pending` ahora arma el contexto con
  `payment_method="pending"` y le inyecta `payment_url`.
- `company_notification.html` — **reescrito**: cabecera "Internal Notification", badge de estado de pago,
  cliente (con email clicable), operación completa (hotel/pickup/hora/vuelos/notas) y revenue con desglose.
  `send_company_notification(booking, payment_method=None)` (default "pending") arma el contexto.
- **Verificación:** render de ambos OK (pending 14.3 KB, company 13.0 KB) con todos los datos presentes
  (cliente, correo, teléfono, hotel, pickup time, vuelos, botón de pago + URL, total $309.00, badge Stripe).
  60 tests verdes, imports limpios, backend reiniciado, login 200. Previews en `/tmp/preview_pending.html`
  y `/tmp/preview_company.html`.

---

## Fase 26 — Fix precios 6-11 pax (banda sprinter en $0) (26 jun 2026)

**Reportado por Marlon:** "los precios están mal". Regla de negocio confirmada: 6 zonas y UNA sola
regla de capacidad — **1 a 5 pax = un precio, 6 a 11 pax = otro precio**. El cliente NO elige vehículo
(todo es Sprinter internamente pero no se expone); el cambio de banda es automático por nº de pasajeros.

**Causa raíz:** el flujo de booking (`booking.py: create_draft`) cobra desde la tabla **`areas`**, no
desde `pricing_rules`. En `areas`, los campos de la banda 6-11 (`sprinter_one_way_price_cents` /
`sprinter_round_trip_price_cents`) estaban en **$0** en las 6 zonas. La lógica
`if is_sprinter and area.sprinter_one_way_price_cents > 0` caía al `else` → un grupo de 6+ pagaba el
precio de 1-5. Los precios de 6-11 SÍ estaban establecidos en el proyecto (reglas SPRINTER de
`pricing_rules`, 6-14 pax), solo que nunca se copiaron a `areas.sprinter_*`.

**Fix — migración `b7c4d9e1a2f3_fix_sprinter_prices_6_11_pax.py`** (head nuevo, sobre `38eca4d0c9e6`):
copia a `areas.sprinter_*` los precios de ida de 6-11 por zona; redondo = ida x 1.8 (misma convención
que ya usa `areas` para 1-5). Valores aplicados (ida): Tourist Corridor 145, Cabo San Lucas 155,
San José del Cabo 130, Port Los Cabos 135, Cabo Pacific Area 175, Pacific & East Cape 205. La migración
usa `sa.text()` con params nombrados (alembic corre sobre **asyncpg**, no acepta `%s`). `downgrade()`
las regresa a $0.

**Verificación (base real, simulando la lógica exacta de `create_draft`):** el precio cambia justo en
6 pax. Ej. Tourist Corridor: 5 pax → $100, 6 pax → $145, 11 pax → $145, 6 pax redondo → $261. Las 6
zonas correctas (ver tabla en la migración). Las reglas legacy de `pricing_rules` (SUV/SPRINTER) NO las
usa el booking — se dejaron intactas como referencia.

**PENDIENTE relacionado (NO hecho aún, esperando OK de Marlon):** dedup de hoteles. Hay 6 duplicados
exactos por nombre (cada uno x2): Marina Fiesta Resort and Spa, Grand Velas Los Cabos, Cabo Vista Hotel,
Riu Palace Cabo San Lucas, Los Cabos Golf Resort, Marbella Suites en la Playa. Falta confirmar alcance
(solo esos 6 exactos, o también casi-duplicados) antes de borrar.

---

## Fase 25 — Fix login admin: loop infinito por authCache viejo (26 jun 2026)

**Síntoma reportado por Marlon:** "no puedo entrar al admin" / 401 en consola, pese a contraseña correcta.

**Diagnóstico (validado contra el sistema real):** el backend estaba **100% sano**. Probado vía API con
round-trip de cookie: `POST /api/v1/auth/login` → 200 + `Set-Cookie admin_token`; `GET /api/v1/auth/me`
con la cookie → 200 `{"email":"admin@classviptransfers.com"}`; `GET /api/v1/admin/bookings` con la
cookie → 200. CORS ok (`allow_origins` incluye `localhost:5173`, `allow_credentials=True`), `SECRET_KEY`
fija en `.env` (reiniciar el backend NO invalida cookies). La contraseña `Class361372` verifica True.

**Causa raíz (frontend):** `authCache` es un singleton a nivel módulo en
`frontend/src/features/admin/hooks/useAdminAuth.ts`. Flujo que trababa: (1) entrar a `/admin` sin sesión
→ `/me` 401 → `authCache = UNAUTHENTICATED`; (2) redirige a `/admin/login`; (3) login 200 y cookie OK;
(4) `AdminLogin` hacía `navigate("/admin")` **sin invalidar el caché**; (5) `AdminAuthProvider` al montar
ve `authCache` con `loading:false` y lo reutiliza (no re-consulta `/me`) → `AdminRoute` ve
`authenticated:false` → rebota a `/admin/login` → **loop infinito de login**.

**Fix:** en `frontend/src/features/admin/pages/AdminLogin.tsx`, tras el login exitoso se importa y llama
`invalidateAdminAuthCache()` (export ya existente del hook) **antes** de `navigate("/admin")`. Eso fuerza
un `/me` fresco al montar `/admin`, que con la cookie ya puesta devuelve 200 → entra. **Verificación:**
`npx tsc --noEmit` limpio; Vite aplica el cambio por HMR (requiere hard-refresh del navegador para soltar
el módulo viejo en memoria).

**Fase 24 bis — Contraseña admin garantizada idempotente.** Se creó `backend/scripts/ensure_admin.py`:
asegura que `admin@classviptransfers.com` tenga SIEMPRE `Class361372` (si existe y coincide, no hace nada;
si difiere la re-fija; si no existe, lo crea con rol `admin`). Para correr:
`cd backend && source .venv/bin/activate && python scripts/ensure_admin.py`. Útil tras cualquier reset de
la base. (La contraseña ya estaba correcta — el problema NUNCA fue la contraseña sino el caché del frontend.)

---

### 🧭 ESTADO DE PENDIENTES (al 24 jun 2026)

Lo concreto y sin decisión de negocio quedó cerrado. Lo que sigue **requiere decisión de Marlon o
es de alcance grande** — NO se hizo autónomamente a propósito:

| Pendiente | Por qué no se hizo | Esfuerzo |
|---|---|---|
| **Pantalla de audit log en el admin** | El dato ya se registra y se lee por API (`GET /admin/audit-logs`); falta solo una pestaña en `Admin.tsx` que lo muestre. Decisión: ¿se quiere esa vista? | Chico |
| **SEO real (SSR/prerender)** | El sitio es SPA pura; para que Google vea title/OG por ruta hace falta migrar a SSR (Next.js) o prerender. Es un cambio de arquitectura, no un parche. **→ Ahora hay PLAN SEO PROFESIONAL completo arriba (sección dedicada, 28 jun 2026) con roadmap por fases SEO-0 a SEO-4. Base on-page + performance ya hecha en Fase 31n. Prerender = FASE SEO-2.** | Grande |
| **Verificación end-to-end de Stripe** | El flujo de pago (Fases 18-19) está cubierto por tests con Stripe mockeado; falta una pasada real con claves de test + tarjeta `4242...`. Necesita las claves test en el `.env`. | Chico (cuando haya claves) |

---

### 🔧 GUÍA DE MANTENIMIENTO — leer antes de tocar este proyecto

#### Cómo correr el proyecto en local
```bash
cd backend
source .venv/bin/activate
# .env ya tiene DATABASE_URL apuntando a Supabase real (proyecto acuvfdaelazofeskgpsp)
# o a Postgres local — revisa cuál quieres usar antes de arrancar.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Cómo verificar que la base de datos conecta bien
```bash
cd backend && source .venv/bin/activate
python scripts/test_db.py
```
Si esto falla, **no sigas con nada más** — primero resuelve la conexión (credenciales, SSL,
pooler correcto). Casi siempre el problema está en `DATABASE_URL`/`DATABASE_URL_DIRECT` del `.env`.

#### Cómo actualizar el schema de la base de datos (Alembic)
El schema **nunca** se toca a mano ni con `create_all()`. Todo cambio a un modelo SQLAlGen
(`app/models/*.py`) se refleja con una migración:
```bash
cd backend && source .venv/bin/activate
alembic revision --autogenerate -m "descripcion del cambio"
# revisar el archivo generado en alembic/versions/ antes de aplicar
alembic upgrade head
```
`alembic upgrade head` usa `DATABASE_URL_DIRECT` (o `DATABASE_URL` si la primera está vacía).
**Nunca correr migraciones contra producción sin probarlas primero en local o en una copia.**

#### Cómo correr los tests
```bash
cd backend && source .venv/bin/activate
pytest -q                      # toda la suite (usa SQLite en memoria, no toca Supabase)
pytest -q -k nombre_del_test   # un test específico
```

#### Dónde viven las credenciales reales
`backend/.env` (gitignored, nunca se commitea). Las credenciales de Supabase de producción
(proyecto `acuvfdaelazofeskgpsp`) están ahí. **Si alguna vez se comparten en texto plano**
(chat, captura de pantalla, etc.), rotarlas de inmediato desde el dashboard de Supabase
(`Project Settings → Database → Reset database password`) y actualizar `.env`.

#### Antes de cada deploy a producción
1. `python scripts/test_db.py` contra la URL de producción — debe conectar y ver las 19 tablas.
2. `alembic upgrade head` contra `DATABASE_URL_DIRECT` de producción — aplica migraciones pendientes.
3. `pytest -q` — todo debe estar verde.
4. Confirmar que `ENVIRONMENT=production` está puesto en las variables del servidor — esto activa
   la validación fail-fast (T5) y la cookie `secure=True` (Bloque 2). Sin esto, la app arranca
   en modo "development" en producción, sin esas protecciones.

#### Cómo seguir extendiendo este WORKPLAN
Cada vez que se complete una tarea de `PLAN_PRODUCCION.md`, o se haga cualquier cambio de fondo
al proyecto (nuevo endpoint, bug arreglado, decisión de arquitectura), se documenta en esta
Fase 12 con el mismo formato usado arriba: **qué tarea, qué archivos, qué se hizo, cómo se
verificó, y cualquier bug "extra" que se haya encontrado en el camino** (esos bugs extra suelen
ser más valiosos que la tarea original, porque son los que nadie pidió revisar). Si se abre una
Fase 13 (paridad con el TS, multi-empresa), sigue el mismo patrón de esta Fase 12.

---

### Protocolo obligatorio de aprendizaje línea por línea

Este proyecto NO se construye copiando código a ciegas. Se construye como clase profesional.
Cada vez que se escriba un archivo de código, se sigue este formato:

1. **Primero:** explicar qué problema resuelve el archivo.
2. **Segundo:** escribir el código completo.
3. **Tercero:** explicar cada bloque y cada línea importante.
4. **Cuarto:** ejecutar una verificación real (`pytest`, `ruff`, `mypy`, `curl`, navegador, etc.).
5. **Quinto:** documentar en este WORKPLAN qué se completó y qué aprendiste.

Formato obligatorio para cada archivo nuevo:

```md
#### Archivo: `ruta/del/archivo.py`

**Para qué sirve:**
Explicación simple.

**Código:**
```python
# código aquí
```

**Explicación línea por línea:**
- Línea 1: ...
- Línea 2: ...
- Bloque X: ...

**Riesgo de seguridad si se hace mal:**
- Qué vulnerabilidad puede aparecer.
- Cómo este código la evita.

**Verificación:**
```bash
comando real
```
Resultado esperado: ...
```

Regla de oro: si Marlon no puede explicar para qué sirve una línea, esa línea todavía no está terminada.

### Política de avance: no pasar fase sin calidad

Una fase solo se marca como terminada si pasan estos comandos:

```bash
ruff format --check .
ruff check .
mypy app
pytest -q --cov=app
bandit -r app
pip-audit
```

Si alguno falla, NO se avanza. Primero se entiende el error, luego se arregla.

---

## 0. VISIÓN GENERAL

### ¿Qué es ClassVIP Transfers?

Un sistema de transporte de lujo que permite a clientes reservar transfers (aeropuerto ↔ hotel), actividades turísticas, y combos. Incluye panel de administración completo para gestionar reservas, finanzas, marketing, RRHH, y configuración de precios.

### Módulos del sistema

| # | Módulo | ¿Qué hace? |
|---|--------|------------|
| 1 | **Booking Engine** | Reservas de transporte y actividades con validación completa |
| 2 | **Pricing Engine** | Precios dinámicos por zona, tipo de vehículo, pasajeros |
| 3 | **Stripe Payments** | Pagos con tarjeta, webhooks, reembolsos |
| 4 | **Admin Dashboard** | Panel de control con estadísticas, gráficas, gestión |
| 5 | **Auth & Security** | Login de administradores con JWT + cookies seguras |
| 6 | **Email Service** | Correos transaccionales (confirmación, cancelación, PDF) |
| 7 | **PDF Generation** | Facturas y confirmaciones en PDF |
| 8 | **Driver & Vehicle Mgmt** | Gestión de conductores y flota de vehículos |
| 9 | **Client Accounts** | Cuentas por cobrar para clientes frecuentes |
| 10 | **AI Chat** | Asistente conversacional para reservas por chat |
| 11 | **Audit Logging** | Registro de toda acción administrativa |
| 12 | **Multi-language (i18n)** | Inglés y español |

### Stack tecnológico (TypeScript original → Python nuevo)

| Capa | TypeScript (original) | Python (nuevo) | ¿Por qué? |
|------|----------------------|----------------|-----------|
| **Framework web** | Express | **FastAPI** | Async nativo, OpenAPI automático, tipado |
| **ORM** | Prisma | **SQLAlchemy 2.0** | Más maduro, queries complejos, async |
| **Validación** | Zod | **Pydantic v2** | Más potente, mismo concepto |
| **Auth** | jsonwebtoken | **PyJWT + python-jose** | Mismo estándar JWT |
| **Pagos** | Stripe SDK JS | **Stripe Python SDK** | API idéntica |
| **Email** | Resend SDK | **Resend Python SDK** | Mismo proveedor |
| **PDF** | PDFKit | **WeasyPrint + Jinja2** | HTML → PDF, más control de diseño |
| **Testing** | Vitest | **pytest + pytest-asyncio** | Más potente, fixtures |
| **Frontend** | React + Vite | **React + Vite (mismo)** | Se mantiene el frontend existente |
| **DB** | PostgreSQL (Supabase) | **PostgreSQL (Supabase o local)** | Misma DB |
| **Task queue** | N/A | **Celery + Redis** | Para emails async y tareas pesadas |

### Estructura de carpetas propuesta

```
classvip-transfers-python/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Settings desde .env (pydantic-settings)
│   │   ├── database.py                # SQLAlchemy engine + session
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── admin.py               # AdminUser
│   │   │   ├── customer.py            # Customer
│   │   │   ├── booking.py             # Booking, BookingItem
│   │   │   ├── payment.py             # Payment
│   │   │   ├── pricing.py             # Hotel, Area, PricingRule, PricingExtra
│   │   │   ├── driver.py              # Driver
│   │   │   ├── vehicle.py             # Vehicle
│   │   │   ├── client_account.py      # ClientAccount, AccountCharge, AccountPayment
│   │   │   ├── audit.py               # AdminAuditLog
│   │   │   ├── email_log.py           # EmailLog
│   │   │   └── ai_conversation.py     # AIConversation
│   │   ├── schemas/                   # Pydantic schemas (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── booking.py
│   │   │   ├── auth.py
│   │   │   ├── admin.py
│   │   │   ├── pricing.py
│   │   │   ├── payment.py
│   │   │   └── customer.py
│   │   ├── api/                       # Route handlers (controllers)
│   │   │   ├── __init__.py
│   │   │   ├── router.py              # Main router aggregation
│   │   │   ├── v1/                    # API v1
│   │   │   │   ├── __init__.py
│   │   │   │   ├── bookings.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── admin.py
│   │   │   │   ├── pricing.py
│   │   │   │   ├── hotels.py
│   │   │   │   ├── stripe.py
│   │   │   │   └── ai.py
│   │   ├── core/                      # Configuración transversal del sistema
│   │   │   ├── __init__.py
│   │   │   ├── config.py              # Settings tipados desde .env
│   │   │   ├── logging.py             # Logs estructurados + request id
│   │   │   ├── security.py            # JWT, hashing, cookies, permisos
│   │   │   ├── constants.py           # Constantes globales controladas
│   │   │   └── exceptions.py          # Excepciones de dominio
│   │   ├── repositories/              # Acceso a datos, queries SQLAlchemy
│   │   │   ├── __init__.py
│   │   │   ├── booking_repository.py
│   │   │   ├── customer_repository.py
│   │   │   ├── pricing_repository.py
│   │   │   └── admin_repository.py
│   │   ├── services/                  # Lógica de negocio pura
│   │   │   ├── __init__.py
│   │   │   ├── booking.py
│   │   │   ├── pricing.py
│   │   │   ├── email.py
│   │   │   ├── pdf.py
│   │   │   ├── stripe.py
│   │   │   ├── driver_vehicle.py
│   │   │   ├── audit.py
│   │   │   └── ai.py
│   │   ├── middleware/                # Starlette middleware
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── cors.py
│   │   │   ├── rate_limit.py
│   │   │   └── error_handler.py
│   │   ├── templates/                 # Jinja2 HTML templates (emails, PDFs)
│   │   │   ├── emails/
│   │   │   │   ├── customer_confirmed.html
│   │   │   │   ├── customer_pending.html
│   │   │   │   ├── customer_cancelled.html
│   │   │   │   └── company_notification.html
│   │   │   └── pdfs/
│   │   │       └── booking_confirmation.html
│   │   ├── utils/                     # Utilidades
│   │   │   ├── __init__.py
│   │   │   ├── security.py            # Password hashing, JWT
│   │   │   ├── tokens.py              # Booking tokens, PDF tokens
│   │   │   └── errors.py              # Error helpers
│   │   └── tests/                     # pytest tests
│   │       ├── __init__.py
│   │       ├── conftest.py            # Fixtures: client, db, auth
│   │       ├── test_auth.py
│   │       ├── test_bookings.py
│   │       ├── test_pricing.py
│   │       ├── test_stripe.py
│   │       ├── test_admin.py
│   │       └── test_email.py
│   ├── alembic/                       # Migraciones de DB
│   │   └── versions/
│   ├── alembic.ini
│   ├── uv.lock / requirements.lock     # Lockfile reproducible generado, no escrito a mano
│   ├── pyproject.toml
│   └── .env.example
├── frontend/                          # React (se mantiene del original)
│   └── ... (misma estructura React)
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── scripts/
│   ├── seed.py                        # Datos semilla (hoteles, pricing)
│   └── setup_db.py                    # Crear DB y admin inicial
├── .env.example
├── .gitignore
├── Makefile
└── README.md
```

---

## 1. FASES DEL PROYECTO

El proyecto se divide en **10 fases**, cada una con tareas específicas. Cada tarea incluye:

- **Qué archivo crear/modificar**
- **El código completo**
- **Explicación línea por línea**
- **Cómo verificar que funciona**

### Reglas de arquitectura profesional

Para que el código quede limpio, cada capa tiene una responsabilidad estricta:

| Capa | Carpeta | Qué puede hacer | Qué NO debe hacer |
|------|---------|----------------|------------------|
| API | `app/api/v1/` | Recibir request, llamar servicio, devolver response | No debe tener SQL ni lógica de negocio pesada |
| Schemas | `app/schemas/` | Validar entrada/salida con Pydantic | No debe consultar DB |
| Services | `app/services/` | Reglas de negocio: precios, estados, pagos, emails | No debe saber detalles de HTTP |
| Repositories | `app/repositories/` | Queries SQLAlchemy | No debe decidir reglas de negocio |
| Models | `app/models/` | Representar tablas de DB | No debe validar requests HTTP |
| Core | `app/core/` | Config, seguridad, logging, errores base | No debe depender de features específicas |
| Middleware | `app/middleware/` | Interceptar requests globales | No debe mezclar reglas de booking/precios |

**Ejemplo:**

- Endpoint `POST /api/bookings` recibe JSON.
- Pydantic valida el JSON.
- `BookingService.create_draft()` decide reglas de negocio.
- `BookingRepository` guarda en PostgreSQL.
- Endpoint devuelve `BookingResponse`.

Si una función mezcla varias capas, se refactoriza antes de avanzar.


---

### FASE 1 — FUNDACIÓN DEL PROYECTO

**Objetivo:** Crear la estructura base, el entorno virtual, FastAPI corriendo con health check, configuración con pydantic-settings, y conexión a PostgreSQL.

#### 1.1 — Crear carpeta del proyecto y entorno virtual

```bash
mkdir -p ~/classvip-transfers-python/backend/app/{api/v1,core,models,schemas,repositories,services,middleware,templates/{emails,pdfs},utils,tests}
cd ~/classvip-transfers-python/backend
python3.12 -m venv .venv
source .venv/bin/activate
```

**Explicación:**
- `mkdir -p` crea toda la estructura de carpetas de una vez.
- `api/v1` guarda los endpoints HTTP versionados. Ejemplo: `/api/v1/bookings`.
- `core` guarda configuración, seguridad, logging, constantes y excepciones base.
- `models` guarda los modelos SQLAlchemy, o sea las tablas de la base de datos.
- `schemas` guarda los modelos Pydantic que validan requests y responses.
- `repositories` guarda las consultas de base de datos. Aquí vive SQLAlchemy query logic.
- `services` guarda reglas de negocio. Ejemplo: calcular precio, crear reserva, confirmar pago.
- `middleware` guarda código que intercepta requests antes de llegar al endpoint.
- `templates/emails` guarda HTML de correos transaccionales.
- `templates/pdfs` guarda HTML que luego se convierte a PDF.
- `utils` guarda helpers pequeños que no pertenecen a una feature específica.
- `tests` guarda pruebas automatizadas.
- `python3.12 -m venv .venv` crea un entorno virtual aislado usando Python 3.12.
- `source .venv/bin/activate` activa el entorno; todo lo instalado queda aislado del sistema.

#### 1.2 — `backend/pyproject.toml` — Configuración profesional del proyecto Python

**Decisión profesional:** La fuente de verdad de dependencias será `pyproject.toml`.
El lockfile (`uv.lock` o `requirements.lock`) se genera automáticamente para que producción instale exactamente las mismas versiones.

**Por qué no depender solo de `requirements.txt`:**
- `requirements.txt` plano se vuelve difícil de mantener.
- No separa bien producción vs desarrollo.
- No documenta herramientas de calidad.
- No expresa metadata del proyecto.

Usaremos:
- `pyproject.toml` → definición humana del proyecto.
- `uv.lock` → versiones exactas reproducibles.
- `ruff` → formato + lint.
- `mypy` → type checking.
- `pytest` → pruebas.
- `bandit` + `pip-audit` → seguridad.

```toml
[project]
name = "classvip-transfers"
version = "0.1.0"
description = "ClassVIP Transfers — Luxury Transportation Booking System"
readme = "README.md"
requires-python = ">=3.12"
authors = [
    { name = "ClassVIP Transfers", email = "admin@classviptransfers.com" }
]

# Dependencias de PRODUCCIÓN.
# Regla: aquí solo va lo que necesita el servidor para correr.
dependencies = [
    # Web framework y servidor ASGI
    "fastapi>=0.115,<0.116",
    "uvicorn[standard]>=0.32,<0.33",
    "orjson>=3.10,<4.0",

    # Configuración y validación
    "pydantic>=2.9,<3.0",
    "pydantic-settings>=2.6,<3.0",
    "email-validator>=2.2,<3.0",

    # Base de datos y migraciones
    "sqlalchemy[asyncio]>=2.0,<2.1",
    "asyncpg>=0.30,<0.31",
    "alembic>=1.14,<2.0",

    # Seguridad: JWT, password hashing y rate limiting
    "pyjwt[crypto]>=2.10,<3.0",
    "pwdlib[argon2]>=0.2,<0.3",
    "itsdangerous>=2.2,<3.0",
    "slowapi>=0.1,<0.2",

    # Integraciones externas
    "stripe>=11.0,<12.0",
    "resend>=2.6,<3.0",
    "httpx>=0.27,<0.28",

    # Templates, PDF y archivos
    "jinja2>=3.1,<4.0",
    "weasyprint>=62,<63",
    "aiofiles>=24.1,<25.0",

    # Tareas en background
    "celery>=5.4,<6.0",
    "redis>=5.2,<6.0",

    # Observabilidad
    "structlog>=24.4,<25.0",
    "sentry-sdk[fastapi]>=2.18,<3.0",
]

[project.optional-dependencies]
# Dependencias de DESARROLLO.
# Regla: aquí va lo que ayuda a programar, probar y auditar, pero no es necesario en producción.
dev = [
    "pytest>=8.3,<9.0",
    "pytest-asyncio>=0.24,<0.25",
    "pytest-cov>=5.0,<6.0",
    "pytest-mock>=3.14,<4.0",
    "factory-boy>=3.3,<4.0",
    "faker>=30.0,<31.0",
    "freezegun>=1.5,<2.0",
    "respx>=0.21,<0.22",
    "ruff>=0.7,<0.8",
    "mypy>=1.13,<2.0",
    "pre-commit>=4.0,<5.0",
    "bandit>=1.7,<2.0",
    "pip-audit>=2.7,<3.0",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "F",    # pyflakes
    "I",    # import sorting
    "B",    # bugbear: bugs comunes
    "UP",   # pyupgrade
    "ASYNC",# errores async
    "S",    # seguridad básica
]
ignore = [
    "S101", # permitir assert en tests
]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
line-ending = "lf"

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true

[[tool.mypy.overrides]]
module = ["stripe.*", "resend.*", "weasyprint.*"]
ignore_missing_imports = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["app/tests"]
addopts = "-q --cov=app --cov-report=term-missing --cov-fail-under=85"

[tool.coverage.run]
branch = true
source = ["app"]

[tool.coverage.report]
show_missing = true
skip_covered = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]

[tool.bandit]
exclude_dirs = ["app/tests"]
```

**Explicación importante de dependencias:**

- `fastapi`: framework principal de la API.
- `uvicorn[standard]`: servidor que ejecuta FastAPI.
- `orjson`: serialización JSON rápida para respuestas grandes del admin.
- `pydantic`: validación de entrada/salida.
- `pydantic-settings`: configuración desde `.env` con tipos.
- `email-validator`: validación real de emails en Pydantic.
- `sqlalchemy[asyncio]`: ORM profesional con soporte async.
- `asyncpg`: driver PostgreSQL async rápido.
- `alembic`: migraciones versionadas de DB; producción NUNCA depende de `create_all`.
- `pyjwt[crypto]`: JWT moderno. Preferido aquí sobre `python-jose` para mantener superficie menor.
- `pwdlib[argon2]`: hashing moderno de passwords con Argon2.
- `itsdangerous`: tokens firmados cortos para enlaces de PDF/booking cuando no conviene JWT.
- `slowapi`: rate limiting para login, booking público y AI chat.
- `stripe`: pagos.
- `resend`: email transaccional.
- `httpx`: llamadas HTTP async y cliente de pruebas.
- `jinja2`: templates HTML para email/PDF.
- `weasyprint`: HTML a PDF.
- `aiofiles`: manejo async de archivos si se necesita.
- `celery` + `redis`: tareas en background.
- `structlog`: logs estructurados profesionales, no `print()` en producción.
- `sentry-sdk[fastapi]`: errores de producción con stacktrace y contexto.
- `ruff`: formato/lint rápido.
- `mypy`: obliga a código tipado y entendible.
- `pytest-cov`: cobertura de pruebas.
- `factory-boy` + `faker`: crear datos de test limpios.
- `respx`: mockear llamadas HTTP externas.
- `freezegun`: congelar fechas en tests.
- `bandit`: detectar patrones inseguros en código Python.
- `pip-audit`: detectar dependencias con CVEs.

**Comandos de instalación profesional:**

```bash
cd ~/classvip-transfers-python/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip uv
uv sync --extra dev
```

**Verificación de herramientas:**

```bash
python --version     # debe ser Python 3.12+
uv --version
ruff --version
mypy --version
pytest --version
```

#### 1.3 — `backend/.env.example` — Variables de entorno

```env
# ─── Base de datos ───
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/classvip

# ─── Security ───
SECRET_KEY=change-me-to-a-random-64-char-string
ADMIN_EMAIL=admin@classviptransfers.com
ADMIN_PASSWORD_HASH=  # generado con script de hash

# ─── Stripe ───
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx

# ─── Resend (Email) ───
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=ClassVIP Transfers <bookings@classviptransfers.com>
EMAIL_BCC=operations@classviptransfers.com

# ─── Frontend ───
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173

# ─── Environment ───
ENVIRONMENT=development
LOG_LEVEL=INFO
```

#### 1.4 — `backend/app/core/config.py` — Configuración tipada

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configuración central de la aplicación.
    
    Todas las variables se leen del .env automáticamente.
    Pydantic valida los tipos al iniciar.
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
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Singleton: solo se lee .env una vez."""
    return Settings()
```

**Explicación línea por línea:**
- `BaseSettings` — clase de pydantic-settings que lee automáticamente el archivo `.env`
- Cada atributo con type hint (`str`, `int`) es validado al iniciar
- El valor después del `=` es el default si la variable no está en `.env`
- `class Config: env_file = ".env"` — le dice a pydantic que busque el archivo `.env`
- `@lru_cache()` — decorador que cachea el resultado; `get_settings()` solo lee el .env una vez
- Esto evita abrir el archivo en cada request

#### 1.5 — `backend/app/__init__.py` — Módulo principal

```python
"""ClassVIP Transfers — Backend API."""
```

#### 1.6 — `backend/app/database.py` — Conexión a PostgreSQL

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# El engine es el "motor" que conecta con PostgreSQL
# create_async_engine es la versión async (para FastAPI)
engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",  # Muestra SQL en consola en dev
    pool_size=20,      # Máximo de conexiones simultáneas
    max_overflow=10,   # Conexiones extra si el pool se llena
)

# async_sessionmaker crea sesiones de DB bajo demanda
# Cada request de FastAPI usa su propia sesión
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # No expirar objetos después de commit
)


class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy."""
    pass
```

**Explicación:**
- `create_async_engine` — crea la conexión a PostgreSQL usando asyncpg por debajo
- `pool_size=20` — máximo 20 conexiones abiertas al mismo tiempo
- `max_overflow=10` — si las 20 están ocupadas, permite 10 más (30 total máximo)
- `async_sessionmaker` — fábrica de sesiones; cada vez que llamas `AsyncSessionLocal()` obtienes una sesión nueva
- `expire_on_commit=False` — los objetos no se "expiran" después de commit (importante en async)
- `DeclarativeBase` — clase base de SQLAlchemy 2.0 para definir modelos con type hints

#### 1.7 — `backend/app/main.py` — Entry point de FastAPI

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.database import engine, Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Código que corre al iniciar y al apagar el servidor."""
    # Al iniciar: crear tablas si no existen (solo en desarrollo)
    if settings.environment == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    # Al apagar: cerrar conexiones
    await engine.dispose()


# Crear la aplicación FastAPI
app = FastAPI(
    title="ClassVIP Transfers API",
    description="Luxury Transportation Booking System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",        # Swagger UI
    redoc_url="/redoc",      # ReDoc
)

# ─── CORS ───
origins = [o.strip() for o in settings.allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ───
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Endpoint de health check. Responde si el servidor está vivo."""
    return {"status": "ok", "timestamp": "2026-06-14T00:00:00Z"}


# ─── Root ───
@app.get("/")
async def root():
    return {
        "app": "ClassVIP Transfers API",
        "version": "1.0.0",
        "docs": "/docs",
    }
```

**Explicación línea por línea:**
- `@asynccontextmanager` — permite código async en el ciclo de vida de FastAPI
- `lifespan` — función que FastAPI llama al iniciar (`yield` antes) y al apagar (`yield` después)
- `Base.metadata.create_all` — crea todas las tablas definidas en los modelos (solo en dev; en prod usas Alembic)
- `FastAPI(...)` — constructor de la app; `title` y `description` aparecen en `/docs`
- `CORSMiddleware` — permite que el frontend (en otro puerto) haga requests al backend
- `allow_origins` — solo los dominios en `ALLOWED_ORIGINS` pueden llamar a la API
- Health check en `/health` y `/api/health` — útil para monitoreo

#### 1.8 — Verificar que corre

```bash
cd ~/classvip-transfers-python/backend
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Abrir `http://localhost:8000/health` — debe responder `{"status": "ok", ...}`  
Abrir `http://localhost:8000/docs` — debe mostrar Swagger UI con los endpoints

---

### FASE 2 — MODELOS DE BASE DE DATOS (SQLAlchemy)

**Objetivo:** Definir todas las tablas como modelos SQLAlchemy, reflejando exactamente el schema de Prisma del proyecto original.

#### 2.1 — Enums compartidos

Archivo: `backend/app/models/enums.py`

```python
import enum


class BookingType(str, enum.Enum):
    TRANSPORTATION = "TRANSPORTATION"
    ACTIVITY = "ACTIVITY"
    COMBO = "COMBO"
    CRAZY_COMBO = "CRAZY_COMBO"


class BookingStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAID = "PAID"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    OFFLINE_HOLD = "OFFLINE_HOLD"


class BookingSource(str, enum.Enum):
    WEBSITE = "WEBSITE"
    PHONE = "PHONE"
    WHATSAPP = "WHATSAPP"
    ADMIN = "ADMIN"
    AI_CHAT = "AI_CHAT"


class BookingItemType(str, enum.Enum):
    TRANSPORTATION = "TRANSPORTATION"
    ACTIVITY = "ACTIVITY"
    ADDON = "ADDON"
    PARK_ENTRANCE = "PARK_ENTRANCE"
    COMBO = "COMBO"
    CRAZY_COMBO = "CRAZY_COMBO"


class PaymentProvider(str, enum.Enum):
    STRIPE = "STRIPE"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    MANUAL = "MANUAL"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class ServiceType(str, enum.Enum):
    TRANSFER = "TRANSFER"
    ACTIVITY = "ACTIVITY"
    COMBO = "COMBO"


class TripType(str, enum.Enum):
    ONE_WAY = "ONE_WAY"
    ROUND_TRIP = "ROUND_TRIP"


class VehicleClass(str, enum.Enum):
    SUV = "SUV"
    SUBURBAN = "SUBURBAN"
    SPRINTER = "SPRINTER"
    VAN = "VAN"
    SEDAN = "SEDAN"
    LUXURY = "LUXURY"


class ExtraCode(str, enum.Enum):
    INCLUDED_BASIC_KIT = "INCLUDED_BASIC_KIT"
    GROCERY_STOP = "GROCERY_STOP"
    EXTRA_STOP = "EXTRA_STOP"
    BABY_SEAT = "BABY_SEAT"
    BOOSTER = "BOOSTER"
    MEET_GREET = "MEET_GREET"
    SPECIAL_ASSISTANCE = "SPECIAL_ASSISTANCE"
    OVERSIZE_LUGGAGE = "OVERSIZE_LUGGAGE"
    WAIT_TIME = "WAIT_TIME"
    LATE_NIGHT = "LATE_NIGHT"
    EARLY_MORNING = "EARLY_MORNING"
    CHAMPAGNE = "CHAMPAGNE"
    CHAMPAGNE_UPGRADE = "CHAMPAGNE_UPGRADE"
    LUXURY_WELCOME = "LUXURY_WELCOME"
    ROMANTIC_KIT = "ROMANTIC_KIT"
    BIRTHDAY_KIT = "BIRTHDAY_KIT"
    DELUXE_ARRIVAL_KIT = "DELUXE_ARRIVAL_KIT"


class PricingMode(str, enum.Enum):
    PER_BOOKING = "PER_BOOKING"
    PER_STOP = "PER_STOP"
    PER_SEAT = "PER_SEAT"
    PER_HOUR = "PER_HOUR"


class ClientAccountStatus(str, enum.Enum):
    OPEN = "OPEN"
    ON_HOLD = "ON_HOLD"
    SETTLED = "SETTLED"
    CLOSED = "CLOSED"


class AccountChargeStatus(str, enum.Enum):
    PENDING = "PENDING"
    INVOICED = "INVOICED"
    PAID = "PAID"
    VOID = "VOID"


class AccountPaymentMethod(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CARD = "CARD"
    MANUAL = "MANUAL"


class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    CONFIRM = "CONFIRM"
    CANCEL = "CANCEL"
    ASSIGN = "ASSIGN"
    PAYMENT = "PAYMENT"
    PRICING_OVERRIDE = "PRICING_OVERRIDE"


class EmailType(str, enum.Enum):
    CUSTOMER_CONFIRMATION = "CUSTOMER_CONFIRMATION"
    COMPANY_NOTIFICATION = "COMPANY_NOTIFICATION"
    ADMIN_RESEND = "ADMIN_RESEND"
    BOOKING_RECEIVED = "BOOKING_RECEIVED"
    MANUAL_CONFIRMED = "MANUAL_CONFIRMED"
    CANCELLED = "CANCELLED"


class EmailStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
```

**Explicación:**
- `str, enum.Enum` — hereda de str para que SQLAlchemy pueda guardar el valor como string en la DB
- Cada enum representa una columna que solo acepta valores específicos
- Son idénticos al schema de Prisma del proyecto original

#### 2.2 — Modelos principales (ejemplo: Booking)

Archivo: `backend/app/models/booking.py`

```python
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import BookingType, BookingStatus, BookingSource


class Booking(Base):
    """Modelo principal de reservas.
    
    Cada reserva representa un servicio de transporte o actividad
    solicitado por un cliente.
    """
    __tablename__ = "bookings"

    # ─── Primary Key ───
    # UUID v4 generado en Python (equivalente a cuid() de Prisma)
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # ─── Tipo y estado ───
    # Enum de Python → el valor string se guarda en PostgreSQL
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

    # ─── Cliente ───
    # ForeignKey → referencia a la tabla customers
    customer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    # relationship → acceso a objeto Customer desde Booking
    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="bookings",
    )

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
    pickup_time: Mapped[Optional[str]] = mapped_column(
        String(5),
        nullable=True,
        comment="Hora exacta de pickup (HH:MM)",
    )

    # ─── Ubicaciones ───
    pickup_location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dropoff_location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ─── Vuelos ───
    flight_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    arrival_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    arrival_airline: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    departure_flight_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    departure_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    departure_airline: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ─── Precios (en centavos, para evitar floats) ───
    total_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Total en centavos (USD)",
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    subtotal_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    discount_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tax_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ─── Pasajeros ───
    passengers: Mapped[int] = mapped_column(Integer, default=1)

    # ─── Detalles del servicio ───
    service_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    trip_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    route: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ─── Código de confirmación (único) ───
    confirmation_code: Mapped[Optional[str]] = mapped_column(
        String(20),
        unique=True,
        nullable=True,
    )

    # ─── Notas ───
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # JSON nativo de PostgreSQL
    metadata_: Mapped[Optional[dict]] = mapped_column(
        "metadata",
        JSON,
        nullable=True,
    )

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
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Relaciones ───
    # back_populates conecta con el atributo "booking" en el otro modelo
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
    pricing_overrides: Mapped[List["PricingOverride"]] = relationship(
        "PricingOverride",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    assignments: Mapped[List["BookingAssignment"]] = relationship(
        "BookingAssignment",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    email_logs: Mapped[List["EmailLog"]] = relationship(
        "EmailLog",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    ai_conversations: Mapped[List["AIConversation"]] = relationship(
        "AIConversation",
        back_populates="booking",
    )

    # ─── Índices (importantes para performance) ───
    __table_args__ = (
        Index("ix_bookings_customer_id", "customer_id"),
        Index("ix_bookings_status", "status"),
        Index("ix_bookings_booking_date", "booking_date"),
        Index("ix_bookings_created_at", "created_at"),
        Index("ix_bookings_type_status", "type", "status"),
        Index("ix_bookings_confirmation_code", "confirmation_code"),
    )

    def __repr__(self):
        return f"<Booking(id={self.id}, status={self.status}, amount={self.total_amount})>"
```

**Explicación detallada de conceptos clave:**

1. **`Mapped[str]`** — type hint de SQLAlchemy 2.0. El ORM sabe que esta columna es String.
2. **`mapped_column(...)`** — define la columna real en PostgreSQL.
3. **`ForeignKey("customers.id", ondelete="CASCADE")`** — si borras un customer, se borran sus bookings.
4. **`relationship(...)`** — no es una columna real. Es un atajo de Python para navegar entre objetos relacionados. `booking.customer` te da el objeto Customer.
5. **`back_populates`** — conecta bidireccionalmente. Si `Booking.customer` apunta a Customer, `Customer.bookings` apunta de vuelta.
6. **`cascade="all, delete-orphan"`** — si borras un booking, se borran sus items, payments, etc.
7. **Precios en centavos** — usar `Integer` para dinero evita errores de redondeo de floats.
8. **`metadata_` con `"metadata"`** — el atributo Python se llama `metadata_` pero la columna en DB se llama `metadata` (porque `metadata` es una propiedad reservada de SQLAlchemy).
9. **`__table_args__`** — define índices. Los índices aceleran búsquedas pero ralentizan escrituras. Solo indexa columnas que usas en WHERE/JOIN frecuentemente.

#### 2.3 — Resto de modelos

Los modelos restantes siguen exactamente el mismo patrón. Cada archivo contiene un modelo SQLAlchemy con:
- `__tablename__` — nombre de la tabla
- Columnas con `Mapped` + `mapped_column`
- `ForeignKey` donde hay relaciones
- `relationship` para navegación
- Índices en `__table_args__`

Modelos a crear:
- `backend/app/models/admin.py` → AdminUser
- `backend/app/models/customer.py` → Customer
- `backend/app/models/payment.py` → Payment
- `backend/app/models/pricing.py` → Hotel, Area, PricingRule, PricingExtra
- `backend/app/models/driver.py` → Driver
- `backend/app/models/vehicle.py` → Vehicle
- `backend/app/models/booking_item.py` → BookingItem
- `backend/app/models/booking_assignment.py` → BookingAssignment
- `backend/app/models/pricing_override.py` → PricingOverride
- `backend/app/models/client_account.py` → ClientAccount, AccountCharge, AccountPayment
- `backend/app/models/audit.py` → AdminAuditLog
- `backend/app/models/email_log.py` → EmailLog
- `backend/app/models/ai_conversation.py` → AIConversation

---

### FASE 3 — ESQUEMAS PYDANTIC (Validación de datos)

**Objetivo:** Crear schemas Pydantic para validar cada request y response de la API. Esto es equivalente a Zod en el proyecto TypeScript.

#### 3.1 — Diferencia entre modelo SQLAlchemy y schema Pydantic

| | SQLAlchemy Model | Pydantic Schema |
|---|---|---|
| **Propósito** | Mapear tabla de DB | Validar datos de API |
| **Dónde se usa** | Dentro del servicio (capa de negocio) | En los endpoints (request/response) |
| **Relaciones** | `relationship` a otros modelos | IDs o modelos anidados |
| **Ejemplo** | `Booking.total_amount: int` | `total_amount: int = Field(ge=0)` |

**Regla de oro:** NUNCA expongas modelos SQLAlchemy directamente en la API. Siempre conviértelos a schemas Pydantic. Esto evita:
- Exponer campos internos (password_hash)
- Problemas de serialización con objetos lazy-loaded
- Acoplamiento entre DB y API

#### 3.2 — Ejemplo: schemas de Booking

Archivo: `backend/app/schemas/booking.py`

```python
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from app.models.enums import BookingType, BookingStatus, BookingSource


# ─── Request Schemas (lo que el cliente envía) ───

class BookingItemCreate(BaseModel):
    """Un item dentro de una reserva (transporte, actividad, addon)."""
    type: str = Field(..., description="TRANSPORTATION, ACTIVITY, ADDON, etc.")
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    quantity: int = Field(default=1, ge=1, le=100)
    unit_price: int = Field(..., ge=0, description="Precio unitario en centavos")
    total_price: int = Field(..., ge=0, description="Precio total en centavos")
    metadata: Optional[dict] = None


class CreateBookingRequest(BaseModel):
    """Schema para crear una reserva (POST /api/bookings)."""
    type: BookingType
    service_type: Optional[str] = Field(None, max_length=50)
    trip_type: Optional[str] = Field(None, max_length=50)
    route: Optional[str] = Field(None, max_length=50)

    # Customer
    customer: "CustomerInfo"

    # Dates
    booking_date: str = Field(..., description="Fecha ISO 8601 (YYYY-MM-DD)")
    booking_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    pickup_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")

    # Locations
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None

    # Flights (optional)
    flight_number: Optional[str] = Field(None, max_length=20)
    arrival_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    arrival_airline: Optional[str] = Field(None, max_length=100)
    departure_flight_number: Optional[str] = Field(None, max_length=20)
    departure_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    departure_airline: Optional[str] = Field(None, max_length=100)

    # Pricing
    passengers: int = Field(default=1, ge=1, le=14)

    # Items
    items: List[BookingItemCreate] = Field(default_factory=list)

    # Notes
    notes: Optional[str] = None


class CustomerInfo(BaseModel):
    """Información del cliente dentro de una reserva."""
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    phone: str = Field(..., min_length=7, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    language: str = Field(default="en", pattern=r"^(en|es)$")


# ─── Response Schemas (lo que el servidor devuelve) ───

class BookingItemResponse(BaseModel):
    """Item de reserva en la respuesta."""
    id: str
    type: str
    name: str
    slug: Optional[str] = None
    quantity: int
    unit_price: int
    total_price: int
    metadata: Optional[dict] = None

    class Config:
        from_attributes = True  # Permite crear desde objeto SQLAlchemy


class BookingResponse(BaseModel):
    """Reserva completa en la respuesta."""
    id: str
    type: BookingType
    status: BookingStatus
    source: BookingSource
    customer_id: str
    booking_date: datetime
    booking_time: Optional[str] = None
    pickup_time: Optional[str] = None
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None
    flight_number: Optional[str] = None
    arrival_time: Optional[str] = None
    arrival_airline: Optional[str] = None
    departure_flight_number: Optional[str] = None
    departure_time: Optional[str] = None
    departure_airline: Optional[str] = None
    total_amount: int
    currency: str
    subtotal_amount: Optional[int] = None
    discount_amount: Optional[int] = None
    tax_amount: Optional[int] = None
    passengers: int
    service_type: Optional[str] = None
    trip_type: Optional[str] = None
    route: Optional[str] = None
    confirmation_code: Optional[str] = None
    notes: Optional[str] = None
    items: List[BookingItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

**Explicación de conceptos Pydantic:**

1. **`Field(...)`** — el `...` (Ellipsis) significa REQUERIDO. Sin valor default.
2. **`Field(ge=0)`** — validación: greater than or equal to 0. Si mandas -1, Pydantic rechaza con error 422.
3. **`Field(pattern=r"^\d{2}:\d{2}$")`** — valida formato con regex. "14:30" pasa, "2pm" no.
4. **`from_attributes = True`** — antes se llamaba `orm_mode = True`. Permite crear el schema directamente desde un objeto SQLAlchemy: `BookingResponse.model_validate(booking_obj)`.
5. **`field_validator`** — validación custom. Puedes agregar lógica que no cabe en `Field()`.

---

### FASE 4 — SERVICIOS (Business Logic)

**Objetivo:** Implementar toda la lógica de negocio en servicios separados de los endpoints.

#### 4.1 — Patrón de arquitectura

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

**Por qué separar servicios de endpoints:**
- Los endpoints solo reciben requests y devuelven responses
- Los servicios contienen la lógica real (validar precios, generar códigos, enviar emails)
- Facilita testing: puedes probar el servicio sin levantar el servidor
- Reutilización: el mismo servicio se usa desde la API, el admin, y tareas Celery

#### 4.2 — Ejemplo: BookingService

Archivo: `backend/app/services/booking.py`

```python
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.booking import Booking
from app.models.customer import Customer
from app.models.enums import BookingStatus, BookingSource
from app.schemas.booking import CreateBookingRequest


class BookingService:
    """Lógica de negocio para reservas."""

    def __init__(self, db: AsyncSession):
        # Cada servicio recibe su sesión de DB
        # Esto permite hacer testing con una DB de prueba
        self.db = db

    async def create_draft(
        self,
        data: CreateBookingRequest,
        source: BookingSource = BookingSource.WEBSITE,
    ) -> Booking:
        """Crear una reserva en estado DRAFT.
        
        Args:
            data: Datos validados de la reserva
            source: De dónde viene (website, whatsapp, admin, etc.)
            
        Returns:
            El objeto Booking creado
            
        Raises:
            ValueError: Si hay error de validación de negocio
        """
        # 1. Buscar o crear el cliente
        customer = await self._find_or_create_customer(
            name=data.customer.name,
            email=data.customer.email,
            phone=data.customer.phone,
            country=data.customer.country,
            language=data.customer.language,
        )

        # 2. Validar pasajeros
        passengers = max(1, data.passengers)
        if data.type == "TRANSPORTATION" and (passengers < 1 or passengers > 14):
            raise ValueError("Passengers must be between 1 and 14")

        # 3. Validar fecha futura
        booking_date = datetime.fromisoformat(data.booking_date)
        if booking_date.date() < datetime.utcnow().date():
            raise ValueError("Booking date must be in the future")

        # 4. Crear el booking
        booking = Booking(
            type=data.type,
            status=BookingStatus.DRAFT,
            source=source,
            customer_id=customer.id,
            booking_date=booking_date,
            booking_time=data.booking_time,
            pickup_time=data.pickup_time,
            pickup_location=data.pickup_location,
            dropoff_location=data.dropoff_location,
            flight_number=data.flight_number,
            arrival_time=data.arrival_time,
            arrival_airline=data.arrival_airline,
            departure_flight_number=data.departure_flight_number,
            departure_time=data.departure_time,
            departure_airline=data.departure_airline,
            passengers=passengers,
            service_type=data.service_type,
            trip_type=data.trip_type,
            route=data.route,
            notes=data.notes,
            total_amount=0,  # Se calculará después
        )

        self.db.add(booking)
        await self.db.flush()  # flush() ejecuta SQL pero no hace commit aún
        # flush() es necesario para obtener el booking.id antes del commit

        # 5. Generar código de confirmación
        booking.confirmation_code = await self._generate_confirmation_code()

        # 6. Crear booking items si existen
        if data.items:
            from app.models.booking_item import BookingItem
            for item_data in data.items:
                item = BookingItem(
                    booking_id=booking.id,
                    type=item_data.type,
                    name=item_data.name,
                    slug=item_data.slug,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    total_price=item_data.total_price,
                )
                self.db.add(item)

            # Calcular total desde los items
            booking.total_amount = sum(
                item.total_price for item in data.items
            )
            booking.subtotal_amount = booking.total_amount

        await self.db.commit()
        await self.db.refresh(booking)  # Refresca el objeto con datos de DB

        return booking

    async def _find_or_create_customer(self, name: str, email: str, phone: str, **kwargs) -> Customer:
        """Busca un cliente por email. Si no existe, lo crea."""
        # select() es la forma moderna de hacer queries en SQLAlchemy 2.0
        result = await self.db.execute(
            select(Customer).where(Customer.email == email)
        )
        customer = result.scalar_one_or_none()

        if customer:
            # Actualizar datos si cambiaron
            customer.name = name
            customer.phone = phone
        else:
            customer = Customer(
                name=name,
                email=email,
                phone=phone,
                **kwargs,
            )
            self.db.add(customer)
            await self.db.flush()

        return customer

    async def _generate_confirmation_code(self) -> str:
        """Genera código CLASS2026001, CLASS2026002, etc."""
        from sqlalchemy import func

        year = datetime.utcnow().year
        prefix = f"CLASS{year}"

        # Contar cuántos códigos existen este año
        result = await self.db.execute(
            select(func.count(Booking.id)).where(
                Booking.confirmation_code.like(f"{prefix}%")
            )
        )
        count = result.scalar() or 0

        # Intentar hasta 25 variantes (por si hay huecos)
        for offset in range(1, 26):
            candidate = f"{prefix}{str(count + offset).zfill(3)}"
            exists = await self.db.execute(
                select(Booking.id).where(Booking.confirmation_code == candidate)
            )
            if not exists.scalar_one_or_none():
                return candidate

        # Fallback: usar timestamp
        return f"{prefix}{str(int(datetime.utcnow().timestamp()))[-6:]}"

    async def get_by_id(self, booking_id: str) -> Booking | None:
        """Obtener una reserva por ID."""
        result = await self.db.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        return result.scalar_one_or_none()
```

**Explicación de conceptos clave:**

1. **`AsyncSession`** — sesión de DB async. Todas las operaciones usan `await`.
2. **`select(Model).where(...)`** — sintaxis moderna de SQLAlchemy 2.0. Reemplaza a `db.query(Model).filter(...)`.
3. **`await self.db.flush()`** — ejecuta el SQL INSERT/UPDATE pero no confirma la transacción. Útil cuando necesitas el ID autogenerado antes del commit.
4. **`await self.db.commit()`** — confirma la transacción. Todos los cambios se guardan en DB.
5. **`await self.db.refresh(obj)`** — recarga el objeto desde DB. Necesario después del commit si la DB generó valores (triggers, defaults).
6. **`scalar_one_or_none()`** — devuelve un resultado o None. Si hay más de uno, lanza excepción.
7. **`zfill(3)`** — "1" → "001", "42" → "042". Para códigos CLASS2026001.

---

### FASE 5 — ENDPOINTS API (FastAPI Routers)

**Objetivo:** Exponer los servicios como endpoints REST.

#### 5.1 — Dependency Injection con FastAPI

FastAPI usa un sistema de "dependencias" para inyectar recursos en los endpoints. La dependencia más común es la sesión de DB.

Archivo: `backend/app/dependencies.py`

```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provee una sesión de DB por request.
    
    FastAPI llama a esta función antes de cada endpoint que la declare como dependencia.
    Al terminar el request, cierra la sesión automáticamente.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

**Explicación:**
- `async with` — context manager async. Crea una sesión, la usa, y la cierra automáticamente.
- `yield session` — cede la sesión al endpoint. Cuando el endpoint termina, el código continúa después del yield.
- `commit()` — si todo salió bien, confirma cambios.
- `rollback()` — si hubo error, deshace todo.
- FastAPI maneja esto automáticamente: `db: AsyncSession = Depends(get_db)`.

#### 5.2 — Endpoint de Bookings

Archivo: `backend/app/api/v1/bookings.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.booking import CreateBookingRequest, BookingResponse
from app.services.booking import BookingService
from app.models.enums import BookingSource

# APIRouter agrupa endpoints con un prefijo común
# Se monta en main.py como: app.include_router(bookings_router, prefix="/api/bookings")
router = APIRouter()


@router.post(
    "/",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una reserva",
    description="Crea una reserva en estado DRAFT. Se envía email de confirmación pendiente.",
)
async def create_booking(
    data: CreateBookingRequest,  # FastAPI valida automáticamente con Pydantic
    db: AsyncSession = Depends(get_db),  # Inyección de dependencia
):
    """POST /api/bookings
    
    El body del request se valida contra CreateBookingRequest.
    Si la validación falla, FastAPI devuelve 422 automáticamente.
    """
    service = BookingService(db)

    try:
        booking = await service.create_draft(data)
    except ValueError as e:
        # Errores de negocio → 400 Bad Request
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # FastAPI convierte el objeto SQLAlchemy a BookingResponse automáticamente
    # gracias a from_attributes = True en el schema
    return booking


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Obtener una reserva por ID",
)
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/bookings/{booking_id}"""
    service = BookingService(db)
    booking = await service.get_by_id(booking_id)

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    return booking
```

**Explicación línea por línea:**
- `APIRouter()` — agrupa rutas. Permite organizar endpoints en archivos separados.
- `@router.post("/")` — decorador que registra una ruta POST en el router.
- `response_model=BookingResponse` — FastAPI usa esto para:
  1. Validar que la respuesta cumple el schema
  2. Filtrar campos (solo devuelve lo que está en el schema)
  3. Generar la documentación OpenAPI automáticamente
- `Depends(get_db)` — FastAPI llama a `get_db()` antes del endpoint, y maneja el ciclo de vida.
- `HTTPException` — lanza un error HTTP con código y mensaje. FastAPI lo convierte en respuesta JSON.

---

### FASE 6 — AUTENTICACIÓN (JWT + Cookies)

**Objetivo:** Proteger el panel de administración con login, JWT, y cookies seguras.

#### 6.1 — Utilidades de seguridad

Archivo: `backend/app/utils/security.py`

```python
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.core.config import get_settings

settings = get_settings()

# CryptContext maneja el hashing de contraseñas
# bcrypt es el algoritmo (lento a propósito para resistir fuerza bruta)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Algoritmo para firmar JWTs
ALGORITHM = "HS256"
# Tiempo de expiración del token
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 horas


def hash_password(password: str) -> str:
    """Convierte una contraseña en texto plano a un hash irreversible."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con el hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(email: str) -> str:
    """Crea un JWT firmado con el email del admin.
    
    El token incluye:
    - sub: subject (email del admin)
    - exp: expiration time
    - iat: issued at time
    """
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": email,
        "exp": expire,
        "iat": now,
    }

    # jwt.encode() firma el payload con la SECRET_KEY
    # Cualquiera puede leer el payload, pero solo nosotros podemos crearlo
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Decodifica un JWT y devuelve el email del admin.
    
    Si el token expiró o es inválido, devuelve None.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
```

**Conceptos de seguridad explicados:**

1. **Hash vs Encriptación:**
   - Hash (bcrypt): un solo sentido. No puedes "deshashear" una contraseña. Solo puedes verificar si una entrada coincide con el hash.
   - Encriptación: dos sentidos. Puedes desencriptar con la llave correcta.
   - Contraseñas SIEMPRE se hashean, nunca se encriptan.

2. **JWT (JSON Web Token):**
   - Estructura: `header.payload.signature`
   - Header: algoritmo (HS256)
   - Payload: datos (email, expiración)
   - Signature: header + payload firmados con SECRET_KEY
   - El servidor puede verificar que el token fue creado por él (porque solo él conoce SECRET_KEY)
   - Stateless: no necesitas guardar sesiones en DB

3. **¿Por qué 8 horas de expiración?** Suficiente para una jornada laboral, pero si alguien roba el token, expira eventualmente.

#### 6.2 — Middleware de autenticación

Archivo: `backend/app/middleware/auth.py`

```python
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.security import decode_access_token


# Rutas que NO requieren autenticación
PUBLIC_PATHS = [
    "/health",
    "/api/health",
    "/api/admin/auth/login",
    "/api/bookings",
    "/api/pricing",
    "/api/hotels",
    "/api/stripe/webhook",
    "/docs",
    "/redoc",
    "/openapi.json",
]


class AdminAuthMiddleware(BaseHTTPMiddleware):
    """Middleware que verifica la cookie admin_token en cada request.
    
    Si la cookie es válida, inyecta admin_email en request.state.
    Si no, solo bloquea rutas protegidas.
    """

    async def dispatch(self, request: Request, call_next):
        # Inicializar sin autenticación
        request.state.admin_email = None

        # ¿Es una ruta pública?
        path = request.url.path
        is_public = any(path.startswith(p) for p in PUBLIC_PATHS)

        # Leer cookie
        token = request.cookies.get("admin_token")

        if token:
            email = decode_access_token(token)
            if email:
                request.state.admin_email = email

        # Si la ruta es admin y no hay autenticación, rechazar
        if path.startswith("/api/admin") and not request.state.admin_email:
            if not is_public:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                )

        response = await call_next(request)
        return response
```

**Explicación:**
- `BaseHTTPMiddleware` — intercepta cada request antes de que llegue al endpoint.
- `request.state` — objeto compartido durante todo el request. Los endpoints pueden leer `request.state.admin_email`.
- `call_next(request)` — pasa el request al siguiente middleware/endpoint.
- Cookies vs Headers: Las cookies son más seguras para SPAs porque el navegador las envía automáticamente y puedes marcarlas como HttpOnly (JavaScript no puede leerlas).

---

### FASE 7 — PAGOS CON STRIPE

**Objetivo:** Integrar Stripe para procesar pagos con tarjeta.

#### 7.1 — Servicio de Stripe

Archivo: `backend/app/services/stripe.py`

```python
import stripe
from app.core.config import get_settings

settings = get_settings()

# Configurar Stripe una sola vez al importar el módulo
stripe.api_key = settings.stripe_secret_key


class StripeService:
    """Servicio para interactuar con la API de Stripe."""

    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str = "usd",
        booking_id: str = "",
        customer_email: str = "",
        description: str = "",
    ) -> dict:
        """Crear un PaymentIntent en Stripe.
        
        Un PaymentIntent representa la INTENCIÓN de cobrar.
        No se cobra hasta que el frontend confirma con confirmCardPayment().
        
        Args:
            amount_cents: Monto en centavos (ej: 5000 = $50.00)
            currency: Código de moneda (usd, mxn, eur...)
            booking_id: ID de la reserva para el webhook
            customer_email: Email para el recibo
            description: Descripción en el estado de cuenta
            
        Returns:
            Dict con client_secret (lo necesita el frontend para confirmar)
        """
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata={
                "booking_id": booking_id,
            },
            receipt_email=customer_email,
            description=description,
            # automatic_payment_methods permite tarjetas, wallets, etc.
            automatic_payment_methods={"enabled": True},
        )

        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
        }

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
    ) -> dict:
        """Verifica que un webhook realmente viene de Stripe.
        
        Esto es CRÍTICO para seguridad. Cualquiera podría enviar
        un POST a /api/stripe/webhook. La firma criptográfica
        prueba que el mensaje viene de Stripe.
        
        Args:
            payload: Body crudo del request (bytes, no dict)
            signature: Header stripe-signature
            
        Returns:
            El evento verificado (dict)
            
        Raises:
            ValueError: Si la firma es inválida
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                settings.stripe_webhook_secret,
            )
            return event
        except stripe.error.SignatureVerificationError as e:
            raise ValueError(f"Invalid signature: {e}")
```

**Conceptos de Stripe:**

1. **PaymentIntent** — objeto que representa un pago. Pasa por estados: `requires_payment_method` → `requires_confirmation` → `processing` → `succeeded`.
2. **client_secret** — clave efímera que el frontend usa para confirmar el pago con Stripe.js. No es secreta (va al frontend).
3. **Webhook** — Stripe envía un POST a tu servidor cuando ocurre un evento (pago exitoso, fallo, disputa). Es la forma correcta de saber si un pago se completó.
4. **¿Por qué verificar la firma?** Porque cualquiera puede hacer POST a tu endpoint. La firma criptográfica usa tu `webhook_secret` para probar que el mensaje es legítimo.

#### 7.2 — Endpoint de Stripe

Archivo: `backend/app/api/v1/stripe.py`

```python
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db
from app.services.stripe import StripeService
from app.services.booking import BookingService

router = APIRouter()
stripe_service = StripeService()


@router.post("/create-payment-intent")
async def create_payment_intent(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Crea un PaymentIntent para una reserva.
    
    Frontend llama a este endpoint para obtener el client_secret.
    Luego usa Stripe.js para mostrar el formulario de tarjeta.
    """
    body = await request.json()
    booking_id = body.get("booking_id")

    if not booking_id:
        raise HTTPException(status_code=400, detail="booking_id is required")

    # Obtener la reserva
    booking_service = BookingService(db)
    booking = await booking_service.get_by_id(booking_id)

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Crear PaymentIntent
    intent = await stripe_service.create_payment_intent(
        amount_cents=booking.total_amount,
        currency=booking.currency.lower(),
        booking_id=booking.id,
        customer_email=body.get("email", ""),
        description=f"ClassVIP Transfer — {booking.confirmation_code}",
    )

    return intent


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook que recibe eventos de Stripe.
    
    IMPORTANTE: Este endpoint debe recibir el body CRUDO (bytes).
    FastAPI lo configura con: app.add_route("/api/stripe/webhook", ...)
    """
    # Leer body como bytes (NO como JSON)
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    try:
        event = stripe_service.verify_webhook_signature(payload, signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Manejar el evento
    event_type = event["type"]

    if event_type == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        booking_id = payment_intent["metadata"]["booking_id"]

        # Actualizar reserva a PAID
        booking_service = BookingService(db)
        await booking_service.mark_as_paid(booking_id)

    elif event_type == "payment_intent.payment_failed":
        # Opcional: notificar al admin
        pass

    return {"status": "ok"}
```

---

### FASE 8 — EMAIL SERVICE

**Objetivo:** Enviar correos transaccionales usando Resend (mismo proveedor del proyecto original).

#### 8.1 — Servicio de Email

Archivo: `backend/app/services/email.py`

```python
import resend
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from app.core.config import get_settings

settings = get_settings()

# Configurar Resend
resend.api_key = settings.resend_api_key

# Configurar Jinja2 para templates HTML
# FileSystemLoader busca archivos en el directorio de templates
templates_dir = Path(__file__).parent.parent / "templates" / "emails"
jinja_env = Environment(loader=FileSystemLoader(str(templates_dir)))


class EmailService:
    """Servicio de envío de correos transaccionales."""

    async def send_booking_confirmation(self, booking: dict) -> dict:
        """Envía confirmación de reserva al cliente.

        Args:
            booking: Dict con datos de la reserva (id, confirmation_code, etc.)

        Returns:
            Respuesta de la API de Resend
        """
        # Cargar template HTML
        template = jinja_env.get_template("customer_confirmed.html")

        # Renderizar con datos de la reserva
        html_content = template.render(
            booking=booking,
            confirmation_code=booking.get("confirmation_code", ""),
            total=booking.get("total_amount", 0) / 100,  # Convertir centavos a dólares
        )

        # Enviar email
        params: resend.Emails.SendParams = {
            "from": settings.email_from,
            "to": [booking.get("customer_email", "")],
            "subject": f"Booking Confirmed — {booking.get('confirmation_code', '')}",
            "html": html_content,
        }

        # BCC a operaciones (copia oculta)
        if settings.email_bcc:
            params["bcc"] = [settings.email_bcc]

        email = resend.Emails.send(params)
        return email
```

---

### FASE 9 — TESTING

**Objetivo:** Escribir tests para cada servicio y endpoint.

#### 9.1 — Configuración de pytest

Archivo: `backend/app/tests/conftest.py`

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.database import Base
from app.main import app
from app.dependencies import get_db

# Base de datos de prueba (SQLite en memoria, no necesita PostgreSQL instalado)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Engine de prueba
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

# Sesión de prueba
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Crea todas las tablas antes de cada test y las borra después."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Provee una sesión de DB de prueba."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    """Cliente HTTP para probar los endpoints.
    
    Sobreescribe la dependencia get_db para usar la DB de prueba.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
```

#### 9.2 — Test de Bookings

Archivo: `backend/app/tests/test_bookings.py`

```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_booking_success(client: AsyncClient):
    """Test: crear una reserva válida debe devolver 201."""
    payload = {
        "type": "TRANSPORTATION",
        "service_type": "private",
        "trip_type": "oneway",
        "customer": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+525551234567",
            "language": "en",
        },
        "booking_date": "2026-12-25",
        "booking_time": "14:00",
        "pickup_location": "SJD Airport Terminal 1",
        "dropoff_location": "Grand Velas Los Cabos",
        "passengers": 3,
        "items": [
            {
                "type": "TRANSPORTATION",
                "name": "Airport Transfer",
                "quantity": 1,
                "unit_price": 15000,
                "total_price": 15000,
            }
        ],
    }

    response = await client.post("/api/bookings/", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "DRAFT"
    assert data["confirmation_code"] is not None
    assert data["confirmation_code"].startswith("CLASS2026")
    assert data["total_amount"] == 15000


@pytest.mark.asyncio
async def test_create_booking_invalid_email(client: AsyncClient):
    """Test: email inválido debe devolver 422."""
    payload = {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "John",
            "email": "not-an-email",  # Inválido
            "phone": "+525551234567",
        },
        "booking_date": "2026-12-25",
        "passengers": 1,
    }

    response = await client.post("/api/bookings/", json=payload)

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_create_booking_past_date(client: AsyncClient):
    """Test: fecha pasada debe devolver 400."""
    payload = {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "John",
            "email": "john@example.com",
            "phone": "+525551234567",
        },
        "booking_date": "2020-01-01",  # Fecha pasada
        "passengers": 1,
    }

    response = await client.post("/api/bookings/", json=payload)

    assert response.status_code == 400
    assert "future" in response.json()["detail"].lower()
```

---

### FASE 10 — DEPLOY Y PRODUCCIÓN

**Objetivo:** Preparar el proyecto para producción.

#### 10.1 — Dockerfile para backend

Archivo: `docker/Dockerfile.backend`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema para WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY backend/pyproject.toml backend/uv.lock ./
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev

# Copiar código
COPY backend/ .

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 10.2 — Docker Compose

Archivo: `docker/docker-compose.yml`

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: classvip
      POSTGRES_USER: classvip
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    environment:
      - DATABASE_URL=postgresql+asyncpg://classvip:${DB_PASSWORD:-changeme}@db:5432/classvip
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  celery_worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    command: celery -A app.worker worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql+asyncpg://classvip:${DB_PASSWORD:-changeme}@db:5432/classvip
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

volumes:
  pgdata:
```

---

## 2. LISTA COMPLETA DE TAREAS (Orden de ejecución)

### Fase 1: Fundación (2 horas)
- [x] 1.1 — Crear estructura de carpetas y .venv
- [x] 1.2 — `pyproject.toml` con dependencias profesionales
- [x] 1.3 — `.env.example` y `.env` con variables de entorno
- [x] 1.4 — `app/core/config.py` (pydantic-settings)
- [x] 1.5 — `app/__init__.py`
- [x] 1.6 — `app/database.py` (SQLAlchemy engine + session)
- [x] 1.7 — `app/main.py` (FastAPI con CORS, lifespan, health check)
- [x] 1.8 — Instalar dependencias y verificar health check ✅

### Fase 2: Modelos (3 horas)
- [ ] 2.1 — `models/enums.py` (todos los enums)
- [ ] 2.2 — `models/admin.py` (AdminUser)
- [ ] 2.3 — `models/customer.py` (Customer)
- [ ] 2.4 — `models/booking.py` (Booking)
- [ ] 2.5 — `models/booking_item.py` (BookingItem)
- [ ] 2.6 — `models/payment.py` (Payment)
- [ ] 2.7 — `models/pricing.py` (Hotel, Area, PricingRule, PricingExtra)
- [ ] 2.8 — `models/driver.py` (Driver)
- [ ] 2.9 — `models/vehicle.py` (Vehicle)
- [ ] 2.10 — `models/booking_assignment.py` (BookingAssignment)
- [ ] 2.11 — `models/pricing_override.py` (PricingOverride)
- [ ] 2.12 — `models/client_account.py` (ClientAccount, AccountCharge, AccountPayment)
- [ ] 2.13 — `models/audit.py` (AdminAuditLog)
- [ ] 2.14 — `models/email_log.py` (EmailLog)
- [ ] 2.15 — `models/ai_conversation.py` (AIConversation)

### Fase 3: Schemas Pydantic (2 horas)
- [ ] 3.1 — `schemas/booking.py` (CreateBookingRequest, BookingResponse, etc.)
- [ ] 3.2 — `schemas/auth.py` (LoginRequest, TokenResponse, etc.)
- [ ] 3.3 — `schemas/admin.py` (AdminBookingList, DashboardStats, etc.)
- [ ] 3.4 — `schemas/pricing.py` (PricingRuleCreate, AreaCreate, etc.)
- [ ] 3.5 — `schemas/payment.py` (PaymentResponse, etc.)
- [ ] 3.6 — `schemas/customer.py` (CustomerResponse, etc.)

### Fase 4: Servicios Core (4 horas)
- [ ] 4.1 — `dependencies.py` (get_db)
- [ ] 4.2 — `utils/security.py` (hash, JWT)
- [ ] 4.3 — `utils/tokens.py` (booking tokens, PDF tokens)
- [ ] 4.4 — `utils/errors.py` (error helpers)
- [ ] 4.5 — `services/booking.py` (BookingService completo)
- [ ] 4.6 — `services/pricing.py` (PricingService)
- [ ] 4.7 — `services/audit.py` (AuditService)
- [ ] 4.8 — `services/driver_vehicle.py` (DriverVehicleService)

### Fase 5: Endpoints API (3 horas)
- [ ] 5.1 — `api/v1/bookings.py` (CRUD bookings)
- [ ] 5.2 — `api/v1/auth.py` (login/logout/me)
- [ ] 5.3 — `api/v1/admin.py` (dashboard, bookings, finances, etc.)
- [ ] 5.4 — `api/v1/pricing.py` (pricing rules, areas, extras)
- [ ] 5.5 — `api/v1/hotels.py` (hotels CRUD)
- [ ] 5.6 — `api/router.py` (montar todos los routers)
- [ ] 5.7 — `middleware/auth.py` (AdminAuthMiddleware)
- [ ] 5.8 — `middleware/error_handler.py` (exception handlers)
- [ ] 5.9 — `middleware/rate_limit.py` (slowapi o custom)

### Fase 6: Auth completa (1.5 horas)
- [ ] 6.1 — Endpoint `POST /api/admin/auth/login`
- [ ] 6.2 — Endpoint `GET /api/admin/auth/me`
- [ ] 6.3 — Endpoint `POST /api/admin/auth/logout`
- [ ] 6.4 — Middleware de cookie admin
- [ ] 6.5 — `ensure_admin_exists()` en lifespan

### Fase 7: Stripe (2 horas)
- [ ] 7.1 — `services/stripe.py` (StripeService)
- [ ] 7.2 — Endpoint `POST /api/stripe/create-payment-intent`
- [ ] 7.3 — Endpoint `POST /api/stripe/webhook`
- [ ] 7.4 — Manejar eventos: payment_intent.succeeded, failed, refunded

### Fase 8: Email y PDF (2 horas)
- [ ] 8.1 — `services/email.py` (EmailService con Resend)
- [ ] 8.2 — `templates/emails/customer_confirmed.html`
- [ ] 8.3 — `templates/emails/customer_pending.html`
- [ ] 8.4 — `templates/emails/customer_cancelled.html`
- [ ] 8.5 — `templates/emails/company_notification.html`
- [ ] 8.6 — `services/pdf.py` (PdfService con WeasyPrint)
- [ ] 8.7 — `templates/pdfs/booking_confirmation.html`
- [ ] 8.8 — Endpoint `GET /api/bookings/{id}/confirmation-pdf`

### Fase 9: Testing (3 horas)
- [ ] 9.1 — `tests/conftest.py` (fixtures, DB de prueba)
- [ ] 9.2 — `tests/test_bookings.py` (crear, validar, errores)
- [ ] 9.3 — `tests/test_auth.py` (login, token, middleware)
- [ ] 9.4 — `tests/test_pricing.py` (cálculo de precios)
- [ ] 9.5 — `tests/test_admin.py` (dashboard, stats)
- [ ] 9.6 — `tests/test_stripe.py` (payment intent, webhook mock)

### Fase 10: Deploy (2 horas)
- [ ] 10.1 — `Dockerfile.backend`
- [ ] 10.2 — `docker-compose.yml`
- [ ] 10.3 — `Makefile` (comandos comunes)
- [ ] 10.4 — Script `scripts/seed.py` (datos semilla)
- [ ] 10.5 — Script `scripts/setup_db.py` (crear admin inicial)
- [ ] 10.6 — `README.md` del proyecto

---

## 3. PRINCIPIOS DE CÓDIGO LIMPIO

### Reglas que seguimos en cada línea:

1. **DRY (Don't Repeat Yourself):** Si ves el mismo código 2 veces, extráelo a una función.
2. **YAGNI (You Aren't Gonna Need It):** Solo implementa lo que se necesita AHORA. No "por si acaso".
3. **Single Responsibility:** Cada archivo/clase/función hace UNA sola cosa.
4. **Type hints siempre:** Todo parámetro y retorno tiene type hint.
5. **Docstrings en servicios:** Cada método público explica qué hace, qué recibe, qué devuelve y qué errores puede lanzar.
6. **Precios en centavos:** NUNCA uses float para dinero. Siempre int (centavos).
7. **Async con intención:** Async en IO (DB, HTTP, archivos). No hacer async por moda.
8. **No exponer modelos SQLAlchemy en la API:** Siempre convertir a Pydantic schema.
9. **Sin lógica de negocio en endpoints:** Los endpoints son delgados; la lógica vive en services.
10. **Sin SQL en services:** Las queries viven en repositories.
11. **Sin `print()` en producción:** Usar `structlog` con niveles (`info`, `warning`, `error`).
12. **Errores explícitos:** No atrapar `Exception` sin registrar y sin devolver mensaje controlado.
13. **Migraciones reales:** En producción se usa Alembic, no `Base.metadata.create_all()`.
14. **Commits atómicos:** Cada tarea completada = un commit con mensaje descriptivo.
15. **Tests antes de deploy:** Ningún código va a producción sin su test.
16. **Seguridad por default:** Lo público se declara explícitamente; todo lo demás se protege.

### Checklist mental antes de aceptar una línea de código

Para cada línea pregúntate:

- ¿Sé explicar qué hace?
- ¿Sé explicar por qué está aquí y no en otro archivo?
- ¿Puede romper seguridad?
- ¿Puede romper datos de dinero?
- ¿Puede fallar en producción?
- ¿Tiene test o verificación?
- ¿El nombre de la variable dice la verdad?

Si una respuesta es "no sé", esa línea se detiene y se explica antes de avanzar.

---

## 4. ESTIMACIÓN DE TIEMPO TOTAL

| Fase | Horas |
|------|-------|
| 1. Fundación | 2h |
| 2. Modelos | 3h |
| 3. Schemas | 2h |
| 4. Servicios Core | 4h |
| 5. Endpoints API | 3h |
| 6. Auth | 1.5h |
| 7. Stripe | 2h |
| 8. Email y PDF | 2h |
| 9. Testing | 3h |
| 10. Deploy | 2h |
| **TOTAL** | **24.5 horas** |

---

> **Siguiente paso:** Fase 1 — Crear estructura del proyecto y correr FastAPI con health check.

---

## 5. SEGURIDAD — Vulnerabilidades comunes y cómo taparlas

**⚠️ Esta sección es OBLIGATORIA de leer antes de cada fase.**
**Cada vulnerabilidad aquí descrita es un riesgo real que hemos visto en producción.**

### ¿Por qué la seguridad NO es opcional?

En un sistema de transporte, manejas:
- Datos personales de clientes (nombre, teléfono, email, vuelos)
- Información financiera (tarjetas vía Stripe, montos, facturas)
- Panel de administración (si alguien entra, puede ver/modificar TODO)
- GDPR/privacidad (clientes europeos tienen derecho a borrar sus datos)

Una filtración de datos puede costar:
- Multas de hasta 4% de ingresos anuales (GDPR)
- Pérdida de confianza de clientes
- Robo de información de negocio (precios, clientes, conductores)

### Seguridad por capa

Piensa en seguridad como una cebolla — múltiples capas:

```
🌐 Internet
  └── HTTPS/TLS (capa 1 — transporte)
      └── Rate Limiting (capa 2 — anti-abuso)
          └── CORS (capa 3 — origen)
              └── Autenticación JWT (capa 4 — identidad)
                  └── Autorización (capa 5 — permisos)
                      └── Validación Pydantic (capa 6 — datos)
                          └── SQLAlchemy parametrizado (capa 7 — DB)
```

Si una capa falla, las demás siguen protegiendo.

### Vulnerabilidad 1: SQL Injection

**Qué es:** Un atacante inyecta SQL malicioso en un input para robar/modificar/borrar datos.

**Ejemplo de código VULNERABLE (NUNCA hagas esto):**
```python
# ❌ PELIGRO — Concatenación de strings en SQL
booking_id = request.query_params.get("id")
query = f"SELECT * FROM bookings WHERE id = '{booking_id}'"
result = await db.execute(text(query))
# Si booking_id = "1' OR '1'='1" → devuelve TODAS las reservas
```

**Cómo protegerse (SIEMPRE haz esto):**
```python
# ✅ SEGURO — SQLAlchemy con parámetros bind
from sqlalchemy import select
booking_id = request.query_params.get("id")
result = await db.execute(
    select(Booking).where(Booking.id == booking_id)
)
# SQLAlchemy escapa automáticamente los parámetros
```

**Verificación en cada endpoint:**
- ¿Estoy usando `select(Model).where(...)`? ✅
- ¿Estoy usando `text()` con strings concatenados? ❌ ARREGLAR

---

### Vulnerabilidad 2: IDs predecibles (Insecure Direct Object Reference)

**Qué es:** Si tus IDs son secuenciales (1, 2, 3...), un atacante puede iterar y acceder a todas las reservas.

**Ejemplo VULNERABLE:**
```python
# ❌ PELIGRO — ID numérico secuencial
# GET /api/bookings/1 → reserva de Juan
# GET /api/bookings/2 → reserva de María (sin permiso!)
```

**Cómo protegerse:**
```python
# ✅ SEGURO — UUID v4 (imposible de adivinar)
import uuid
booking_id = str(uuid.uuid4())
# Resultado: "a3f2b8c1-9d4e-5f6a-7b8c-9d0e1f2a3b4c"
# Probabilidad de adivinar: 1 en 2^122 (más que átomos en el universo)
```

**Regla:** TODAS las entidades usan UUID v4. NUNCA IDs autoincrementales expuestos en la API.

---

### Vulnerabilidad 3: contraseñas en texto plano

**Qué es:** Guardar contraseñas sin hashear. Si la DB se filtra, todas las contraseñas quedan expuestas.

**Ejemplo VULNERABLE:**
```python
# ❌ PELIGRO
admin = AdminUser(
    email="admin@classvip.com",
    password="admin123"  # TEXTO PLANO — CÁRCEL
)
```

**Cómo protegerse:**
```python
# ✅ SEGURO — bcrypt (hash irreversible)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])

# Al crear admin:
hashed = pwd_context.hash("admin123")
# Resultado: "$2b$12$LJ3m4ys3GZ8kQZ..." (imposible revertir)

admin = AdminUser(
    email="admin@classvip.com",
    password_hash=hashed  # Solo guardamos el hash
)

# Al verificar login:
pwd_context.verify("admin123", hashed)  # True
pwd_context.verify("wrongpass", hashed)  # False
```

**¿Por qué bcrypt?**
- Es LENTO a propósito (~100ms por hash)
- Esto hace que ataques de fuerza bruta sean inviables
- Tiene "salt" automático (cada hash es único aunque la contraseña sea igual)

---

### Vulnerabilidad 4: JWT sin expiración o secret débil

**Qué es:** Si tu JWT no expira o usas un secret predecible, un atacante puede usar tokens robados para siempre.

**Ejemplo VULNERABLE:**
```python
# ❌ PELIGRO
SECRET_KEY = "mysecret"  # Débil, predecible
payload = {"sub": email}  # Sin expiración

# ❌ También peligroso
SECRET_KEY = "cl4ssv1ptr4nsf3rs"  # En el código fuente
```

**Cómo protegerse:**
```python
# ✅ SEGURO
import secrets
from datetime import datetime, timedelta

# Generar secret de 256 bits
SECRET_KEY = secrets.token_urlsafe(32)
# Resultado: "Kx9Lm2NpQr5St8VwYz1AbCd3EfGhIjKlMnOpQrStUvWxYz..."

payload = {
    "sub": email,
    "exp": datetime.utcnow() + timedelta(hours=8),  # Expira en 8 horas
    "iat": datetime.utcnow(),  # Issued at
    "jti": secrets.token_urlsafe(16),  # ID único del token
}
```

**Reglas JWT:**
- SECRET_KEY de mínimo 256 bits, generada aleatoriamente
- NUNCA en el código fuente (siempre en .env)
- Siempre con expiración (máximo 8 horas)
- Cookies HttpOnly + Secure + SameSite=Strict

---

### Vulnerabilidad 5: CORS demasiado permisivo

**Qué es:** Permitir cualquier origen en CORS permite que cualquier sitio web haga requests a tu API.

**Ejemplo VULNERABLE:**
```python
# ❌ PELIGRO
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # CUALQUIER sitio puede llamar a tu API
    allow_credentials=True,
)
```

**Cómo protegerse:**
```python
# ✅ SEGURO — Lista blanca explícita
ALLOWED_ORIGINS = [
    "https://classviptransfers.com",
    "https://www.classviptransfers.com",
]

if ENVIRONMENT == "development":
    ALLOWED_ORIGINS.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

---

### Vulnerabilidad 6: Rate Limiting ausente

**Qué es:** Sin límites de requests, un atacante puede hacer fuerza bruta a endpoints de login o saturar tu servidor.

**Ejemplo VULNERABLE:**
```python
# ❌ PELIGRO — Sin rate limiting
@router.post("/api/admin/auth/login")
async def login(...):
    # Un atacante puede probar millones de contraseñas
    ...
```

**Cómo protegerse:**
```python
# ✅ SEGURO — Rate limiting por IP
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/api/admin/auth/login")
@limiter.limit("5/minute")  # Máximo 5 intentos por minuto
async def login(...):
    ...

# También para endpoints públicos
@router.post("/api/bookings")
@limiter.limit("30/15minutes")  # Máximo 30 reservas cada 15 min
async def create_booking(...):
    ...
```

---

### Vulnerabilidad 7: Webhook de Stripe sin verificar firma

**Qué es:** Si no verificas que el webhook realmente viene de Stripe, un atacante puede enviar webhooks falsos marcando reservas como "pagadas".

**Explicación:** El endpoint `/api/stripe/webhook` es PÚBLICO. Cualquiera puede hacerle POST. Si no verificas la firma, un atacante puede:
1. Crear una reserva
2. Enviar un POST falso a `/api/stripe/webhook` diciendo "pago exitoso"
3. La reserva se marca como PAGADA sin haber pagado

**Cómo protegerse:**
```python
# ✅ SEGURO — Verificación criptográfica de firma
import stripe

@router.post("/webhook")
async def stripe_webhook(request: Request):
    # 1. Leer body RAW (bytes, no JSON)
    payload = await request.body()
    
    # 2. Leer firma del header
    sig_header = request.headers.get("stripe-signature")
    
    # 3. Verificar criptográficamente
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    
    # Ahora SÍ podemos confiar en el evento
    if event["type"] == "payment_intent.succeeded":
        # Procesar pago real
        ...
```

**⚠️ La verificación de firma NO es opcional. Sin ella, regalas reservas gratis.**

---

### Vulnerabilidad 8: Exponer secretos en el código

**Qué es:** API keys, contraseñas, o tokens hardcodeados en el código fuente.

**Ejemplo VULNERABLE:**
```python
# ❌ PELIGRO — Si commiteas esto, el secreto queda en git PARA SIEMPRE
STRIPE_SECRET_KEY = "sk_live_abc123..."
RESEND_API_KEY = "re_xyz789..."
```

**Cómo protegerse:**
```python
# ✅ SEGURO — Variables de entorno
from app.core.config import get_settings

settings = get_settings()
stripe.api_key = settings.stripe_secret_key  # Lee de .env

# El archivo .env NUNCA se commitea (.gitignore)
# Solo .env.example con valores de ejemplo
```

**Reglas para secretos:**
- NUNCA en el código fuente
- `.env` en `.gitignore`
- `.env.example` solo tiene placeholders
- Si un secreto se commiteó → rotarlo INMEDIATAMENTE
- En producción: variables de entorno del hosting (Vercel, Railway, etc.)

---

### Checklist de seguridad por fase

Antes de marcar cada fase como completada, verifica:

| Fase | ¿Qué revisar? |
|------|--------------|
| Fase 1-2 | ¿IDs son UUID v4? ¿Secretos en .env no en código? |
| Fase 3 | ¿Schemas Pydantic validan todos los inputs? ¿Email regex? ¿Límites de longitud? |
| Fase 4 | ¿Consultas SQL usan parámetros bind, no strings? ¿Precios en centavos (int)? |
| Fase 5 | ¿CORS tiene lista blanca? ¿Rate limiting en login? ¿Endpoints protegidos con Auth? |
| Fase 6 | ¿Contraseñas con bcrypt? ¿JWT con expiración? ¿Cookies HttpOnly+Secure? |
| Fase 7 | ¿Webhook verifica firma criptográfica? ¿PaymentIntent idempotente? |
| Fase 8 | ¿Emails no exponen datos sensibles? ¿PDFs tienen token de acceso? |
| Fase 9 | ¿Tests incluyen casos de seguridad? (input malicioso, tokens expirados) |
| Fase 10 | ¿Helmet/hardening headers? ¿HTTPS forzado? ¿Health check no expone datos? |

---

## 6. CÓMO USAR ESTE PROYECTO PARA APRENDER PYTHON PROFESIONAL

**Objetivo:** Que puedas construir sistemas como este SIN ayuda de IA.

### Lo que aprenderás en cada fase

| Fase | Habilidad | Para qué sirve en el mundo real |
|------|-----------|-------------------------------|
| 1 | **Entornos virtuales + FastAPI** | Todo proyecto Python usa venv. FastAPI lo usan Uber, Netflix, Microsoft. |
| 2 | **SQLAlchemy 2.0 + async** | ORM #1 de Python. Async es requisito en backends modernos. |
| 3 | **Pydantic v2** | Validación de datos. Lo usa OpenAI, Instagram, FastAPI. |
| 4 | **Arquitectura de servicios** | Separar lógica de negocio de HTTP. Patrón usado en FAANG. |
| 5 | **REST API design** | Diseñar APIs que otros desarrolladores puedan usar. |
| 6 | **JWT + bcrypt** | Autenticación sin estado. Estándar de la industria. |
| 7 | **Stripe integration** | Procesar pagos reales. Misma API que usan miles de empresas. |
| 8 | **Email + PDF generation** | Comunicación transaccional. Toda empresa lo necesita. |
| 9 | **pytest + fixtures** | Testing profesional. Empresas no contratan sin esto. |
| 10 | **Docker + deploy** | Contenedores. El 90% de empresas usa Docker en producción. |

### Cómo estudiar sin ayuda

1. **Lee el código de la fase ANTES de ejecutarlo.** Entiende cada línea.
2. **Cierra el agente de IA.** Intenta escribir la siguiente fase tú solo.
3. **Cuando te atores, lee el error.** El 90% de bugs se resuelven leyendo el traceback.
4. **Busca en Google**, no en ChatGPT. Aprender a buscar es más valioso que aprender a preguntar.
5. **Usa `print()` y `breakpoint()`** para debuggear. Ver variables en vivo vale más que mil tutoriales.

### Recursos externos recomendados

- **FastAPI docs** — https://fastapi.tiangolo.com/ (los mejores docs de Python)
- **SQLAlchemy 2.0 tutorial** — https://docs.sqlalchemy.org/en/20/tutorial/
- **Pydantic v2** — https://docs.pydantic.dev/latest/
- **Stripe API reference** — https://stripe.com/docs/api
- **pytest** — https://docs.pytest.org/

---

## 7. ESCALABILIDAD — De una empresa a SaaS multi-tenant

**Objetivo:** Este sistema se diseña para UNA empresa hoy, pero se construye con la arquitectura para soportar MÚLTIPLES empresas mañana.

### Qué es multi-tenant

Imagina que 10 empresas de transporte usan tu sistema. Cada una tiene:
- Sus propios clientes
- Sus propios precios
- Sus propios conductores
- Su propio panel de administración

Pero TODAS corren en el mismo servidor. Esto se llama **multi-tenant** (múltiples inquilinos).

### Decisiones de arquitectura que tomamos AHORA para facilitar el futuro

| Decisión | Hoy (single-tenant) | Mañana (multi-tenant) |
|----------|---------------------|----------------------|
| **UUIDs** | UUID v4 para todas las entidades | Siguen funcionando sin cambios |
| **Schemas Pydantic** | Validación fuerte desde el día 1 | No hay que refactorizar |
| **Servicios separados** | BookingService recibe db session | Solo agregar `tenant_id` al query |
| **Config por .env** | Un solo set de variables | Múltiples tenants con DB separadas o schema separado |
| **Docker** | Un contenedor por servicio | Escalar horizontalmente con Kubernetes |

### Cómo escalar paso a paso (cuando llegue el momento)

1. **Añadir tabla `Tenant`** con `id`, `name`, `domain`, `settings`
2. **Agregar `tenant_id`** a todas las tablas principales (Booking, Customer, AdminUser, etc.)
3. **Middleware de tenant** que detecta el tenant por dominio (`midominio.com` → tenant_id)
4. **Aislamiento de datos** — queries siempre filtran por `tenant_id`
5. **Billing por tenant** — Stripe subscriptions por empresa
6. **White-label** — cada empresa ve su propio logo, colores, dominio

---

## 8. ERRATA Y MEJORAS

_Esta sección se llena durante la ejecución. Si encuentras un error, un paso que no funciona, o una mejora necesaria, documéntala aquí._

| Fecha | Fase | Problema | Solución | Reportado por |
|-------|------|----------|----------|---------------|
| 2026-06-14 | Fase 1 | Python 3.12 no instalado en WSL; se usó Python 3.11.15 de ~/.local/bin. `pyproject.toml` ajustado a `>=3.11`. | Ajustar `requires-python`, `target-version`, `python_version` a 3.11. | DeepSeek V4 Pro |
| 2026-06-14 | Fase 1 | PostgreSQL no corriendo en WSL. El lifespan fallaba al iniciar. | Envolver `create_all` en try/except para desarrollo. El servidor arranca igual, solo health check funciona sin DB. | DeepSeek V4 Pro |
| 2026-06-14 | Fase 1 | `python3.12-venv` no instalado, sin sudo. | Usar Python 3.11 existente con venv ya funcional. | DeepSeek V4 Pro |

---

## 9. GLOSARIO — Términos técnicos explicados

| Término | Explicación simple |
|---------|-------------------|
| **API** | Interfaz que permite que dos programas se comuniquen. Tu frontend React le habla a tu backend FastAPI mediante la API. |
| **REST** | Estilo de API que usa URLs y métodos HTTP (GET, POST, PUT, DELETE). |
| **ORM** | Object-Relational Mapper. Traduce objetos Python a filas de base de datos. Escribes `booking.customer.name` y el ORM genera el SQL. |
| **Async/await** | Permite que el servidor atienda múltiples requests al mismo tiempo sin bloquearse. Como un mesero que toma varias órdenes mientras la cocina prepara. |
| **JWT** | JSON Web Token. Un "pase" digital firmado que prueba quién eres sin necesidad de consultar la base de datos cada vez. |
| **UUID** | Identificador único universal. Un string aleatorio tan grande que es imposible que dos sean iguales. |
| **Hash** | Función de un solo sentido. Conviertes "contraseña" en un string aleatorio, pero no puedes revertirlo. |
| **Middleware** | Código que se ejecuta ANTES de que tu endpoint procese el request. Como un guardia de seguridad en la entrada. |
| **Webhook** | Un endpoint que Stripe (o cualquier servicio) llama CUANDO PASA ALGO. Es Stripe diciéndole a tu servidor: "oye, ya pagaron". |
| **Docker** | Empaqueta tu aplicación con todas sus dependencias en un "contenedor" que corre igual en tu compu y en la nube. |
| **Celery** | Sistema de colas para tareas pesadas. En vez de esperar 3 segundos a que se envíe un email, lo mandas a la cola y el usuario sigue navegando. |
| **CORS** | Política de seguridad del navegador. Si tu frontend (localhost:5173) llama a tu backend (localhost:8000), necesitas CORS para permitirlo. |
| **Idempotente** | Una operación que puedes repetir 100 veces y el resultado es el mismo. Si Stripe te envía el mismo webhook 2 veces, solo procesas el pago una vez. |

---

> **Fin del WORKPLAN v2.1.**  
> **Documento vivo** — se actualiza con cada avance del proyecto.  
> **Siguiente acción real:** Fase 1.1 — `mkdir` de la estructura de carpetas.
