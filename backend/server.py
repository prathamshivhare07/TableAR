"""Tabler AR — Multi-tenant B2B SaaS backend (FastAPI + MongoDB).

- JWT auth (super_admin, tenant_admin, staff) with strict tenant_id filtering
- Real-time KDS via WebSocket
- Human-in-the-loop video -> 3D model pipeline via Emergent object storage
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends, Response, WebSocket,
    WebSocketDisconnect, Query, UploadFile, File, Request,
)
from fastapi.responses import Response as FastResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from backend.auth import (
    hash_password, verify_password, create_access_token, decode_token,
    get_current_user, set_auth_cookie, clear_auth_cookie,
)
from backend.seed import seed_all
from backend.ws_manager import manager
from backend.storage import init_storage, put_object, get_object, guess_mime, APP_NAME

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("tabler")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Tabler AR")
api = APIRouter(prefix="/api")

MAX_VIDEO_BYTES = 60 * 1024 * 1024   # 60MB
MAX_MODEL_BYTES = 25 * 1024 * 1024   # 25MB


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# =========================================================
# Auth models
# =========================================================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    restaurant_name: str
    slug: str = Field(min_length=3, pattern=r"^[a-z0-9-]+$")


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OrderItemIn(BaseModel):
    dish_id: str
    qty: int = Field(ge=1)
    note: Optional[str] = None


class OrderIn(BaseModel):
    tenant_slug: str
    table_code: Optional[str] = None
    items: List[OrderItemIn]
    diner_name: Optional[str] = None


class CategoryIn(BaseModel):
    name: str
    kind: str = "default"
    emoji: Optional[str] = None
    sort_order: int = 0


class DishIn(BaseModel):
    category_id: str
    name: str
    description: str = ""
    price: float
    image_url: Optional[str] = None
    is_available: bool = True
    is_signature: bool = False


class DishUpdateIn(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_signature: Optional[bool] = None


class TableIn(BaseModel):
    code: str
    label: Optional[str] = None
    seats: int = 4


class StatusPatchIn(BaseModel):
    status: str  # new | preparing | ready | served | cancelled


def _serialize_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "tenant_id": u.get("tenant_id"),
    }


async def require_tenant_admin(user=Depends(get_current_user)) -> dict:
    if user["role"] not in ("tenant_admin", "staff", "super_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] != "super_admin" and not user.get("tenant_id"):
        raise HTTPException(status_code=403, detail="No tenant context")
    return user


async def require_super_admin(user=Depends(get_current_user)) -> dict:
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin only")
    return user


# =========================================================
# Auth endpoints
# =========================================================
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.tenants.find_one({"slug": payload.slug}):
        raise HTTPException(status_code=400, detail="Slug already taken")

    tenant_id = new_id()
    await db.tenants.insert_one({
        "id": tenant_id,
        "slug": payload.slug,
        "name": payload.restaurant_name,
        "tagline": f"Welcome to {payload.restaurant_name}",
        "brand_color": "#FC8019",
        "logo_url": None,
        "hero_image": "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200",
        "currency": "USD",
        "plan": "starter",
        "created_at": now_iso(),
    })
    user_id = new_id()
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": "tenant_admin",
        "tenant_id": tenant_id,
        "created_at": now_iso(),
    })
    for i in range(1, 5):
        await db.tables.insert_one({
            "id": new_id(),
            "tenant_id": tenant_id,
            "code": f"T{i:02d}",
            "label": f"Table {i}",
            "seats": 4,
            "created_at": now_iso(),
        })

    token = create_access_token(user_id, email, "tenant_admin", tenant_id)
    set_auth_cookie(response, token)
    return {"token": token, "user": {"id": user_id, "email": email, "name": payload.name, "role": "tenant_admin", "tenant_id": tenant_id}}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not verify_password(payload.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(u["id"], u["email"], u["role"], u.get("tenant_id"))
    set_auth_cookie(response, token)
    return {"token": token, "user": _serialize_user(u)}


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return _serialize_user(user)


# =========================================================
# Public diner endpoints
# =========================================================
@api.get("/menu/{slug}")
async def get_menu(slug: str, table: Optional[str] = None):
    tenant = await db.tenants.find_one({"slug": slug}, {"_id": 0})
    if not tenant:
        raise HTTPException(404, "Restaurant not found")
    cats = await db.categories.find({"tenant_id": tenant["id"]}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    dishes = await db.dishes.find({"tenant_id": tenant["id"], "is_available": True}, {"_id": 0}).to_list(1000)
    table_info = None
    if table:
        t = await db.tables.find_one({"tenant_id": tenant["id"], "code": table}, {"_id": 0})
        if t:
            table_info = t
    return {"tenant": tenant, "categories": cats, "dishes": dishes, "table": table_info}


@api.post("/orders")
async def place_order(payload: OrderIn):
    tenant = await db.tenants.find_one({"slug": payload.tenant_slug})
    if not tenant:
        raise HTTPException(404, "Restaurant not found")

    tenant_id = tenant["id"]
    dish_ids = [it.dish_id for it in payload.items]
    dishes = await db.dishes.find({"tenant_id": tenant_id, "id": {"$in": dish_ids}}, {"_id": 0}).to_list(500)
    dish_map = {d["id"]: d for d in dishes}
    if len(dish_map) != len(set(dish_ids)):
        raise HTTPException(400, "Some dishes not found in this restaurant's menu")

    line_items = []
    subtotal = 0.0
    for it in payload.items:
        d = dish_map[it.dish_id]
        line_total = d["price"] * it.qty
        subtotal += line_total
        line_items.append({
            "dish_id": d["id"],
            "name": d["name"],
            "qty": it.qty,
            "price": d["price"],
            "line_total": round(line_total, 2),
            "note": it.note,
        })
    tax = round(subtotal * 0.08, 2)
    total = round(subtotal + tax, 2)

    order_id = new_id()
    order_no = f"#{int(datetime.now(timezone.utc).timestamp()) % 100000:05d}"
    doc = {
        "id": order_id,
        "order_no": order_no,
        "tenant_id": tenant_id,
        "table_code": payload.table_code,
        "diner_name": payload.diner_name,
        "items": line_items,
        "subtotal": round(subtotal, 2),
        "tax": tax,
        "total": total,
        "status": "new",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)

    asyncio.create_task(manager.broadcast(tenant_id, {"event": "order.new", "order": doc}))
    return {"order_id": order_id, "order_no": order_no, "total": total, "status": "new"}


@api.get("/orders/{order_id}")
async def get_order_public(order_id: str):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    return o


# =========================================================
# Public file streaming (for <model-viewer> src, video previews)
# Paths are UUID-based and stored in DB — obscurity + DB lookup is the gate.
# =========================================================
@api.get("/files/{path:path}")
async def stream_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "File not found")
    try:
        data, ctype = get_object(path)
    except Exception as e:
        log.warning("storage fetch failed: %s", e)
        raise HTTPException(500, "Storage error")
    return FastResponse(content=data, media_type=rec.get("content_type") or ctype)


def _file_url(request: Request, path: str) -> str:
    """Build a public URL for a stored file that model-viewer / <video> can load.

    Priority:
      1. PUBLIC_BASE_URL env var (explicit, most reliable behind ingress)
      2. X-Forwarded-Proto + X-Forwarded-Host headers (set by the K8s ingress)
      3. request.base_url (fallback for local dev)
    """
    base = os.environ.get("PUBLIC_BASE_URL")
    if not base:
        fwd_host = request.headers.get("x-forwarded-host")
        fwd_proto = request.headers.get("x-forwarded-proto", "https")
        if fwd_host:
            base = f"{fwd_proto}://{fwd_host}"
        else:
            base = str(request.base_url)
    base = base.rstrip("/")
    return f"{base}/api/files/{path}"


# =========================================================
# Tenant endpoints
# =========================================================
def _tid(user: dict) -> str:
    tid = user.get("tenant_id")
    if not tid:
        raise HTTPException(400, "No tenant context")
    return tid


@api.get("/tenant/me")
async def tenant_me(user=Depends(require_tenant_admin)):
    t = await db.tenants.find_one({"id": _tid(user)}, {"_id": 0})
    return {"user": _serialize_user(user), "tenant": t}


# Categories
@api.get("/tenant/categories")
async def list_categories(user=Depends(require_tenant_admin)):
    return await db.categories.find({"tenant_id": _tid(user)}, {"_id": 0}).sort("sort_order", 1).to_list(500)


@api.post("/tenant/categories")
async def create_category(payload: CategoryIn, user=Depends(require_tenant_admin)):
    doc = {"id": new_id(), "tenant_id": _tid(user), **payload.model_dump(), "created_at": now_iso()}
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/tenant/categories/{cid}")
async def delete_category(cid: str, user=Depends(require_tenant_admin)):
    res = await db.categories.delete_one({"id": cid, "tenant_id": _tid(user)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# Dishes
@api.get("/tenant/dishes")
async def list_dishes(user=Depends(require_tenant_admin)):
    return await db.dishes.find({"tenant_id": _tid(user)}, {"_id": 0}).sort("created_at", -1).to_list(2000)


@api.post("/tenant/dishes")
async def create_dish(payload: DishIn, user=Depends(require_tenant_admin)):
    tid = _tid(user)
    cat = await db.categories.find_one({"id": payload.category_id, "tenant_id": tid})
    if not cat:
        raise HTTPException(400, "Category not found")
    doc = {
        "id": new_id(),
        "tenant_id": tid,
        "category_kind": cat.get("kind", "default"),
        **payload.model_dump(),
        "model_url": None,
        "model_status": "none",     # none | pending_review | processing | ready | failed
        "video_path": None,          # storage path of the source video
        "video_uploaded_at": None,
        "created_at": now_iso(),
    }
    await db.dishes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/tenant/dishes/{did}")
async def update_dish(did: str, payload: DishUpdateIn, user=Depends(require_tenant_admin)):
    tid = _tid(user)
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "Empty update")
    res = await db.dishes.update_one({"id": did, "tenant_id": tid}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.dishes.find_one({"id": did}, {"_id": 0})


@api.delete("/tenant/dishes/{did}")
async def delete_dish(did: str, user=Depends(require_tenant_admin)):
    res = await db.dishes.delete_one({"id": did, "tenant_id": _tid(user)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.post("/tenant/dishes/{did}/upload-video")
async def upload_dish_video(did: str, request: Request, file: UploadFile = File(...), user=Depends(require_tenant_admin)):
    """Merchant uploads a video of the dish. Enqueued for super-admin manual 3D processing."""
    tid = _tid(user)
    dish = await db.dishes.find_one({"id": did, "tenant_id": tid})
    if not dish:
        raise HTTPException(404, "Dish not found")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(400, "Empty upload")
    if len(data) > MAX_VIDEO_BYTES:
        raise HTTPException(413, f"Video too large. Max {MAX_VIDEO_BYTES // (1024 * 1024)}MB")
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "mp4").lower()
    if ext not in ("mp4", "mov", "webm"):
        raise HTTPException(400, "Unsupported video format. Use mp4, mov or webm.")

    path = f"{APP_NAME}/videos/{tid}/{did}/{uuid.uuid4()}.{ext}"
    ctype = file.content_type or guess_mime(file.filename or "", "video/mp4")
    try:
        result = put_object(path, data, ctype)
    except Exception as e:
        log.exception("video upload failed: %s", e)
        raise HTTPException(500, "Storage upload failed")

    stored_path = result["path"]
    await db.files.insert_one({
        "id": new_id(),
        "storage_path": stored_path,
        "original_filename": file.filename or f"dish-{did}.{ext}",
        "content_type": ctype,
        "size": result.get("size", len(data)),
        "tenant_id": tid,
        "dish_id": did,
        "kind": "video",
        "is_deleted": False,
        "created_at": now_iso(),
    })
    await db.dishes.update_one(
        {"id": did},
        {"$set": {"video_path": stored_path, "model_status": "pending_review",
                  "video_uploaded_at": now_iso()}}
    )
    return {
        "status": "pending_review",
        "video_url": _file_url(request, stored_path),
    }


# Tables
@api.get("/tenant/tables")
async def list_tables(user=Depends(require_tenant_admin)):
    return await db.tables.find({"tenant_id": _tid(user)}, {"_id": 0}).sort("code", 1).to_list(500)


@api.post("/tenant/tables")
async def create_table(payload: TableIn, user=Depends(require_tenant_admin)):
    tid = _tid(user)
    if await db.tables.find_one({"tenant_id": tid, "code": payload.code}):
        raise HTTPException(400, "Table code already exists")
    doc = {"id": new_id(), "tenant_id": tid, "label": payload.label or f"Table {payload.code}",
           "code": payload.code, "seats": payload.seats, "created_at": now_iso()}
    await db.tables.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/tenant/tables/{tid_}")
async def delete_table(tid_: str, user=Depends(require_tenant_admin)):
    res = await db.tables.delete_one({"id": tid_, "tenant_id": _tid(user)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# Orders
@api.get("/tenant/orders")
async def list_orders(status: Optional[str] = None, user=Depends(require_tenant_admin)):
    q: dict = {"tenant_id": _tid(user)}
    if status:
        q["status"] = status
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)


@api.patch("/tenant/orders/{oid}/status")
async def update_order_status(oid: str, payload: StatusPatchIn, user=Depends(require_tenant_admin)):
    tid = _tid(user)
    allowed = {"new", "preparing", "ready", "served", "cancelled"}
    if payload.status not in allowed:
        raise HTTPException(400, f"Invalid status. Allowed: {allowed}")
    res = await db.orders.update_one({"id": oid, "tenant_id": tid},
                                     {"$set": {"status": payload.status, "updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    asyncio.create_task(manager.broadcast(tid, {"event": "order.updated", "order": order}))
    return order


@api.get("/tenant/analytics")
async def analytics(user=Depends(require_tenant_admin)):
    tid = _tid(user)
    today = datetime.now(timezone.utc).date().isoformat()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    all_orders = await db.orders.find({"tenant_id": tid}, {"_id": 0}).to_list(5000)
    today_orders = [o for o in all_orders if o["created_at"].startswith(today)]
    week_orders = [o for o in all_orders if o["created_at"] >= week_ago]

    revenue_today = round(sum(o["total"] for o in today_orders if o["status"] != "cancelled"), 2)
    revenue_week = round(sum(o["total"] for o in week_orders if o["status"] != "cancelled"), 2)

    dish_counts: dict = {}
    for o in week_orders:
        for it in o["items"]:
            dish_counts[it["name"]] = dish_counts.get(it["name"], 0) + it["qty"]
    top_dishes = sorted(dish_counts.items(), key=lambda x: -x[1])[:5]

    daily: dict = {}
    for o in week_orders:
        if o["status"] == "cancelled":
            continue
        day = o["created_at"][:10]
        daily[day] = round(daily.get(day, 0.0) + o["total"], 2)

    return {
        "orders_today": len(today_orders),
        "orders_week": len(week_orders),
        "revenue_today": revenue_today,
        "revenue_week": revenue_week,
        "avg_ticket": round(revenue_week / max(len(week_orders), 1), 2),
        "top_dishes": [{"name": n, "qty": q} for n, q in top_dishes],
        "daily_revenue": [{"day": d, "revenue": r} for d, r in sorted(daily.items())],
    }


# =========================================================
# Super Admin — 3D Model Queue + tenant oversight
# =========================================================
@api.get("/superadmin/stats")
async def sa_stats(_=Depends(require_super_admin)):
    tenants = await db.tenants.count_documents({})
    dishes = await db.dishes.count_documents({})
    orders = await db.orders.count_documents({})
    pending = await db.dishes.count_documents({"model_status": "pending_review"})
    ready = await db.dishes.count_documents({"model_status": "ready"})
    return {"tenants": tenants, "dishes": dishes, "orders": orders,
            "pending_models": pending, "ready_models": ready}


@api.get("/superadmin/tenants")
async def sa_tenants(_=Depends(require_super_admin)):
    tenants = await db.tenants.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for t in tenants:
        t["dish_count"] = await db.dishes.count_documents({"tenant_id": t["id"]})
        t["order_count"] = await db.orders.count_documents({"tenant_id": t["id"]})
    return tenants


@api.get("/superadmin/queue")
async def sa_queue(request: Request, _=Depends(require_super_admin)):
    """List every dish that needs 3D model processing."""
    dishes = await db.dishes.find(
        {"model_status": {"$in": ["pending_review", "processing"]}},
        {"_id": 0}
    ).sort("video_uploaded_at", 1).to_list(500)
    for d in dishes:
        t = await db.tenants.find_one({"id": d["tenant_id"]}, {"_id": 0, "name": 1, "slug": 1})
        d["tenant"] = t
        if d.get("video_path"):
            d["video_url"] = _file_url(request, d["video_path"])
    return dishes


@api.get("/superadmin/queue/all")
async def sa_queue_all(request: Request, _=Depends(require_super_admin)):
    """All dishes across all tenants — for the super-admin to see everything."""
    dishes = await db.dishes.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    for d in dishes:
        t = await db.tenants.find_one({"id": d["tenant_id"]}, {"_id": 0, "name": 1, "slug": 1})
        d["tenant"] = t
        if d.get("video_path"):
            d["video_url"] = _file_url(request, d["video_path"])
        if d.get("model_url_path"):
            d["model_url"] = _file_url(request, d["model_url_path"])
    return dishes


@api.post("/superadmin/dishes/{did}/upload-model")
async def sa_upload_model(did: str, request: Request, file: UploadFile = File(...), _=Depends(require_super_admin)):
    """Super admin uploads the processed .glb (or .usdz) for a specific dish."""
    dish = await db.dishes.find_one({"id": did})
    if not dish:
        raise HTTPException(404, "Dish not found")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(400, "Empty upload")
    if len(data) > MAX_MODEL_BYTES:
        raise HTTPException(413, f"Model too large. Max {MAX_MODEL_BYTES // (1024 * 1024)}MB")
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "glb").lower()
    if ext not in ("glb", "usdz"):
        raise HTTPException(400, "Only .glb or .usdz accepted")

    path = f"{APP_NAME}/models/{dish['tenant_id']}/{did}/{uuid.uuid4()}.{ext}"
    ctype = guess_mime(f"x.{ext}", "model/gltf-binary")
    try:
        result = put_object(path, data, ctype)
    except Exception as e:
        log.exception("model upload failed: %s", e)
        raise HTTPException(500, "Storage upload failed")

    stored_path = result["path"]
    await db.files.insert_one({
        "id": new_id(),
        "storage_path": stored_path,
        "original_filename": file.filename or f"dish-{did}.{ext}",
        "content_type": ctype,
        "size": result.get("size", len(data)),
        "tenant_id": dish["tenant_id"],
        "dish_id": did,
        "kind": "model",
        "is_deleted": False,
        "created_at": now_iso(),
    })
    public_url = _file_url(request, stored_path)
    await db.dishes.update_one(
        {"id": did},
        {"$set": {
            "model_status": "ready",
            "model_url_path": stored_path,
            "model_url": public_url,
        }}
    )
    return {"status": "ready", "model_url": public_url}


@api.post("/superadmin/dishes/{did}/mark-processing")
async def sa_mark_processing(did: str, _=Depends(require_super_admin)):
    res = await db.dishes.update_one({"id": did}, {"$set": {"model_status": "processing"}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.post("/superadmin/dishes/{did}/reset")
async def sa_reset(did: str, _=Depends(require_super_admin)):
    res = await db.dishes.update_one(
        {"id": did},
        {"$set": {"model_status": "none", "model_url": None, "model_url_path": None, "video_path": None}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# =========================================================
# WebSocket — Kitchen Display System
# =========================================================
@api.websocket("/ws/kds")
async def ws_kds(ws: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
    except HTTPException:
        await ws.close(code=4401)
        return
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        await ws.close(code=4403)
        return
    await manager.connect(tenant_id, ws)
    try:
        open_orders = await db.orders.find(
            {"tenant_id": tenant_id, "status": {"$in": ["new", "preparing", "ready"]}},
            {"_id": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        await ws.send_json({"event": "snapshot", "orders": list(reversed(open_orders))})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(tenant_id, ws)
    except Exception as e:
        log.warning("KDS ws error: %s", e)
        manager.disconnect(tenant_id, ws)


# =========================================================
# Meta
# =========================================================
@api.get("/")
async def root():
    return {"service": "tabler-ar", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok", "time": now_iso()}


app.include_router(api)

_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,  # We use Bearer tokens, not cookies, cross-origin.
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await seed_all(db)
        log.info("Seed complete")
    except Exception as e:
        log.exception("Seed failed: %s", e)
    try:
        init_storage()
    except Exception as e:
        log.warning("Storage init failed (will retry on first use): %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
