# ClassVIP Transfers — Frontend

Frontend React + TypeScript para ClassVIP Transfers. Transportación de lujo en Los Cabos.

## Stack

- React 18 + TypeScript 5
- Vite 7
- TailwindCSS 3 + shadcn/ui
- TanStack Query
- react-hook-form + zod
- react-router-dom
- framer-motion
- lucide-react

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

El frontend corre en `http://localhost:5173` y espera el backend en `http://localhost:8000/api/v1`.

## Estructura

```
src/
├── features/
│   ├── marketing/pages/    # Index, Transfers, Contact, Portfolio
│   ├── booking/pages/      # Book, Checkout, Confirmation, Success
│   └── admin/
│       ├── pages/          # AdminLogin, Admin (dashboard)
│       ├── components/     # Tabs: Overview, Bookings, Pricing, etc.
│       └── hooks/          # useAdminAuth
├── shared/
│   ├── lib/api.ts          # Cliente HTTP centralizado
│   ├── components/         # Layout, Placeholder
│   ├── pages/              # NotFound
│   └── ui/                 # shadcn/ui components
└── components/ui/          # shadcn/ui (auto-generado)
```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Homepage |
| `/transfers` | Catálogo de servicios |
| `/book` | Formulario de reserva |
| `/checkout` | Pago (Stripe próximo) |
| `/confirmation` | Confirmación post-reserva |
| `/contact` | Contacto + WhatsApp |
| `/portfolio` | Galería |
| `/admin/login` | Login admin |
| `/admin` | Dashboard admin |

## Build producción

```bash
npm run build
```

Output en `dist/`.
