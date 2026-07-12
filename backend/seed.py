"""Seed demo tenant, users, tables, categories, dishes for the WebAR ordering demo."""
import os
import uuid
from datetime import datetime, timezone

from auth import hash_password, verify_password

# 3D model pool — used by the stub video->3D pipeline to assign a realistic sample.
SAMPLE_GLBS = {
    "burger": "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    "pizza": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb",
    "sushi": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
    "drink": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb",
    "dessert": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Suzanne/glTF-Binary/Suzanne.glb",
    "default": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


async def seed_all(db) -> None:
    await _ensure_indexes(db)
    await _seed_super_admin(db)
    tenant_id = await _seed_demo_tenant(db)
    await _seed_demo_menu(db, tenant_id)
    await _write_test_creds()


async def _ensure_indexes(db) -> None:
    await db.users.create_index("email", unique=True)
    await db.tenants.create_index("slug", unique=True)
    await db.dishes.create_index([("tenant_id", 1), ("category_id", 1)])
    await db.orders.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.tables.create_index([("tenant_id", 1), ("code", 1)], unique=True)


async def _seed_super_admin(db) -> None:
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": new_id(),
            "email": email,
            "password_hash": hash_password(password),
            "name": "Platform Admin",
            "role": "super_admin",
            "tenant_id": None,
            "created_at": now_iso(),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


async def _seed_demo_tenant(db) -> str:
    slug = "spice-route"
    tenant = await db.tenants.find_one({"slug": slug})
    if tenant is None:
        tenant_id = new_id()
        await db.tenants.insert_one({
            "id": tenant_id,
            "slug": slug,
            "name": "Spice Route",
            "tagline": "Bold flavours. Loud vibes.",
            "brand_color": "#FC8019",
            "logo_url": "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&auto=format&fit=crop",
            "hero_image": "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop",
            "currency": "USD",
            "plan": "growth",
            "created_at": now_iso(),
        })
    else:
        tenant_id = tenant["id"]

    email = os.environ["DEMO_TENANT_EMAIL"].lower()
    password = os.environ["DEMO_TENANT_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": new_id(),
            "email": email,
            "password_hash": hash_password(password),
            "name": "Ravi Kapoor",
            "role": "tenant_admin",
            "tenant_id": tenant_id,
            "created_at": now_iso(),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})

    # Seed a few tables
    for i in range(1, 9):
        code = f"T{i:02d}"
        if not await db.tables.find_one({"tenant_id": tenant_id, "code": code}):
            await db.tables.insert_one({
                "id": new_id(),
                "tenant_id": tenant_id,
                "code": code,
                "label": f"Table {i}",
                "seats": 4 if i <= 4 else 2,
                "created_at": now_iso(),
            })
    return tenant_id


async def _seed_demo_menu(db, tenant_id: str) -> None:
    if await db.categories.count_documents({"tenant_id": tenant_id}) > 0:
        return

    cats = [
        {"name": "Signature Burgers", "kind": "burger", "emoji": "🍔"},
        {"name": "Wood-Fired Pizza", "kind": "pizza", "emoji": "🍕"},
        {"name": "Sushi Bar", "kind": "sushi", "emoji": "🍣"},
        {"name": "Sips & Coolers", "kind": "drink", "emoji": "🥤"},
        {"name": "Desserts", "kind": "dessert", "emoji": "🍰"},
    ]
    cat_ids: dict[str, str] = {}
    for order, c in enumerate(cats):
        cid = new_id()
        cat_ids[c["kind"]] = cid
        await db.categories.insert_one({
            "id": cid,
            "tenant_id": tenant_id,
            "name": c["name"],
            "kind": c["kind"],
            "emoji": c["emoji"],
            "sort_order": order,
            "created_at": now_iso(),
        })

    dishes = [
        {"cat": "burger", "name": "Truffle Smash", "desc": "Double patty, aged cheddar, black truffle aioli.", "price": 14.5, "img": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800"},
        {"cat": "burger", "name": "Crispy Chick'n", "desc": "Buttermilk fried chicken, slaw, house pickles.", "price": 12.0, "img": "https://images.unsplash.com/photo-1550317138-10000687a72b?w=800"},
        {"cat": "pizza", "name": "Margherita Classica", "desc": "San Marzano, fior di latte, basil, EVOO.", "price": 15.0, "img": "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=800"},
        {"cat": "pizza", "name": "Diavola", "desc": "Spicy nduja, calabrian chili, mozzarella.", "price": 17.5, "img": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800"},
        {"cat": "sushi", "name": "Salmon Nigiri x4", "desc": "Sustainably farmed salmon, sushi rice.", "price": 13.0, "img": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800"},
        {"cat": "sushi", "name": "Spicy Tuna Roll", "desc": "Yellowfin, sriracha aioli, cucumber.", "price": 14.0, "img": "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800"},
        {"cat": "drink", "name": "Yuzu Cooler", "desc": "Yuzu, ginger, soda, mint.", "price": 6.0, "img": "https://images.unsplash.com/photo-1621263764928-df1444c3a1a0?w=800"},
        {"cat": "drink", "name": "Cold Brew Tonic", "desc": "48hr cold brew, tonic, orange peel.", "price": 5.5, "img": "https://images.unsplash.com/photo-1461988091159-192b6df7054f?w=800"},
        {"cat": "dessert", "name": "Molten Chocolate", "desc": "Warm centre, vanilla bean gelato.", "price": 8.5, "img": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800"},
        {"cat": "dessert", "name": "Yuzu Cheesecake", "desc": "Basque burnt style, yuzu glaze.", "price": 8.0, "img": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800"},
    ]
    for d in dishes:
        await db.dishes.insert_one({
            "id": new_id(),
            "tenant_id": tenant_id,
            "category_id": cat_ids[d["cat"]],
            "category_kind": d["cat"],
            "name": d["name"],
            "description": d["desc"],
            "price": d["price"],
            "image_url": d["img"],
            "model_url": SAMPLE_GLBS[d["cat"]],
            "model_status": "ready",
            "is_available": True,
            "is_signature": d["name"] in ("Truffle Smash", "Margherita Classica"),
            "created_at": now_iso(),
        })


async def _write_test_creds() -> None:
    content = f"""# Test Credentials (Tabler AR)

## Super Admin (platform owner)
- Email: `{os.environ['ADMIN_EMAIL']}`
- Password: `{os.environ['ADMIN_PASSWORD']}`
- Role: `super_admin`

## Demo Merchant (restaurant tenant admin)
- Email: `{os.environ['DEMO_TENANT_EMAIL']}`
- Password: `{os.environ['DEMO_TENANT_PASSWORD']}`
- Role: `tenant_admin`
- Tenant slug: `spice-route`

## Auth endpoints
- POST `/api/auth/register` — creates new tenant + tenant_admin
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET  `/api/auth/me`

## Public diner endpoints
- GET  `/api/menu/{{tenant_slug}}` — full menu
- POST `/api/orders` — submit order (no auth)

## Tenant endpoints (require `tenant_admin` JWT)
- GET/POST/PUT/DELETE `/api/tenant/dishes`
- GET/POST/DELETE `/api/tenant/categories`
- GET/POST/DELETE `/api/tenant/tables`
- GET `/api/tenant/orders`
- PATCH `/api/tenant/orders/{{id}}/status`
- GET `/api/tenant/analytics`
- POST `/api/tenant/dishes/{{id}}/generate-3d`

## WebSocket (KDS)
- `wss://<host>/api/ws/kds?token=<jwt>`
"""
    import os as _os
    _os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(content)
