# Guía de Deploy — ClassVIP Transfers

Arquitectura de producción:

```
  Cliente (navegador)
        │
        ├──────────────►  Vercel  (frontend React/Vite, CDN global)
        │                    │
        │                    ▼  fetch a VITE_API_URL
        └──────────────►  Railway (backend FastAPI, región US East)
                             │
                             ▼  SQL
                          Supabase (PostgreSQL, AWS us-east-1)
```

**Regla de oro de latencia:** Railway y Supabase deben estar en la **misma región
(US East / Virginia)**. Cada request hace varias consultas SQL; si el backend está
lejos de la DB, la latencia se multiplica.

---

## 1. Backend en Railway

### 1.1 Crear el servicio
1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Selecciona el repo `condecorporation-del/Classviptransferspy`
3. En el servicio → **Settings → Source**:
   - **Root Directory:** `backend`  ← imprescindible (ahí está el Dockerfile y railway.toml)
   - **Region:** **US East (Virginia)**  ← misma región que Supabase
4. Railway detecta el `Dockerfile` automáticamente y construye.

### 1.2 Variables de entorno (Settings → Variables)
Copia los valores reales (NO los placeholders). Genera el `SECRET_KEY` con:
`python -c "import secrets; print(secrets.token_hex(32))"`

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Connection string del **Session pooler** de Supabase (ver nota ⚠️ abajo) |
| `DATABASE_URL_DIRECT` | *(déjala vacía)* — las migraciones usan `DATABASE_URL` |
| `SECRET_KEY` | 64 caracteres aleatorios nuevos (no reuses ninguno viejo) |
| `ADMIN_EMAIL` | `admin@classviptransfers.com` |
| `ADMIN_PASSWORD_HASH` | el hash de tu admin (ya lo tienes en tu `.env` local) |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | `ClassVIP Transfers <bookings@classviptransfers.com>` |
| `EMAIL_BCC` | `operations@classviptransfers.com` |
| `OPENAI_API_KEY` | tu key (o vacío si no usas el chat) |
| `FRONTEND_URL` | `https://TU-APP.vercel.app` (la pones después de crear Vercel) |
| `ALLOWED_ORIGINS` | `https://TU-APP.vercel.app` (mismo dominio; sin barra final) |
| `ENVIRONMENT` | `production` |
| `LOG_LEVEL` | `INFO` |
| `WEB_CONCURRENCY` | `2` (workers de uvicorn; subir solo si hace falta) |

> ⚠️ **Supabase + Railway (IPv6):** la "Direct connection" de Supabase
> (`db.<ref>.supabase.co`) hoy es **solo IPv6**, y Railway no garantiza salida
> IPv6 — las migraciones fallarían. **Usa el Session pooler** (IPv4) para TODO:
> Dashboard de Supabase → **Connect** → **Session pooler** → copia la URI y
> cámbiale el prefijo a `postgresql+asyncpg://`. Queda así:
> `postgresql+asyncpg://postgres.<ref>:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
> (puerto **5432**, host `pooler.supabase.com`). Dejando `DATABASE_URL_DIRECT`
> vacía, Alembic usa esta misma — sin problema de IPv6.

### 1.3 Plan
- Sube al plan **Hobby ($5/mes)** para que el servicio **no se duerma**
  (sin esto hay cold-start de varios segundos en el primer request).

### 1.4 Verificar
- Al terminar el deploy, abre `https://TU-BACKEND.up.railway.app/health` → debe dar
  `{"status":"ok",...}`.
- `https://TU-BACKEND.up.railway.app/health/ready` → `{"status":"ready"}` (confirma DB).
- `https://TU-BACKEND.up.railway.app/docs` → **404** (correcto: oculto en producción).

---

## 2. Frontend en Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importa el mismo repo
2. **Root Directory:** `frontend`
3. Framework: **Vite** (autodetectado; `vercel.json` ya define build/output/rewrites)
4. **Environment Variables:**
   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://TU-BACKEND.up.railway.app` ← **SIN** `/api/v1` al final |
5. **Deploy.**

> El `VITE_API_URL` va sin `/api/v1` porque el código ya antepone ese prefijo a
> cada llamada (`${getApiBaseUrl()}/api/v1/...`). Si lo dejas con `/api/v1`,
> las URLs quedarían duplicadas (`/api/v1/api/v1/...`) y todo daría 404.

---

## 3. Conectar las dos puntas (orden importa)

1. Deploy del **backend** primero → copia su URL de Railway.
2. Deploy del **frontend** en Vercel con `VITE_API_URL` = URL del backend.
3. Copia la URL final de Vercel.
4. Vuelve a **Railway** → pon esa URL en `FRONTEND_URL` y `ALLOWED_ORIGINS` →
   Railway redeploya solo. (Sin esto, el navegador bloquea las llamadas por CORS.)

---

## 4. Stripe Webhook (cobros)

En el Dashboard de Stripe → **Developers → Webhooks → Add endpoint**:
- URL: `https://TU-BACKEND.up.railway.app/api/v1/stripe/webhook`
- Copia el **Signing secret** (`whsec_...`) y ponlo en `STRIPE_WEBHOOK_SECRET` en Railway.

---

## 5. Checklist de seguridad (ya cubierto en el código)

- [x] `.env` real **nunca** en el repo (solo `.env.example` con placeholders).
- [x] `ENVIRONMENT=production` activa validación fail-fast: la app **no arranca**
      con `SECRET_KEY` débil, DB local, o sin Stripe/Resend.
- [x] `/docs`, `/redoc`, `/openapi.json` ocultos en producción.
- [x] CORS restringido a `ALLOWED_ORIGINS` (no `*`).
- [x] Cabeceras de seguridad + HSTS (HTTPS forzado) en producción.
- [x] Rate limiting en login (anti fuerza bruta) y booking público (anti spam).
- [x] RLS habilitado en las 20 tablas de Supabase.
- [x] Contenedor corre como usuario **no-root**.
- [x] Migraciones vía Alembic al arrancar (nunca `create_all`).

### Tras el primer deploy
1. **Rota el `SECRET_KEY`** si reusaste alguno que haya tocado disco/Git.
2. Confirma que `/docs` da 404 en el dominio de Railway.
3. Haz una reserva de prueba de punta a punta (booking → pago → email → PDF).
