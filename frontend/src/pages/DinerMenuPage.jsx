import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ShoppingBag, X, Minus, Plus, Cube, ArrowLeft, MapPin, CheckCircle, ForkKnife, VideoCamera, ArrowsClockwise } from "@phosphor-icons/react";
import { API } from "../lib/api";
import ModelViewer from "../components/ModelViewer";

function useLocalCart(tenantSlug) {
    const key = `cart_${tenantSlug}`;
    const [items, setItems] = useState(() => {
        try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
    });
    useEffect(() => { localStorage.setItem(key, JSON.stringify(items)); }, [items, key]);
    return [items, setItems];
}

export default function DinerMenuPage() {
    const { slug } = useParams();
    const [sp] = useSearchParams();
    const tableCode = sp.get("table") || null;
    const [data, setData] = useState(null);
    const [selectedCat, setSelectedCat] = useState("all");
    const [detail, setDetail] = useState(null); // dish
    const [showCart, setShowCart] = useState(false);
    const [cart, setCart] = useLocalCart(slug);
    const [placing, setPlacing] = useState(false);
    const [placed, setPlaced] = useState(null);
    const nav = useNavigate();

    useEffect(() => {
        axios.get(`${API}/menu/${slug}${tableCode ? `?table=${tableCode}` : ""}`)
            .then((r) => setData(r.data))
            .catch(() => toast.error("Restaurant not found"));
    }, [slug, tableCode]);

    const dishesByCat = useMemo(() => {
        if (!data) return {};
        const g = {};
        for (const d of data.dishes) {
            g[d.category_id] = g[d.category_id] || [];
            g[d.category_id].push(d);
        }
        return g;
    }, [data]);

    const cartCount = cart.reduce((a, i) => a + i.qty, 0);
    const cartTotal = cart.reduce((a, i) => a + i.qty * i.price, 0);

    function addToCart(dish) {
        setCart((prev) => {
            const idx = prev.findIndex((x) => x.dish_id === dish.id);
            if (idx >= 0) {
                const next = prev.slice();
                next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                return next;
            }
            return [...prev, { dish_id: dish.id, name: dish.name, price: dish.price, image_url: dish.image_url, qty: 1 }];
        });
        toast(`+ ${dish.name}`, { duration: 1200 });
    }
    function updateQty(dishId, delta) {
        setCart((prev) => prev.flatMap((i) => {
            if (i.dish_id !== dishId) return [i];
            const q = i.qty + delta;
            if (q <= 0) return [];
            return [{ ...i, qty: q }];
        }));
    }

    async function submitOrder() {
        if (cart.length === 0) return;
        setPlacing(true);
        try {
            const { data: res } = await axios.post(`${API}/orders`, {
                tenant_slug: slug,
                table_code: tableCode,
                items: cart.map(({ dish_id, qty }) => ({ dish_id, qty })),
            });
            setCart([]);
            setPlaced(res);
            setShowCart(false);
        } catch (e) {
            toast.error("Failed to place order");
        } finally { setPlacing(false); }
    }

    if (!data) return (
        <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center">
            <div className="font-display text-3xl animate-pulse">Loading…</div>
        </div>
    );

    const { tenant, categories } = data;
    const shownDishes = selectedCat === "all"
        ? data.dishes
        : data.dishes.filter((d) => d.category_id === selectedCat);

    return (
        <div className="min-h-screen bg-[#F9F8F6] pb-32" data-testid="diner-menu-page">
            {/* Header */}
            <div className="relative">
                <div className="h-40 md:h-56 bg-black overflow-hidden">
                    <img src={tenant.hero_image} alt={tenant.name} className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="absolute top-4 left-4">
                    <button onClick={() => nav("/")} className="w-10 h-10 rounded-full bg-white/90 grid place-items-center hard-border" data-testid="diner-back-btn">
                        <ArrowLeft size={18} weight="bold" />
                    </button>
                </div>
                <div className="max-w-2xl mx-auto px-5 -mt-10 relative">
                    <div className="bg-white hard-border p-5 hard-shadow">
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Now serving</div>
                        <div className="font-display text-4xl mt-1">{tenant.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{tenant.tagline}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {tableCode && <span className="tag bg-[#FC8019] text-white border-black"><MapPin size={12} /> {tableCode}</span>}
                            <span className="tag"><Cube size={12} /> WebAR menu</span>
                            <span className="tag">{data.dishes.length} dishes</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category pills */}
            <div className="max-w-2xl mx-auto px-5 mt-6 overflow-x-auto scroll-thin">
                <div className="flex gap-2 whitespace-nowrap pb-2">
                    <CatPill active={selectedCat === "all"} onClick={() => setSelectedCat("all")} label="All" testId="diner-cat-all" />
                    {categories.map((c) => (
                        <CatPill key={c.id} active={selectedCat === c.id} onClick={() => setSelectedCat(c.id)} label={`${c.emoji || ""} ${c.name}`} testId={`diner-cat-${c.id}`} />
                    ))}
                </div>
            </div>

            {/* Dish list */}
            <div className="max-w-2xl mx-auto px-5 mt-4 space-y-4 stagger">
                {shownDishes.map((d) => (
                    <div key={d.id} className="bg-white hard-border overflow-hidden flex" data-testid={`diner-dish-${d.id}`}>
                        <div className="flex-1 p-4 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                {d.is_signature && <span className="tag bg-black text-white border-black">Signature</span>}
                                {d.model_status === "ready" && d.model_url && <span className="tag bg-[#FC8019] text-white border-black"><Cube size={12} weight="bold" /> 3D</span>}
                            </div>
                            <div className="font-display text-2xl mt-2 truncate">{d.name}</div>
                            <div className="text-sm text-gray-600 mt-1 line-clamp-2">{d.description}</div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="font-display text-xl text-[#FC8019]">${d.price.toFixed(2)}</div>
                                <div className="flex gap-2">
                                    {d.model_status === "ready" && d.model_url && (
                                        <button onClick={() => setDetail(d)} className="ghost-btn px-3 py-1.5 text-[11px] inline-flex items-center gap-1" data-testid={`diner-preview-${d.id}`}>
                                            <VideoCamera size={12} weight="bold" /> AR View
                                        </button>
                                    )}
                                    <button onClick={() => addToCart(d)} className="pill-orange px-4 py-1.5 text-xs" data-testid={`diner-add-${d.id}`}>Add +</button>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => (d.model_status === "ready" && d.model_url) && setDetail(d)} className="w-28 md:w-32 bg-[#FFF3E7] shrink-0 relative">
                            <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                            {d.model_status === "ready" && d.model_url && (
                                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black text-white grid place-items-center">
                                    <Cube size={12} weight="bold" />
                                </div>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Sticky cart */}
            {cartCount > 0 && !showCart && (
                <div className="fixed bottom-4 left-0 right-0 px-5 z-40">
                    <button onClick={() => setShowCart(true)} className="w-full max-w-2xl mx-auto flex items-center justify-between bg-black text-white px-5 py-4 rounded-full hard-border hard-shadow" data-testid="diner-view-cart-btn">
                        <span className="flex items-center gap-2 font-extrabold uppercase tracking-widest text-sm">
                            <ShoppingBag size={18} weight="bold" /> {cartCount} in cart
                        </span>
                        <span className="font-display text-2xl">${cartTotal.toFixed(2)}</span>
                        <span className="text-xs uppercase tracking-widest font-bold">Review →</span>
                    </button>
                </div>
            )}

            {/* Cart drawer */}
            {showCart && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowCart(false)} data-testid="diner-cart-drawer">
                    <div className="w-full max-w-2xl bg-white hard-border max-h-[85vh] flex flex-col rounded-t-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b-2 border-black flex items-center justify-between">
                            <div className="font-display text-3xl">Your order</div>
                            <button onClick={() => setShowCart(false)} className="w-8 h-8 grid place-items-center" data-testid="cart-close-btn"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto scroll-thin p-5 space-y-3">
                            {cart.map((it) => (
                                <div key={it.dish_id} className="flex items-center gap-3">
                                    <img src={it.image_url} alt={it.name} className="w-14 h-14 object-cover hard-border" />
                                    <div className="flex-1">
                                        <div className="font-display text-lg leading-tight">{it.name}</div>
                                        <div className="text-xs text-gray-600">${it.price.toFixed(2)}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateQty(it.dish_id, -1)} className="w-8 h-8 hard-border bg-white grid place-items-center" data-testid={`cart-dec-${it.dish_id}`}><Minus size={14} /></button>
                                        <span className="font-display text-xl w-6 text-center">{it.qty}</span>
                                        <button onClick={() => updateQty(it.dish_id, 1)} className="w-8 h-8 hard-border bg-white grid place-items-center" data-testid={`cart-inc-${it.dish_id}`}><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t-2 border-black">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs uppercase tracking-widest font-bold text-gray-500">Subtotal</div>
                                <div className="font-display text-2xl">${cartTotal.toFixed(2)}</div>
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-4">
                                {tableCode ? `Delivering to ${tableCode}` : "Takeaway"}  ·  Tax added at checkout
                            </div>
                            <button onClick={submitOrder} disabled={placing} className="brand-btn w-full py-4" data-testid="diner-submit-order-btn">
                                {placing ? "Placing…" : `Place order — $${cartTotal.toFixed(2)}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dish detail with WebAR */}
            {detail && <ARPreviewSheet dish={detail} onClose={() => setDetail(null)} onAdd={(d) => { addToCart(d); setDetail(null); }} />}

            {/* Order placed */}
            {placed && <OrderPlacedSheet order={placed} onClose={() => setPlaced(null)} />}

            {/* Footer */}
            <div className="max-w-2xl mx-auto px-5 mt-10 pt-6 border-t-2 border-black text-center text-xs uppercase tracking-widest font-bold text-gray-500">
                Powered by <span className="text-[#FC8019] font-display text-base">Tabler.AR</span>
            </div>
        </div>
    );
}

function CatPill({ active, onClick, label, testId }) {
    return (
        <button
            onClick={onClick}
            data-testid={testId}
            className={`px-4 py-2 border-2 border-black text-xs font-extrabold uppercase tracking-widest whitespace-nowrap transition-colors ${active ? "bg-black text-white" : "bg-white hover:bg-[#FFF3E7]"}`}
        >
            {label}
        </button>
    );
}

function ARPreviewSheet({ dish, onClose, onAdd }) {
    const videoRef = useRef(null);
    const [camState, setCamState] = useState("loading"); // loading | live | denied | unsupported
    const [facing, setFacing] = useState("environment");

    useEffect(() => {
        let stream = null;
        let cancelled = false;
        async function start() {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCamState("unsupported");
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facing },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }
                setCamState("live");
            } catch {
                setCamState("denied");
            }
        }
        start();
        return () => {
            cancelled = true;
            if (stream) stream.getTracks().forEach((t) => t.stop());
        };
    }, [facing]);

    function flip() {
        setCamState("loading");
        setFacing((f) => (f === "environment" ? "user" : "environment"));
    }

    return (
        <div className="fixed inset-0 z-50 bg-black" data-testid="ar-preview-sheet">
            {/* Camera background */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover ${camState === "live" ? "" : "opacity-40"}`}
                data-testid="ar-camera-video"
            />
            {camState !== "live" && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFF3E7] via-[#FFE9D0] to-[#FDD1A6]" />
            )}

            {/* 3D model overlaid, transparent background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-full pointer-events-auto" data-testid="ar-model-container">
                    <ModelViewer
                        src={dish.model_url}
                        iosSrc={dish.model_usdz_url}
                        className="w-full h-full"
                        style={{ background: "transparent" }}
                    />
                </div>
            </div>

            {/* Top overlay */}
            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start pointer-events-none">
                <button
                    onClick={onClose}
                    className="w-11 h-11 rounded-full bg-white hard-border grid place-items-center pointer-events-auto"
                    data-testid="ar-close-btn"
                >
                    <X size={20} weight="bold" />
                </button>
                <div className="flex flex-col gap-2 items-end pointer-events-none">
                    <span className={`tag ${camState === "live" ? "bg-[#FC8019] text-white border-black" : "bg-white"}`} data-testid="ar-status-tag">
                        <VideoCamera size={12} weight="bold" />
                        {camState === "loading" && "Starting camera…"}
                        {camState === "live" && "LIVE AR"}
                        {camState === "denied" && "Camera off"}
                        {camState === "unsupported" && "3D only"}
                    </span>
                    {camState === "live" && (
                        <button
                            onClick={flip}
                            className="tag bg-white pointer-events-auto"
                            data-testid="ar-flip-btn"
                        >
                            <ArrowsClockwise size={12} weight="bold" /> Flip
                        </button>
                    )}
                </div>
            </div>

            {/* Instructions */}
            {camState === "live" && (
                <div className="absolute top-24 inset-x-0 flex justify-center pointer-events-none">
                    <span className="tag bg-black/70 text-white border-white/30 backdrop-blur">
                        Point at your table · Drag to rotate · Pinch to zoom
                    </span>
                </div>
            )}
            {camState === "denied" && (
                <div className="absolute top-24 inset-x-0 flex justify-center pointer-events-none px-4">
                    <span className="tag bg-black/80 text-white border-white/30 backdrop-blur text-center max-w-xs">
                        Allow camera to see this dish on your table
                    </span>
                </div>
            )}

            {/* Bottom card */}
            <div className="absolute bottom-0 inset-x-0 p-4">
                <div className="bg-white hard-border p-4 max-w-xl mx-auto">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Preview</div>
                            <div className="font-display text-2xl truncate">{dish.name}</div>
                            {dish.description && <div className="text-xs text-gray-600 line-clamp-2 mt-1">{dish.description}</div>}
                        </div>
                        <div className="font-display text-2xl text-[#FC8019] whitespace-nowrap">${dish.price.toFixed(2)}</div>
                    </div>
                    <button onClick={() => onAdd(dish)} className="mt-3 brand-btn w-full py-3" data-testid="ar-add-cart-btn">
                        Add to cart →
                    </button>
                </div>
            </div>
        </div>
    );
}

function OrderPlacedSheet({ order, onClose }) {
    return (
        <div className="fixed inset-0 z-50 bg-[#FC8019] flex flex-col items-center justify-center p-6" data-testid="order-placed-sheet">
            <CheckCircle size={80} weight="fill" color="#0A0A0A" />
            <div className="font-display text-6xl mt-6 text-black text-center">Order in!</div>
            <div className="text-black/80 mt-2 text-center">The kitchen is on it. Ticket <b>{order.order_no}</b>.</div>
            <div className="mt-8 bg-white hard-border p-5 w-full max-w-sm text-center">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">Total charged</div>
                <div className="font-display text-5xl mt-1">${order.total.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">Includes 8% tax</div>
            </div>
            <button onClick={onClose} className="mt-8 pill-btn px-6 py-3 text-sm" data-testid="order-placed-close">Back to menu</button>
        </div>
    );
}
