"""Comprehensive backend tests for Tabler AR B2B SaaS.

Covers: auth (super admin, demo tenant, register), public menu/order,
tenant CRUD & analytics, tenant isolation, order status transitions,
file upload (video + glb), super admin queue, KDS WebSocket.
"""
import os
import io
import json
import time
import uuid
import asyncio
import struct
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://ar-order-sync.preview.emergentagent.com"
API = f"{BASE_URL}/api"


# ---------- Helpers ----------
def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


@pytest.fixture(scope="module")
def super_admin_token():
    r = _login("admin@tabler.ar", "admin123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_tenant_token():
    r = _login("demo@spice.co", "demo123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_tenant_id(demo_tenant_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=30)
    assert r.status_code == 200
    return r.json()["tenant_id"]


@pytest.fixture(scope="module")
def new_tenant():
    """Create a fresh tenant to validate isolation."""
    slug = f"test-{uuid.uuid4().hex[:8]}"
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "testpass123",
        "name": "Test Owner",
        "restaurant_name": "Test Restaurant",
        "slug": slug,
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "slug": slug, "email": email}


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------- Auth ----------
def test_super_admin_login_returns_super_admin_role(super_admin_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {super_admin_token}"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "super_admin"


def test_demo_tenant_login_has_tenant_id_and_role(demo_tenant_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["role"] == "tenant_admin"
    assert d["tenant_id"] is not None


def test_login_wrong_password_returns_401():
    r = _login("demo@spice.co", "wrongpwd")
    assert r.status_code == 401


def test_register_password_min_length_validation():
    r = requests.post(f"{API}/auth/register", json={
        "email": f"x{uuid.uuid4().hex[:6]}@ex.com",
        "password": "abc",
        "name": "X",
        "restaurant_name": "X",
        "slug": f"x-{uuid.uuid4().hex[:6]}",
    }, timeout=15)
    assert r.status_code == 422


def test_register_duplicate_slug_rejected(new_tenant):
    r = requests.post(f"{API}/auth/register", json={
        "email": f"dup_{uuid.uuid4().hex[:6]}@ex.com",
        "password": "abcdef",
        "name": "Dup",
        "restaurant_name": "Dup",
        "slug": new_tenant["slug"],
    }, timeout=15)
    assert r.status_code in (400, 409), r.text


# ---------- Public menu ----------
def test_public_menu_no_table():
    r = requests.get(f"{API}/menu/spice-route", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["tenant"]["slug"] == "spice-route"
    assert len(data["categories"]) >= 5
    assert len(data["dishes"]) >= 10
    assert data["table"] is None


def test_public_menu_with_table():
    r = requests.get(f"{API}/menu/spice-route", params={"table": "T01"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["table"] is not None
    assert data["table"]["code"] == "T01"


# ---------- Tenant listing ----------
def test_tenant_dishes(demo_tenant_token):
    r = requests.get(f"{API}/tenant/dishes", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 10


def test_tenant_categories(demo_tenant_token):
    r = requests.get(f"{API}/tenant/categories", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 5


def test_tenant_tables(demo_tenant_token):
    r = requests.get(f"{API}/tenant/tables", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 8


def test_tenant_analytics(demo_tenant_token):
    r = requests.get(f"{API}/tenant/analytics", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["orders_today", "revenue_today", "top_dishes"]:
        assert k in d


# ---------- Tenant isolation ----------
def test_new_tenant_isolation(new_tenant, demo_tenant_id):
    h = {"Authorization": f"Bearer {new_tenant['token']}"}
    dishes = requests.get(f"{API}/tenant/dishes", headers=h, timeout=15).json()
    cats = requests.get(f"{API}/tenant/categories", headers=h, timeout=15).json()
    orders = requests.get(f"{API}/tenant/orders", headers=h, timeout=15).json()
    tables = requests.get(f"{API}/tenant/tables", headers=h, timeout=15).json()
    assert dishes == []
    assert cats == []
    assert orders == []
    assert len(tables) == 4  # register auto-seeds 4 tables
    # No spice-route dishes visible
    assert all(d.get("tenant_id") != demo_tenant_id for d in dishes)


# ---------- Order placement + KDS broadcast ----------
@pytest.fixture(scope="module")
def placed_order(demo_tenant_token):
    """Place an order via public endpoint. Returns (order_id, total)."""
    dishes = requests.get(f"{API}/menu/spice-route", timeout=15).json()["dishes"]
    items = [
        {"dish_id": dishes[0]["id"], "qty": 2},
        {"dish_id": dishes[1]["id"], "qty": 1},
    ]
    r = requests.post(f"{API}/orders", json={
        "tenant_slug": "spice-route",
        "table_code": "T01",
        "items": items,
        "diner_name": "TEST_diner",
    }, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    return d


def test_place_order_returns_id_and_total(placed_order):
    assert "order_id" in placed_order
    assert placed_order["total"] > 0
    assert placed_order["status"] == "new"


def test_tenant_can_see_placed_order(demo_tenant_token, placed_order):
    time.sleep(0.5)
    r = requests.get(f"{API}/tenant/orders", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=15)
    assert r.status_code == 200
    ids = [o["id"] for o in r.json()]
    assert placed_order["order_id"] in ids


def test_order_status_transitions(demo_tenant_token, placed_order):
    h = {"Authorization": f"Bearer {demo_tenant_token}"}
    oid = placed_order["order_id"]
    for status in ["preparing", "ready", "served"]:
        r = requests.patch(f"{API}/tenant/orders/{oid}/status", json={"status": status}, headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == status


def test_analytics_reflects_placed_order(demo_tenant_token, placed_order):
    r = requests.get(f"{API}/tenant/analytics", headers={"Authorization": f"Bearer {demo_tenant_token}"}, timeout=15)
    d = r.json()
    assert d["orders_today"] >= 1
    assert d["revenue_today"] > 0


# ---------- Tenant Category + Dish create + video upload ----------
@pytest.fixture(scope="module")
def new_category_and_dish(demo_tenant_token):
    h = {"Authorization": f"Bearer {demo_tenant_token}"}
    cat = requests.post(f"{API}/tenant/categories", json={
        "name": "TEST_Specials", "kind": "default", "emoji": "⭐", "sort_order": 99
    }, headers=h, timeout=15)
    assert cat.status_code == 200, cat.text
    cid = cat.json()["id"]

    dish = requests.post(f"{API}/tenant/dishes", json={
        "category_id": cid,
        "name": "TEST_Dish",
        "description": "test",
        "price": 9.99,
    }, headers=h, timeout=15)
    assert dish.status_code == 200, dish.text
    did = dish.json()["id"]
    return {"category_id": cid, "dish_id": did}


def test_upload_video_marks_pending_review(demo_tenant_token, new_category_and_dish, super_admin_token):
    h = {"Authorization": f"Bearer {demo_tenant_token}"}
    did = new_category_and_dish["dish_id"]
    # small dummy mp4 bytes
    data = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1024
    files = {"file": ("test.mp4", data, "video/mp4")}
    r = requests.post(f"{API}/tenant/dishes/{did}/upload-video", headers=h, files=files, timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending_review"

    # Verify dish state
    dishes = requests.get(f"{API}/tenant/dishes", headers=h, timeout=15).json()
    d = next(x for x in dishes if x["id"] == did)
    assert d["model_status"] == "pending_review"
    assert d.get("video_path")

    # Super admin queue should include it
    sq = requests.get(f"{API}/superadmin/queue", headers={"Authorization": f"Bearer {super_admin_token}"}, timeout=15)
    assert sq.status_code == 200
    assert any(x["id"] == did for x in sq.json())


def _minimal_glb() -> bytes:
    # Minimal GLB: 12-byte header + JSON chunk with empty scene
    j = b'{"asset":{"version":"2.0"},"scenes":[{}],"scene":0}'
    # pad JSON to 4-byte boundary
    while len(j) % 4 != 0:
        j += b" "
    total = 12 + 8 + len(j)
    header = struct.pack("<III", 0x46546C67, 2, total)
    json_chunk = struct.pack("<II", len(j), 0x4E4F534A) + j
    return header + json_chunk


def test_super_admin_upload_model_makes_dish_ready(super_admin_token, new_category_and_dish):
    h = {"Authorization": f"Bearer {super_admin_token}"}
    did = new_category_and_dish["dish_id"]
    files = {"file": ("test.glb", _minimal_glb(), "model/gltf-binary")}
    r = requests.post(f"{API}/superadmin/dishes/{did}/upload-model", headers=h, files=files, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "ready"
    model_url = data["model_url"]
    assert model_url.startswith("http")
    # Iteration 2: must use PUBLIC_BASE_URL (preview.emergentagent.com), NOT internal cluster host
    assert "preview.emergentagent.com" in model_url, f"model_url should be public, got {model_url}"
    assert "/api/files/tabler-ar/models/" in model_url

    # Publicly reachable GET
    g = requests.get(model_url, timeout=30)
    assert g.status_code == 200
    ct = g.headers.get("Content-Type", "")
    assert "gltf-binary" in ct or "octet-stream" in ct


# ---------- Iteration 2: Local storage on disk ----------
def test_local_storage_writes_files_to_disk(demo_tenant_token, new_category_and_dish):
    """After tenant uploads a video, the file must exist under /app/backend/uploads/tabler-ar/videos/..."""
    h = {"Authorization": f"Bearer {demo_tenant_token}"}
    did = new_category_and_dish["dish_id"]
    dishes = requests.get(f"{API}/tenant/dishes", headers=h, timeout=15).json()
    d = next(x for x in dishes if x["id"] == did)
    vpath = d.get("video_path")
    assert vpath, "video_path should be set after upload"
    assert vpath.startswith("tabler-ar/videos/"), f"unexpected video_path: {vpath}"
    full = os.path.join("/app/backend/uploads", vpath)
    assert os.path.exists(full), f"local storage file missing: {full}"
    assert os.path.getsize(full) > 0

    # Also verify the model file exists on disk
    mpath = d.get("model_url_path") or d.get("model_path")
    if mpath and not mpath.startswith("http"):
        full_m = os.path.join("/app/backend/uploads", mpath)
        assert os.path.exists(full_m), f"local storage model missing: {full_m}"


def test_no_emergent_integration_in_storage_code():
    """Storage backend must not import Emergent SDK anymore."""
    with open("/app/backend/storage.py") as f:
        src = f.read()
    assert "emergentintegrations" not in src
    assert "integrations.emergentagent.com" not in src
    with open("/app/backend/server.py") as f:
        srv = f.read()
    assert "emergentintegrations" not in srv
    assert "integrations.emergentagent.com" not in srv


# ---------- Iteration 2: Tenant category CRUD (empty-state fix support) ----------
def test_tenant_categories_crud_and_isolation(new_tenant, demo_tenant_token):
    """CRUD for tenant categories + isolation across tenants."""
    # New tenant starts with 0 categories
    h_new = {"Authorization": f"Bearer {new_tenant['token']}"}
    r = requests.get(f"{API}/tenant/categories", headers=h_new, timeout=15)
    assert r.status_code == 200
    assert r.json() == []

    # Create a category
    cat_payload = {"name": "TEST_Cat_iso", "kind": "default", "emoji": "🥗", "sort_order": 1}
    r = requests.post(f"{API}/tenant/categories", json=cat_payload, headers=h_new, timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    assert r.json()["name"] == "TEST_Cat_iso"

    # List reflects the new category
    r = requests.get(f"{API}/tenant/categories", headers=h_new, timeout=15)
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "TEST_Cat_iso" in names

    # Isolation: demo tenant does NOT see new tenant's category
    h_demo = {"Authorization": f"Bearer {demo_tenant_token}"}
    demo_cats = requests.get(f"{API}/tenant/categories", headers=h_demo, timeout=15).json()
    assert all(c["id"] != cid for c in demo_cats)

    # Delete
    r = requests.delete(f"{API}/tenant/categories/{cid}", headers=h_new, timeout=15)
    assert r.status_code in (200, 204), r.text

    # Verify removed
    r = requests.get(f"{API}/tenant/categories", headers=h_new, timeout=15)
    assert all(c["id"] != cid for c in r.json())


# ---------- KDS WebSocket ----------
@pytest.mark.asyncio
async def test_kds_websocket_snapshot_and_new_order(demo_tenant_token):
    ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + f"/api/ws/kds?token={demo_tenant_token}"
    async with websockets.connect(ws_url, ping_timeout=10, open_timeout=15) as ws:
        # Snapshot event
        msg = await asyncio.wait_for(ws.recv(), timeout=15)
        data = json.loads(msg)
        assert data["event"] == "snapshot"
        assert isinstance(data.get("orders"), list)

        # Place new order in another task
        dishes = requests.get(f"{API}/menu/spice-route", timeout=15).json()["dishes"]
        r = requests.post(f"{API}/orders", json={
            "tenant_slug": "spice-route",
            "table_code": "T02",
            "items": [{"dish_id": dishes[0]["id"], "qty": 1}],
            "diner_name": "TEST_ws",
        }, timeout=15)
        assert r.status_code == 200
        oid = r.json()["order_id"]

        # Wait for order.new event
        got = None
        for _ in range(10):
            msg2 = await asyncio.wait_for(ws.recv(), timeout=10)
            data2 = json.loads(msg2)
            if data2.get("event") == "order.new" and data2["order"]["id"] == oid:
                got = data2
                break
        assert got is not None, "did not receive order.new broadcast"


# ---------- Super admin ----------
def test_super_admin_stats(super_admin_token):
    r = requests.get(f"{API}/superadmin/stats", headers={"Authorization": f"Bearer {super_admin_token}"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["tenants", "dishes", "orders", "pending_models", "ready_models"]:
        assert k in d


def test_super_admin_tenants_list(super_admin_token):
    r = requests.get(f"{API}/superadmin/tenants", headers={"Authorization": f"Bearer {super_admin_token}"}, timeout=15)
    assert r.status_code == 200
    tenants = r.json()
    spice = next((t for t in tenants if t["slug"] == "spice-route"), None)
    assert spice is not None
    assert spice["dish_count"] >= 10


# ---------- Cross-tenant forbidden ----------
def test_cannot_access_others_order(new_tenant, placed_order):
    """New tenant shouldn't see spice-route order via its /tenant/orders list."""
    h = {"Authorization": f"Bearer {new_tenant['token']}"}
    orders = requests.get(f"{API}/tenant/orders", headers=h, timeout=15).json()
    assert all(o["id"] != placed_order["order_id"] for o in orders)


def test_unauthenticated_tenant_endpoint_401():
    r = requests.get(f"{API}/tenant/dishes", timeout=15)
    assert r.status_code == 401
