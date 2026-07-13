# Deploying Tabler.AR yourself

This guide covers deploying Tabler.AR **outside of Emergent** — to your own VPS,
Vercel/Railway, AWS, or bare metal.

If you just want to click one button, use Emergent's built-in Deploy instead
(cheaper, faster, and both the object storage and LLM key keep working).

---

## 1. What you'll need

| Requirement | Where to get it |
| --- | --- |
| **MongoDB** database | [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier is fine) or self-host |
| **S3-compatible object storage** | AWS S3, [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (recommended — free egress), Backblaze B2, DigitalOcean Spaces, MinIO, Supabase Storage |
| A domain name (for the backend) | Namecheap / Cloudflare / etc. |
| Node 18+, Python 3.11+, yarn | on your build/deploy host |

**Recommended combo for lowest cost:** MongoDB Atlas free tier + Cloudflare R2 (10 GB free) + Railway/Fly.io for the FastAPI backend + Vercel or Cloudflare Pages for the React frontend.

---

## 2. Storage setup (Cloudflare R2 example)

1. Create an R2 bucket (e.g. `tabler-ar-prod`).
2. Create an R2 API token with **Object Read & Write** on that bucket. You'll get an Access Key ID + Secret.
3. Grab your R2 endpoint URL: `https://<account-id>.r2.cloudflarestorage.com`.
4. (Optional) Enable a public custom domain (e.g. `https://media.your-domain.com`) — but you do NOT need this. The FastAPI backend proxies every download through `/api/files/*`.

For **AWS S3**, just leave `S3_ENDPOINT_URL` empty and set `S3_REGION` correctly.

---

## 3. Backend deploy

```bash
git clone <your-repo-url> tabler-ar
cd tabler-ar/backend
cp .env.example .env         # then edit .env with your values
pip install -r requirements.txt
```

Fill in `backend/.env`:

```bash
MONGO_URL="mongodb+srv://<user>:<pw>@cluster0.mongodb.net"
DB_NAME="tabler_ar"

JWT_SECRET="$(python -c 'import secrets;print(secrets.token_hex(32))')"
ADMIN_EMAIL="you@your-domain.com"
ADMIN_PASSWORD="<strong-password>"
# Optional: set false if you don't want the seed demo restaurant.
SEED_DEMO_TENANT="true"
DEMO_TENANT_EMAIL="demo@example.com"
DEMO_TENANT_PASSWORD="demo123"

PUBLIC_BASE_URL="https://api.your-domain.com"

STORAGE_PROVIDER="s3"
APP_NAME="tabler-ar"
S3_BUCKET="tabler-ar-prod"
S3_REGION="auto"                                 # R2 uses "auto"
S3_ACCESS_KEY_ID="<r2-access-key>"
S3_SECRET_ACCESS_KEY="<r2-secret>"
S3_ENDPOINT_URL="https://<account-id>.r2.cloudflarestorage.com"

CORS_ORIGINS="https://your-domain.com"
```

Run:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001
```

The first startup will:
- create MongoDB indexes,
- seed the super admin,
- seed the demo tenant "Spice Route" with 5 categories, 10 dishes, 8 tables,
- init the storage client (fails fast if the bucket/creds are wrong).

**Health check:** `GET /api/health` → `{"status":"ok",...}`.

### Deploying to Railway / Fly.io / Render

Any host that runs `uvicorn server:app --host 0.0.0.0 --port $PORT` works. Set the env vars in your host's dashboard (never commit `.env`). If your host doesn't set `X-Forwarded-Proto` / `X-Forwarded-Host`, make sure `PUBLIC_BASE_URL` is set correctly.

---

## 4. Frontend deploy

```bash
cd frontend
cp .env.example .env
yarn install
yarn build           # produces frontend/build/
```

Fill in `frontend/.env`:

```bash
REACT_APP_BACKEND_URL=https://api.your-domain.com
```

Serve `frontend/build/` from any static host:

- **Vercel** — connect the repo, set the root directory to `frontend`, framework preset "Create React App", add the env var.
- **Cloudflare Pages** — same setup, build command `yarn build`, output `build`.
- **Nginx / VPS** — `serve -s build` or copy to `/var/www/html`.

---

## 5. First-run smoke test

1. Visit `https://your-frontend-domain.com/` — landing page loads.
2. Log in at `/login` with your `ADMIN_EMAIL` / `ADMIN_PASSWORD` → routed to `/superadmin`.
3. Log in at `/login` with the demo tenant → routed to `/dashboard`.
4. Open the diner menu at `/m/spice-route?table=T01` → should show 10 dishes.
5. Open the KDS at `/kds` from the merchant dashboard → green "Realtime connected".
6. Place a diner order → it should pop into the KDS in under a second.

---

## 6. Optional hardening for production

- **Change** `ADMIN_PASSWORD` (or remove seed and create your admin via a one-off script).
- **Set** `SEED_DEMO_TENANT=false` to skip seeding the demo restaurant.
- **Set** `CORS_ORIGINS` to your explicit frontend origin (currently defaults to `*`).
- **Add** brute-force / rate-limiting middleware on `/api/auth/login` (e.g. `slowapi`).
- **Run** MongoDB with authentication + TLS.
- **Serve** the backend behind HTTPS (Caddy / Cloudflare / a load balancer).

---

## 7. Swapping the human-in-the-loop 3D pipeline for auto

If you later get a **Meshy AI** API key (or Luma / Tripo / Rodin), swap the manual super-admin flow for an automated one:

1. In `backend/server.py`, replace the `sa_upload_model` handler's manual upload with a background task that:
   - reads the merchant's `video_path` from storage,
   - extracts a keyframe with `ffmpeg`,
   - POSTs the frame to `https://api.meshy.ai/openapi/v1/image-to-3d`,
   - polls until the model finishes, downloads the .glb,
   - uploads to your storage via `put_object`,
   - sets `dish.model_url` + `model_status = "ready"`.

The `storage.put_object` + `_file_url` helpers stay identical.

---

## 8. Questions?

Open an issue on the repo, or check the code — everything's under 15 files.
