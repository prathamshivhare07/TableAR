# Tabler.AR — Product Requirements Document

## Original problem statement
Build a scalable, multi-tenant B2B SaaS platform that replaces traditional menus with app-free QR ordering and interactive, 1:1 scale WebAR 3D food visualizations projected directly onto a diner's table. When a customer scans a table-specific QR code, a lightning-fast browser menu loads instantly, allowing them to preview highly realistic 3D models of dishes (utilizing compressed .glb and .usdz formats under 15MB via Google's <model-viewer>) to eliminate ordering anxiety and drive upselling. Once the diner builds their cart and submits the order, the backend uses real-time WebSockets to instantly stream the ticket to a touch-optimized Kitchen Display System (KDS) for the staff. The entire ecosystem is built to scale smoothly across thousands of independent restaurant brands simultaneously, relying on a robust PostgreSQL database architecture that uses strict logical isolation (tenant_id filtering) to keep every merchant's menus, orders, and analytics securely separated under a unified codebase.

## User choices
- Database: MongoDB (with strict tenant_id isolation on every query)
- Auth: Custom JWT email/password auth (bcrypt hashing)
- Video → 3D: Human-in-the-loop pipeline (merchant uploads video → super_admin manually crafts .glb → uploads back → live for diners) using Emergent object storage
- Scope: Full end-to-end diner + KDS + merchant admin + super admin
- Design vibe: Swiggy Instamart (Anton display, Manrope body, hot orange #FC8019, neo-brutalist hard shadows)

## User personas
1. **Diner** — Guest scanning QR at a table. Wants to browse dishes fast, preview in 3D/AR, order.
2. **Restaurant owner (tenant_admin)** — Owns menu/tables/orders/analytics. Uploads dish videos.
3. **Kitchen staff (staff)** — Uses KDS to fire orders. Same auth as tenant_admin.
4. **Super admin** — Platform operator. Processes video→3D pipeline for all tenants; oversight.

## Architecture (implemented)
- **Backend**: FastAPI + MongoDB (Motor async driver). All routes `/api/*`.
- **Auth**: JWT (7-day expiry) via Bearer header. bcrypt password hashes. Roles: `super_admin | tenant_admin | staff`.
- **Multi-tenancy**: Every tenant-scoped MongoDB query filters by `tenant_id` server-side. JWT carries the tenant_id.
- **Storage**: Emergent object storage for videos + .glb/.usdz. Files streamed via `/api/files/{path:path}`.
- **Realtime**: WebSocket `/api/ws/kds?token=<jwt>` broadcasting `order.new` + `order.updated` per tenant.
- **3D**: Google `<model-viewer>` web component loaded from CDN, wrapped in `ModelViewer.jsx`.
- **Frontend**: React (CRA) + Tailwind + shadcn/ui components + sonner toasts + Phosphor icons.

## What's been implemented (2026-02-12)
### Backend (`/app/backend`)
- `server.py` — All endpoints:
  - Auth: `POST /api/auth/register|login|logout`, `GET /api/auth/me`
  - Public diner: `GET /api/menu/{slug}?table=T01`, `POST /api/orders`, `GET /api/orders/{id}`, `GET /api/files/{path}`
  - Tenant: `GET/POST /api/tenant/{me,categories,tables,dishes,orders,analytics}`, plus dish PUT/DELETE, table DELETE, category DELETE, order status PATCH, `POST /api/tenant/dishes/{id}/upload-video`
  - Super admin: `GET /api/superadmin/{stats,queue,queue/all,tenants}`, `POST /api/superadmin/dishes/{id}/upload-model|mark-processing|reset`
  - WebSocket: `/api/ws/kds`
- `auth.py` — bcrypt + JWT helpers
- `storage.py` — Emergent object storage client
- `seed.py` — Seeds super admin + demo tenant "Spice Route" (5 categories, 10 dishes with sample .glb URLs, 8 tables)
- `ws_manager.py` — In-memory tenant-keyed WS broadcast

### Frontend (`/app/frontend/src`)
- `App.js` — Router with `Protected` gating by role
- `pages/LandingPage.jsx` — Marketing (hero, marquee, how-it-works, features, pricing, footer)
- `pages/LoginPage.jsx`, `RegisterPage.jsx`
- `pages/DashboardPage.jsx` — Merchant admin (Overview / Menu & 3D / Tables & QR / Orders)
- `pages/KDSPage.jsx` — Real-time WebSocket kitchen display with 3 columns
- `pages/DinerMenuPage.jsx` — Mobile-first QR menu with <model-viewer> dish detail + cart + order placement
- `pages/SuperAdminPage.jsx` — 3D queue + tenants list + upload .glb modal
- `components/ModelViewer.jsx` — Lazy-loads `<model-viewer>` web component from CDN
- `lib/api.js` — Axios instance + Bearer token interceptor
- `lib/auth.jsx` — AuthContext + login/register/logout

## Seed credentials
- Super admin: `admin@tabler.ar` / `admin123`
- Demo merchant: `demo@spice.co` / `demo123` (tenant slug: `spice-route`)

## Prioritized backlog
### P0 (remaining)
- End-to-end testing (backend + frontend)

### P1 (next)
- Stripe payment integration for diner checkout (currently just places order, no payment)
- Push notifications / sound alerts when the diner's order is ready
- .usdz sibling upload for iOS Quick Look (already scaffolded, needs UI)
- Optional Meshy AI direct integration when the operator obtains an API key (swap the human loop for auto)

### P2 (later)
- Category CRUD UI in dashboard (categories are seeded; API exists, UI missing)
- Staff sub-accounts (multiple KDS users per tenant)
- QR code print sheet / PDF export
- Multi-language menus
- Delivery/takeaway toggle

## Next tasks list
1. Run backend + frontend end-to-end tests
2. Fix any critical bugs surfaced
3. Deliver first finish
