# Tabler.AR

A scalable, multi-tenant B2B SaaS that replaces printed menus with app-free QR ordering and **1:1 WebAR 3D food previews** projected directly onto the diner's table via Google `<model-viewer>`.

Diners scan a QR → menu loads instantly in the browser → preview dishes in 3D/AR → place the order → the kitchen sees the ticket **live** on a WebSocket-powered Kitchen Display System (KDS).

Every restaurant is isolated by a strict `tenant_id` filter — one codebase serves thousands of independent brands.

![Tabler.AR](https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&auto=format&fit=crop)

---

## Feature set

- **Marketing landing page** with Swiggy-Instamart-style typography (Anton + Manrope, hot-orange #FC8019, neo-brutalist edges).
- **Merchant dashboard** — Overview stats, Menu CRUD with 3D preview, Table & QR code generator, Orders board.
- **Diner mobile flow** — Category browse, dish detail with immersive `<model-viewer>`, sticky cart, checkout, order confirmation.
- **Real-time KDS** — WebSocket-driven kanban board (`Incoming → In the pass → Ready`). Sound alert on new tickets.
- **Super-admin panel** — Human-in-the-loop **video → .glb** pipeline. Merchants upload dish videos → super admin downloads, sculpts a WebAR-ready `.glb` (Meshy Studio / Blender / RealityCapture) → uploads it back → live for diners.
- **Strict multi-tenant isolation** — every MongoDB query filters by `tenant_id` extracted from the JWT.

---

## Tech stack

| Layer | Stack |
| --- | --- |
| Backend | FastAPI, Motor (async MongoDB), PyJWT, bcrypt, boto3 |
| Database | MongoDB (Atlas or self-hosted) |
| Object storage | Pluggable — Emergent object storage **or** any S3-compatible (AWS S3, Cloudflare R2, Backblaze B2, MinIO, Supabase, DigitalOcean Spaces) |
| Realtime | Native FastAPI WebSockets |
| Frontend | React 19 (CRA), Tailwind CSS, shadcn/ui, sonner toasts, Phosphor icons, framer-motion |
| 3D / AR | Google `<model-viewer>` web component (loaded from CDN) |

---

## Repo layout

```
/backend
  server.py         # all API routes + WS
  auth.py           # bcrypt + JWT
  storage.py        # pluggable storage (emergent | s3)
  seed.py           # super admin + demo tenant seed
  ws_manager.py     # tenant-scoped WS broadcast
  requirements.txt
  .env.example
/frontend
  src/
    pages/          # LandingPage, LoginPage, RegisterPage, DashboardPage, KDSPage, DinerMenuPage, SuperAdminPage
    components/     # ModelViewer wrapper, shadcn/ui
    lib/            # api, auth
    App.js, index.js, index.css
  package.json
  .env.example
DEPLOY.md           # step-by-step self-deploy guide
memory/PRD.md       # product requirements + backlog
memory/test_credentials.md
```

---

## Quick start (local development)

```bash
# 1. Backend
cd backend
cp .env.example .env
# Edit .env — either use STORAGE_PROVIDER=emergent (with EMERGENT_LLM_KEY) or STORAGE_PROVIDER=s3 (with S3 creds)
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 2. Frontend (in another terminal)
cd frontend
cp .env.example .env
# Set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

Open http://localhost:3000. Default seeded logins:
- **Super admin:** `admin@tabler.ar` / `admin123`
- **Demo merchant:** `demo@spice.co` / `demo123` (public menu at `/m/spice-route`)

---

## Deploying to production

See **[DEPLOY.md](./DEPLOY.md)** for a step-by-step guide covering:
- MongoDB Atlas setup
- Cloudflare R2 / AWS S3 setup
- Backend deploy on Railway / Fly.io / Render
- Frontend deploy on Vercel / Cloudflare Pages
- Optional hardening (CORS, rate limits, seed removal)
- Swapping the human-in-the-loop pipeline for auto Meshy AI when you get a key

---

## Environment variables (summary)

Backend (`backend/.env`):

| Var | Required | Notes |
| --- | --- | --- |
| `MONGO_URL` | yes | MongoDB connection string |
| `DB_NAME` | yes | Database name |
| `JWT_SECRET` | yes | 64-char random hex |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | yes | Super admin seed |
| `DEMO_TENANT_EMAIL`, `DEMO_TENANT_PASSWORD` | optional | Demo tenant credentials (defaults to `demo@spice.co` / `demo123`) |
| `SEED_DEMO_TENANT` | optional | `true` (default) to seed demo tenant, `false` to skip |
| `PUBLIC_BASE_URL` | recommended | Public HTTPS URL of the backend (used for file URLs) |
| `STORAGE_PROVIDER` | yes | `emergent` or `s3` |
| `EMERGENT_LLM_KEY` | if `emergent` | From Emergent dashboard |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | if `s3` | Standard S3 creds |
| `S3_ENDPOINT_URL` | for non-AWS S3 | R2 / MinIO / etc. endpoint |
| `APP_NAME` | optional | Object key prefix (default `tabler-ar`) |
| `CORS_ORIGINS` | optional | Explicit frontend origins (defaults to `*`) |

Frontend (`frontend/.env`):

| Var | Required | Notes |
| --- | --- | --- |
| `REACT_APP_BACKEND_URL` | yes | Public URL of the backend |

---

## License

Proprietary — for your own use. See owner for licensing.
