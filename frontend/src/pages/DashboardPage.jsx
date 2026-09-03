import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    ForkKnife, ChartLineUp, Table as TableIcon, Receipt, SignOut, QrCode,
    Plus, Trash, VideoCamera, CircleNotch, CheckCircle, Warning, Cube, Copy,
    ArrowUpRight, ArrowClockwise,
} from "@phosphor-icons/react";
import { http, API_BASE, formatApiError, getToken } from "../lib/api";
import { useAuth } from "../lib/auth";
import ModelViewer from "../components/ModelViewer";

function StatBox({ label, value, sub }) {
    return (
        <div className="hard-border bg-white p-5 rounded-xl">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">{label}</div>
            <div className="font-display text-4xl mt-1">{value}</div>
            {sub && <div className="text-xs text-gray-600 font-medium mt-1">{sub}</div>}
        </div>
    );
}

function StatusPill({ status }) {
    const map = {
        none: { t: "No 3D", c: "bg-gray-200 text-black" },
        pending_review: { t: "Awaiting review", c: "bg-yellow-300 text-black" },
        processing: { t: "Processing", c: "bg-blue-200 text-black" },
        ready: { t: "3D ready", c: "bg-[#00C244] text-black" },
        failed: { t: "Failed", c: "bg-red-300 text-black" },
    };
    const s = map[status] || map.none;
    return <span className={`inline-flex text-[10px] px-2.5 py-1 font-extrabold uppercase tracking-widest border-2 border-black rounded-md ${s.c}`}>{s.t}</span>;
}

function copy(text) {
    navigator.clipboard?.writeText(text).then(() => toast.success("Copied"));
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const [tab, setTab] = useState("overview");
    const [tenant, setTenant] = useState(null);
    const [dishes, setDishes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tables, setTables] = useState([]);
    const [orders, setOrders] = useState([]);
    const [analytics, setAnalytics] = useState(null);

    async function reloadAll() {
        try {
            const [me, ds, cs, ts, os, an] = await Promise.all([
                http.get("/tenant/me"),
                http.get("/tenant/dishes"),
                http.get("/tenant/categories"),
                http.get("/tenant/tables"),
                http.get("/tenant/orders"),
                http.get("/tenant/analytics"),
            ]);
            setTenant(me.data.tenant);
            setDishes(ds.data);
            setCategories(cs.data);
            setTables(ts.data);
            setOrders(os.data);
            setAnalytics(an.data);
        } catch (e) {
            toast.error(formatApiError(e, "Failed to load"));
        }
    }

    useEffect(() => { reloadAll(); }, []);

    // Poll orders every 8s while on orders/overview tab
    useEffect(() => {
        if (tab !== "orders" && tab !== "overview") return;
        const iv = setInterval(async () => {
            try {
                const [os, an] = await Promise.all([http.get("/tenant/orders"), http.get("/tenant/analytics")]);
                setOrders(os.data);
                setAnalytics(an.data);
            } catch { /* silent poll */ }
        }, 8000);
        return () => clearInterval(iv);
    }, [tab]);

    // Auto-refresh dishes every 4s while on menu tab (to catch model_status updates)
    useEffect(() => {
        if (tab !== "menu") return;
        const iv = setInterval(async () => {
            try {
                const ds = await http.get("/tenant/dishes");
                setDishes(ds.data);
            } catch { /* silent poll */ }
        }, 4000);
        return () => clearInterval(iv);
    }, [tab]);

    const menuUrl = tenant ? `${window.location.origin}/m/${tenant.slug}` : "";

    return (
        <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#F9F8F6] flex" data-testid="dashboard-page">
            {/* Sidebar */}
            <aside className="w-64 border-r-2 border-black bg-white p-6 hidden md:flex flex-col justify-between sticky top-0 h-screen">
                <div>
                    <Link to="/" className="font-display text-2xl">Table<span className="text-[#FC8019]">.AR</span></Link>
                    <div className="mt-1 text-[10px] uppercase tracking-widest font-bold text-gray-500">Merchant Console</div>
                    <nav className="mt-10 space-y-1">
                        {[
                            { k: "overview", t: "Overview", i: ChartLineUp },
                            { k: "menu", t: "Menu & 3D", i: ForkKnife },
                            { k: "tables", t: "Tables & QR", i: TableIcon },
                            { k: "orders", t: "Orders", i: Receipt },
                        ].map(({ k, t, i: Icon }) => (
                            <button
                                key={k}
                                onClick={() => setTab(k)}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-extrabold uppercase tracking-wider rounded-xl transition-all ${tab === k ? "bg-[#FC8019] text-white border-2 border-black shadow-sm" : "border-2 border-transparent hover:bg-[#FFF3E7]"}`}
                                data-testid={`nav-tab-${k}`}
                            >
                                <Icon size={18} weight="bold" /> {t}
                            </button>
                        ))}
                    </nav>
                </div>
                <div>
                    <button onClick={() => nav("/kds")} className="ghost-btn w-full px-3 py-2 text-xs mb-3 rounded-xl" data-testid="open-kds-btn">Open KDS →</button>
                    <div className="p-3.5 border-2 border-black bg-[#F9F8F6] rounded-xl">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Signed in</div>
                        <div className="text-sm font-bold truncate">{user?.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{user?.email}</div>
                    </div>
                    <button onClick={() => { logout(); nav("/"); }} className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-widest hover:text-[#FC8019] transition-colors" data-testid="logout-btn">
                        <SignOut size={14} /> Log out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 min-w-0">
                {/* Top bar */}
                <div className="border-b-2 border-black bg-white sticky top-0 z-30">
                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">Restaurant</div>
                            <div className="font-display text-2xl leading-none">{tenant?.name || "…"}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            {tenant && (
                                <button onClick={() => copy(menuUrl)} className="ghost-btn px-3 py-2 text-xs inline-flex items-center gap-2 rounded-xl" data-testid="copy-menu-url-btn">
                                    <Copy size={14} /> {menuUrl.replace(/^https?:\/\//, "")}
                                </button>
                            )}
                            <a href={menuUrl} target="_blank" rel="noreferrer" className="brand-btn px-3 py-2 text-xs inline-flex items-center gap-2 rounded-xl" data-testid="open-menu-btn">
                                Open diner menu <ArrowUpRight size={14} weight="bold" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-10">
                    {tab === "overview" && (
                        <OverviewTab analytics={analytics} orders={orders} dishes={dishes} />
                    )}
                    {tab === "menu" && (
                        <MenuTab
                            dishes={dishes}
                            categories={categories}
                            onChanged={reloadAll}
                        />
                    )}
                    {tab === "tables" && (
                        <TablesTab tables={tables} tenant={tenant} onChanged={reloadAll} />
                    )}
                    {tab === "orders" && (
                        <OrdersTab orders={orders} onChanged={reloadAll} />
                    )}
                </div>
            </main>
        </div>
    );
}

function OverviewTab({ analytics, orders, dishes }) {
    const pending3d = dishes.filter((d) => d.model_status === "pending_review" || d.model_status === "processing").length;
    const ready3d = dishes.filter((d) => d.model_status === "ready").length;
    const recent = orders.slice(0, 6);
    return (
        <div className="space-y-8 fade-in" data-testid="tab-overview">
            <div>
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Today</div>
                <h1 className="font-display text-5xl mt-1">Command center</h1>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Revenue today" value={analytics ? `₹${analytics.revenue_today.toFixed(2)}` : "—"} sub={analytics ? `${analytics.orders_today} orders` : ""} />
                <StatBox label="Revenue · 7d" value={analytics ? `₹${analytics.revenue_week.toFixed(2)}` : "—"} sub={analytics ? `${analytics.orders_week} orders` : ""} />
                <StatBox label="Avg ticket" value={analytics ? `₹${analytics.avg_ticket.toFixed(2)}` : "—"} />
                <StatBox label="3D models" value={`${ready3d}/${dishes.length}`} sub={pending3d ? `${pending3d} pending` : "All ready"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 hard-border bg-white p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="font-display text-3xl">Recent orders</div>
                        <div className="text-xs uppercase tracking-widest font-bold text-gray-500">Live · refreshing 8s</div>
                    </div>
                    {recent.length === 0 && <div className="text-sm text-gray-500 py-8">No orders yet. Share your QR to start.</div>}
                    <div className="divide-y-2 divide-black">
                        {recent.map((o) => (
                            <div key={o.id} className="flex items-center justify-between py-3">
                                <div>
                                    <div className="font-display text-xl">{o.order_no} · {o.table_code || "Takeaway"}</div>
                                    <div className="text-xs text-gray-600">{o.items.length} items · {new Date(o.created_at).toLocaleTimeString()}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="tag">{o.status}</span>
                                    <span className="font-display text-xl">₹{o.total.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hard-border bg-[#FC8019] text-black p-6 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest font-extrabold">Top dishes · 7d</div>
                    <div className="mt-3 space-y-2">
                        {(analytics?.top_dishes || []).map((d, i) => (
                            <div key={d.name} className="flex items-center justify-between border-b-2 border-black/80 py-1.5">
                                <div className="font-display text-lg">{i + 1}. {d.name}</div>
                                <div className="font-bold">×{d.qty}</div>
                            </div>
                        ))}
                        {(!analytics || analytics.top_dishes.length === 0) && (
                            <div className="text-sm">No sales yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MenuTab({ dishes, categories, onChanged }) {
    const [editing, setEditing] = useState(null); // dish for video upload
    const [creating, setCreating] = useState(false);
    const [managingCats, setManagingCats] = useState(false);

    async function toggleAvail(d) {
        try {
            await http.put(`/tenant/dishes/${d.id}`, { is_available: !d.is_available });
            onChanged();
        } catch (e) { toast.error(formatApiError(e)); }
    }
    async function delDish(d) {
        if (!window.confirm(`Delete "${d.name}"?`)) return;
        try {
            await http.delete(`/tenant/dishes/${d.id}`);
            toast.success("Dish deleted");
            onChanged();
        } catch (e) { toast.error(formatApiError(e)); }
    }

    return (
        <div className="fade-in" data-testid="tab-menu">
            <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Menu</div>
                    <h1 className="font-display text-5xl">Dishes & 3D</h1>
                    <div className="text-xs uppercase tracking-widest font-bold text-gray-500 mt-2">
                        {categories.length} categor{categories.length === 1 ? "y" : "ies"} · {dishes.length} dish{dishes.length === 1 ? "" : "es"}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className="ghost-btn px-4 py-3 text-sm inline-flex items-center gap-2 rounded-xl" onClick={() => setManagingCats(true)} data-testid="manage-categories-btn">
                        <ChartLineUp size={16} weight="bold" /> Manage categories
                    </button>
                    <button className="brand-btn px-4 py-3 text-sm inline-flex items-center gap-2 rounded-xl" onClick={() => setCreating(true)} data-testid="new-dish-btn">
                        <Plus size={16} weight="bold" /> New dish
                    </button>
                </div>
            </div>

            {categories.length === 0 && (
                <div className="hard-border bg-[#FFF3E7] p-6 mb-6 flex items-center justify-between gap-4 flex-wrap rounded-2xl" data-testid="no-categories-banner">
                    <div>
                        <div className="font-display text-2xl">No categories yet.</div>
                        <div className="text-sm text-gray-700 mt-1">You need at least one category before adding a dish. Start with something like "Signature Burgers" or "Desserts".</div>
                    </div>
                    <button className="brand-btn px-4 py-3 text-sm rounded-xl" onClick={() => setManagingCats(true)} data-testid="create-first-cat-btn">Create your first category →</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger">
                {dishes.map((d) => {
                    const cat = categories.find((c) => c.id === d.category_id);
                    return (
                        <div key={d.id} className="hard-border bg-white overflow-hidden rounded-2xl" data-testid={`dish-card-${d.id}`}>
                            <div className="aspect-[16/10] bg-[#FFF3E7] relative">
                                {d.model_status === "ready" && d.model_url ? (
                                    <ModelViewer src={d.model_url} className="w-full h-full" />
                                ) : (
                                    <img src={d.image_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600"} alt={d.name} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <StatusPill status={d.model_status} />
                                    {!d.is_available && <span className="tag bg-black text-white border-black">Hidden</span>}
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{cat?.name || "Uncategorized"}</div>
                                <div className="flex items-center justify-between mt-1">
                                    <div className="font-display text-2xl">{d.name}</div>
                                    <div className="font-display text-xl text-[#FC8019]">₹{d.price.toFixed(2)}</div>
                                </div>
                                <div className="text-sm text-gray-700 mt-1 line-clamp-2">{d.description}</div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button onClick={() => setEditing(d)} className="ghost-btn px-3 py-2 text-xs inline-flex items-center gap-2 rounded-xl" data-testid={`upload-video-btn-${d.id}`}>
                                        <VideoCamera size={14} weight="bold" /> {d.model_status === "ready" ? "Replace 3D" : "Upload video"}
                                    </button>
                                    <button onClick={() => toggleAvail(d)} className="ghost-btn px-3 py-2 text-xs rounded-xl" data-testid={`toggle-avail-${d.id}`}>
                                        {d.is_available ? "Hide" : "Show"}
                                    </button>
                                    <button onClick={() => delDish(d)} className="ghost-btn px-3 py-2 text-xs inline-flex items-center gap-2 hover:bg-red-100 rounded-xl" data-testid={`delete-dish-${d.id}`}>
                                        <Trash size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {dishes.length === 0 && (
                    <div className="col-span-full hard-border p-10 text-center text-gray-500 rounded-2xl">No dishes yet. Click <b>New dish</b> to add one.</div>
                )}
            </div>

            {editing && (
                <VideoUploadModal dish={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); onChanged(); }} />
            )}
            {creating && (
                <NewDishModal categories={categories} onClose={() => setCreating(false)} onDone={() => { setCreating(false); onChanged(); }} onManageCategories={() => { setCreating(false); setManagingCats(true); }} />
            )}
            {managingCats && (
                <CategoriesModal categories={categories} onClose={() => setManagingCats(false)} onChanged={onChanged} />
            )}
        </div>
    );
}

function CategoriesModal({ categories, onClose, onChanged }) {
    const KINDS = [
        { k: "burger", label: "Burger" },
        { k: "pizza", label: "Pizza" },
        { k: "sushi", label: "Sushi" },
        { k: "drink", label: "Drink" },
        { k: "dessert", label: "Dessert" },
        { k: "default", label: "Other" },
    ];
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("🍽️");
    const [kind, setKind] = useState("default");
    const [saving, setSaving] = useState(false);

    async function create() {
        if (!name.trim()) { toast.error("Name required"); return; }
        setSaving(true);
        try {
            await http.post("/tenant/categories", {
                name: name.trim(),
                emoji,
                kind,
                sort_order: categories.length,
            });
            setName("");
            setEmoji("🍽️");
            toast.success("Category added");
            onChanged();
        } catch (e) { toast.error(formatApiError(e)); } finally { setSaving(false); }
    }

    async function del(c) {
        if (!window.confirm(`Delete category "${c.name}"?\n(Dishes in this category will remain but become uncategorized.)`)) return;
        try {
            await http.delete(`/tenant/categories/${c.id}`);
            toast.success("Category deleted");
            onChanged();
        } catch (e) { toast.error(formatApiError(e)); }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="categories-modal">
            <div className="bg-white hard-border hard-shadow-lg w-full max-w-xl p-6 max-h-[92vh] flex flex-col rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Menu</div>
                        <div className="font-display text-3xl">Manage categories</div>
                    </div>
                    <button onClick={onClose} className="text-sm font-bold" data-testid="categories-close">✕</button>
                </div>

                <div className="hard-border bg-[#FFF3E7] p-4 mb-4 rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest font-extrabold mb-3">Add new</div>
                    <div className="grid grid-cols-6 gap-2">
                        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} className="col-span-1 px-2 py-2 hard-border bg-white text-center text-xl rounded-xl" data-testid="cat-emoji-input" />
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Signature Burgers" className="col-span-3 px-3 py-2 hard-border bg-white rounded-xl" data-testid="cat-name-input" />
                        <select value={kind} onChange={(e) => setKind(e.target.value)} className="col-span-2 px-2 py-2 hard-border bg-white rounded-xl" data-testid="cat-kind-select">
                            {KINDS.map(k => <option key={k.k} value={k.k}>{k.label}</option>)}
                        </select>
                    </div>
                    <button onClick={create} disabled={saving || !name.trim()} className="brand-btn w-full mt-3 py-2.5 text-sm rounded-xl" data-testid="cat-add-btn">
                        {saving ? "Adding…" : "Add category +"}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scroll-thin">
                    <div className="text-[10px] uppercase tracking-widest font-extrabold mb-2">Existing ({categories.length})</div>
                    {categories.length === 0 ? (
                        <div className="text-sm text-gray-500 py-6 text-center">No categories yet — add your first above.</div>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((c) => (
                                <div key={c.id} className="flex items-center gap-3 hard-border bg-white p-3 rounded-xl" data-testid={`cat-row-${c.id}`}>
                                    <div className="text-2xl">{c.emoji || "🍽️"}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-display text-xl truncate">{c.name}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{c.kind}</div>
                                    </div>
                                    <button onClick={() => del(c)} className="w-9 h-9 grid place-items-center hover:bg-red-100 transition-colors border-2 border-black rounded-lg" data-testid={`cat-del-${c.id}`}>
                                        <Trash size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-5 flex justify-end">
                    <button onClick={onClose} className="pill-btn px-5 py-2.5 text-sm" data-testid="categories-done-btn">Done</button>
                </div>
            </div>
        </div>
    );
}

function VideoUploadModal({ dish, onClose, onDone }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    async function submit() {
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            await http.post(`/tenant/dishes/${dish.id}/upload-video`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Video uploaded — queued for 3D review");
            onDone();
        } catch (e) {
            toast.error(formatApiError(e, "Upload failed"));
        } finally { setUploading(false); }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="video-upload-modal">
            <div className="bg-white hard-border hard-shadow-lg w-full max-w-lg p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                    <div className="font-display text-3xl">Upload dish video</div>
                    <button onClick={onClose} className="text-sm font-bold" data-testid="close-video-modal">✕</button>
                </div>
                <p className="text-sm text-gray-700 mt-2">Walk around the dish for ~10 sec. .mp4, .mov, .webm — max 60MB. Our team crafts a WebAR-ready .glb and pushes it live.</p>
                <label className="mt-6 block border-2 border-dashed border-black p-8 text-center cursor-pointer bg-[#FFF3E7] hover:bg-[#FFE9D0] transition-colors rounded-xl">
                    <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="video-file-input" />
                    <VideoCamera size={36} weight="bold" className="mx-auto" />
                    <div className="font-display text-2xl mt-2">{file ? file.name : "Choose a video"}</div>
                    <div className="text-xs text-gray-600 mt-1">{file ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : "Click or drop here"}</div>
                </label>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="ghost-btn px-4 py-3 text-sm rounded-xl" data-testid="video-cancel-btn">Cancel</button>
                    <button disabled={!file || uploading} onClick={submit} className="brand-btn px-4 py-3 text-sm rounded-xl" data-testid="video-submit-btn">
                        {uploading ? "Uploading…" : "Submit for 3D review →"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function NewDishModal({ categories, onClose, onDone, onManageCategories }) {
    const [f, setF] = useState({ name: "", description: "", price: 10, category_id: categories[0]?.id || "", image_url: "", is_signature: false });
    const [saving, setSaving] = useState(false);
    async function save() {
        if (!f.category_id) { toast.error("Create a category first"); return; }
        setSaving(true);
        try {
            await http.post("/tenant/dishes", { ...f, price: parseFloat(f.price) });
            toast.success("Dish added");
            onDone();
        } catch (e) { toast.error(formatApiError(e)); } finally { setSaving(false); }
    }
    const noCategories = categories.length === 0;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="new-dish-modal">
            <div className="bg-white hard-border hard-shadow-lg w-full max-w-lg p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                    <div className="font-display text-3xl">New dish</div>
                    <button onClick={onClose} className="text-sm font-bold" data-testid="close-new-dish-modal">✕</button>
                </div>
                {noCategories ? (
                    <div className="mt-6 hard-border bg-[#FFF3E7] p-5 text-center rounded-xl" data-testid="new-dish-no-cats">
                        <Warning size={32} weight="bold" className="mx-auto text-[#FC8019]" />
                        <div className="font-display text-2xl mt-2">No categories yet</div>
                        <div className="text-sm text-gray-700 mt-1">Create at least one category (e.g. "Burgers") before adding dishes.</div>
                        <button onClick={onManageCategories} className="brand-btn mt-5 px-5 py-3 text-sm rounded-xl" data-testid="new-dish-goto-cats">
                            Create categories →
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <label className="col-span-2 block">
                                <span className="text-[10px] uppercase tracking-widest font-extrabold">Name</span>
                                <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1 w-full px-3 py-2 hard-border bg-white rounded-xl" data-testid="new-dish-name" />
                            </label>
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-widest font-extrabold">Category</span>
                                <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className="mt-1 w-full px-3 py-2 hard-border bg-white rounded-xl" data-testid="new-dish-category">
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji ? c.emoji + " " : ""}{c.name}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-widest font-extrabold">Price (₹)</span>
                                <input type="number" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="mt-1 w-full px-3 py-2 hard-border bg-white rounded-xl" data-testid="new-dish-price" />
                            </label>
                            <label className="col-span-2 block">
                                <span className="text-[10px] uppercase tracking-widest font-extrabold">Image URL</span>
                                <input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} className="mt-1 w-full px-3 py-2 hard-border bg-white rounded-xl" data-testid="new-dish-image" />
                            </label>
                            <label className="col-span-2 block">
                                <span className="text-[10px] uppercase tracking-widest font-extrabold">Description</span>
                                <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="mt-1 w-full px-3 py-2 hard-border bg-white rounded-xl" rows={3} data-testid="new-dish-desc" />
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={onClose} className="ghost-btn px-4 py-3 text-sm rounded-xl">Cancel</button>
                            <button onClick={save} disabled={saving || !f.name} className="brand-btn px-4 py-3 text-sm rounded-xl" data-testid="new-dish-save">{saving ? "Saving…" : "Save dish"}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function TablesTab({ tables, tenant, onChanged }) {
    const [code, setCode] = useState("");
    const [seats, setSeats] = useState(4);
    const baseUrl = tenant ? `${window.location.origin}/m/${tenant.slug}` : "";

    async function add() {
        if (!code) return;
        try {
            await http.post("/tenant/tables", { code: code.toUpperCase(), seats: parseInt(seats, 10) });
            setCode("");
            onChanged();
        } catch (e) { toast.error(formatApiError(e)); }
    }
    async function del(t) {
        try {
            await http.delete(`/tenant/tables/${t.id}`);
            onChanged();
        } catch (e) { toast.error(formatApiError(e)); }
    }

    return (
        <div className="fade-in" data-testid="tab-tables">
            <div className="mb-6">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Tables</div>
                <h1 className="font-display text-5xl">Tables & QR codes</h1>
            </div>
            <div className="hard-border bg-white p-4 flex flex-wrap items-end gap-4 mb-8 rounded-2xl">
                <label className="block">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold">Code</span>
                    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="T09" className="mt-1 px-3 py-2 hard-border bg-white uppercase rounded-xl" data-testid="new-table-code" />
                </label>
                <label className="block">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold">Seats</span>
                    <input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} className="mt-1 w-24 px-3 py-2 hard-border bg-white rounded-xl" data-testid="new-table-seats" />
                </label>
                <button onClick={add} className="brand-btn px-4 py-3 text-sm inline-flex items-center gap-2 rounded-xl" data-testid="add-table-btn"><Plus size={16} /> Add table</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
                {tables.map((t) => {
                    const url = `${baseUrl}?table=${t.code}`;
                    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=280x280&margin=8&color=0A0A0A&bgcolor=FFFFFF`;
                    return (
                        <div key={t.id} className="hard-border bg-white p-4 rounded-2xl" data-testid={`table-card-${t.code}`}>
                            <div className="flex items-center justify-between">
                                <div className="font-display text-3xl">{t.code}</div>
                                <button onClick={() => del(t)} className="text-xs text-gray-500 hover:text-red-500 transition-colors" data-testid={`del-table-${t.code}`}><Trash size={16} /></button>
                            </div>
                            <div className="text-xs uppercase tracking-widest font-bold text-gray-500">{t.seats} seats</div>
                            <div className="mt-3 aspect-square bg-white hard-border grid place-items-center rounded-xl overflow-hidden">
                                <img src={qrSrc} alt={`QR for ${t.code}`} className="w-full h-full object-contain" />
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={() => copy(url)} className="ghost-btn px-2 py-1.5 text-[10px] flex-1 rounded-lg" data-testid={`copy-url-${t.code}`}>Copy URL</button>
                                <a href={url} target="_blank" rel="noreferrer" className="pill-orange px-3 py-1.5 text-[10px] flex-1 text-center rounded-full" data-testid={`open-url-${t.code}`}>Open →</a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function OrdersTab({ orders, onChanged }) {
    async function setStatus(o, s) {
        try {
            await http.patch(`/tenant/orders/${o.id}/status`, { status: s });
            onChanged();
        } catch (e) { toast.error(formatApiError(e)); }
    }
    return (
        <div className="fade-in" data-testid="tab-orders">
            <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
                <div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Orders</div>
                    <h1 className="font-display text-5xl">All tickets</h1>
                </div>
                <button onClick={onChanged} className="ghost-btn px-3 py-2 text-xs inline-flex items-center gap-2 rounded-xl" data-testid="orders-refresh-btn"><ArrowClockwise size={14} /> Refresh</button>
            </div>
            <div className="hard-border bg-white overflow-hidden rounded-2xl">
                <table className="w-full text-sm">
                    <thead className="bg-black text-white text-[10px] uppercase tracking-widest">
                        <tr>
                            <th className="text-left px-4 py-3">Order</th>
                            <th className="text-left px-4 py-3">Table</th>
                            <th className="text-left px-4 py-3">Items</th>
                            <th className="text-left px-4 py-3">Total</th>
                            <th className="text-left px-4 py-3">Status</th>
                            <th className="text-left px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o) => (
                            <tr key={o.id} className="border-t-2 border-black" data-testid={`order-row-${o.order_no}`}>
                                <td className="px-4 py-3 font-display text-xl">{o.order_no}</td>
                                <td className="px-4 py-3 font-bold">{o.table_code || "—"}</td>
                                <td className="px-4 py-3">{o.items.reduce((a, i) => a + i.qty, 0)}</td>
                                <td className="px-4 py-3 font-display text-lg">₹{o.total.toFixed(2)}</td>
                                <td className="px-4 py-3"><span className="tag">{o.status}</span></td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        {["preparing", "ready", "served", "cancelled"].map((s) => (
                                            <button key={s} onClick={() => setStatus(o, s)} className="text-[10px] px-2 py-1 border-2 border-black hover:bg-[#FC8019] hover:text-white transition-colors rounded-md" data-testid={`set-${s}-${o.order_no}`}>{s}</button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No orders yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
