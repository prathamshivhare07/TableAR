import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ShoppingBag, X, Minus, Plus, Cube, ArrowLeft, MapPin, CheckCircle, VideoCamera } from "@phosphor-icons/react";
import { API } from "../lib/api";
import ModelViewer from "../components/ModelViewer";

const FALLBACK_DISH_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80";

function formatTable(code) {
    if (!code) return "";
    const c = String(code).trim();
    if (/^table\s*/i.test(c)) return c;
    if (/^t0*(\d+)$/i.test(c)) return `Table ${c.replace(/^t0*/i, "")}`;
    if (/^\d+$/.test(c)) return `Table ${c}`;
    return `Table ${c}`;
}

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
    const [closingCart, setClosingCart] = useState(false);
    const [cart, setCart] = useLocalCart(slug);
    const [placing, setPlacing] = useState(false);
    const [placed, setPlaced] = useState(null);
    const nav = useNavigate();

    function closeCart() {
        if (closingCart) return;
        setClosingCart(true);
        setTimeout(() => {
            setShowCart(false);
            setClosingCart(false);
        }, 190);
    }

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
        <div className="min-h-screen bg-[#F9F8F6] pb-36" data-testid="diner-menu-page">
            {/* Header */}
            <div className="relative">
                <div className="h-44 md:h-60 bg-black overflow-hidden relative">
                    <img
                        src={tenant.hero_image}
                        alt={tenant.name}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_DISH_IMG; }}
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                </div>
                <div className="absolute top-4 left-4 z-10">
                    <button
                        onClick={() => nav("/")}
                        className="w-10 h-10 rounded-full bg-white hard-border grid place-items-center shadow-md active:scale-95 transition-transform hover:bg-gray-50"
                        data-testid="diner-back-btn"
                        aria-label="Back to home"
                    >
                        <ArrowLeft size={18} weight="bold" />
                    </button>
                </div>
                <div className="max-w-2xl mx-auto px-5 -mt-12 relative z-10">
                    <div className="bg-white hard-border p-5 hard-shadow rounded-lg">
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Now Serving</div>
                        <h1 className="font-display text-4xl mt-1 leading-tight">{tenant.name}</h1>
                        <div className="text-sm text-gray-600 mt-1 font-medium">{tenant.tagline}</div>
                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            {tableCode && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FC8019] text-white border-2 border-black rounded text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
                                    <MapPin size={13} weight="fill" /> {formatTable(tableCode)}
                                </span>
                            )}
                            <span className="tag text-[11px] font-bold">
                                <Cube size={13} weight="bold" className="text-[#FC8019]" /> WebAR 3D
                            </span>
                            <span className="tag text-[11px] font-bold">
                                {data.dishes.length} Dishes
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category pills */}
            <div className="max-w-2xl mx-auto px-5 mt-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-2 whitespace-nowrap pb-1">
                    <CatPill active={selectedCat === "all"} onClick={() => setSelectedCat("all")} label="All Dishes" testId="diner-cat-all" />
                    {categories.map((c) => (
                        <CatPill key={c.id} active={selectedCat === c.id} onClick={() => setSelectedCat(c.id)} label={`${c.emoji || ""} ${c.name}`} testId={`diner-cat-${c.id}`} />
                    ))}
                </div>
            </div>

            {/* Dish list */}
            <div className="max-w-2xl mx-auto px-5 mt-4 space-y-4">
                {shownDishes.map((d) => (
                    <div
                        key={d.id}
                        className="bg-white hard-border overflow-hidden flex transition-all duration-150 hover:shadow-[4px_4px_0px_0px_#0A0A0A] rounded-md group"
                        data-testid={`diner-dish-${d.id}`}
                    >
                        <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {d.is_signature && (
                                        <span className="inline-flex items-center px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded">
                                            Signature
                                        </span>
                                    )}
                                    {d.model_status === "ready" && d.model_url && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF3E7] text-[#FC8019] border border-[#FC8019] text-[10px] font-black uppercase tracking-wider rounded">
                                            <Cube size={12} weight="bold" /> 3D AR
                                        </span>
                                    )}
                                </div>
                                <div className="font-display text-2xl mt-1.5 truncate text-[#0A0A0A]">{d.name}</div>
                                <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{d.description}</div>
                            </div>
                            <div className="mt-3.5 flex items-center justify-between pt-1">
                                <div className="font-display text-2xl text-[#FC8019] tracking-tight">
                                    ${d.price.toFixed(2)}
                                </div>
                                <div className="flex items-center gap-2">
                                    {d.model_status === "ready" && d.model_url && (
                                        <button
                                            onClick={() => setDetail(d)}
                                            className="ghost-btn px-3 py-1.5 text-xs inline-flex items-center gap-1.5 active:scale-95 font-extrabold uppercase tracking-wide"
                                            data-testid={`diner-preview-${d.id}`}
                                        >
                                            <Cube size={14} weight="bold" /> 3D View
                                        </button>
                                    )}
                                    <button
                                        onClick={() => addToCart(d)}
                                        className="pill-orange px-4 py-1.5 text-xs active:scale-95 font-extrabold uppercase tracking-wide shadow-sm"
                                        data-testid={`diner-add-${d.id}`}
                                    >
                                        Add +
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => (d.model_status === "ready" && d.model_url) ? setDetail(d) : addToCart(d)}
                            className="w-32 sm:w-36 bg-[#FFF3E7] shrink-0 relative overflow-hidden group-hover:opacity-95 transition-opacity"
                            aria-label={`View ${d.name}`}
                        >
                            <img
                                src={d.image_url}
                                alt={d.name}
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_DISH_IMG; }}
                                className="w-full h-full object-cover"
                            />
                            {d.model_status === "ready" && d.model_url && (
                                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white flex items-center gap-1 text-[10px] font-bold backdrop-blur-sm shadow">
                                    <Cube size={12} weight="bold" /> 3D
                                </div>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Sticky cart */}
            {cartCount > 0 && !showCart && (
                <div className="fixed bottom-5 left-0 right-0 px-5 z-40 animate-in fade-in slide-in-from-bottom-5 duration-200">
                    <button
                        onClick={() => setShowCart(true)}
                        className="w-full max-w-2xl mx-auto flex items-center justify-between bg-[#0A0A0A] text-white px-6 py-4 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_#FC8019] active:scale-[0.97] transition-[transform,box-shadow] duration-150 hover:bg-black"
                        data-testid="diner-view-cart-btn"
                    >
                        <span className="flex items-center gap-2.5 font-extrabold uppercase tracking-widest text-xs">
                            <span key={cartCount} className="w-6 h-6 rounded-full bg-[#FC8019] text-black grid place-items-center text-xs font-black animate-badge-pop tabular-nums">
                                {cartCount}
                            </span>
                            In Cart
                        </span>
                        <span className="font-display text-2xl tracking-normal text-white tabular-nums">${cartTotal.toFixed(2)}</span>
                        <span className="text-xs uppercase tracking-widest font-extrabold text-[#FC8019] flex items-center gap-1">
                            Review →
                        </span>
                    </button>
                </div>
            )}

            {/* Cart drawer */}
            {showCart && (
                <div
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center transition-opacity duration-200 ${
                        closingCart ? "opacity-0 pointer-events-none" : "animate-in fade-in duration-200"
                    }`}
                    onClick={closeCart}
                    data-testid="diner-cart-drawer"
                >
                    <div
                        className={`w-full max-w-2xl bg-white hard-border max-h-[85vh] flex flex-col rounded-t-3xl overflow-hidden shadow-2xl transition-transform duration-200 ease-out ${
                            closingCart ? "translate-y-full" : "animate-in slide-in-from-bottom duration-250"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b-2 border-black flex items-center justify-between bg-[#F9F8F6]">
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Order Summary</div>
                                <div className="font-display text-3xl">Your Cart</div>
                            </div>
                            <button
                                onClick={closeCart}
                                className="w-9 h-9 rounded-full bg-white hard-border grid place-items-center active:scale-[0.97] transition-transform hover:bg-gray-100"
                                data-testid="cart-close-btn"
                                aria-label="Close cart"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto scroll-thin p-5 space-y-3.5">
                            {cart.map((it) => (
                                <div key={it.dish_id} className="flex items-center gap-3.5 p-2 bg-[#F9F8F6] rounded-lg border border-black/10">
                                    <img
                                        src={it.image_url}
                                        alt={it.name}
                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_DISH_IMG; }}
                                        className="w-14 h-14 object-cover hard-border rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-display text-xl leading-tight truncate">{it.name}</div>
                                        <div className="text-xs text-gray-600 font-bold mt-0.5">${it.price.toFixed(2)} each</div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white hard-border rounded px-1 py-0.5">
                                        <button
                                            onClick={() => updateQty(it.dish_id, -1)}
                                            className="w-7 h-7 grid place-items-center active:scale-90 hover:bg-[#FFF3E7] rounded transition-colors"
                                            data-testid={`cart-dec-${it.dish_id}`}
                                            aria-label="Decrease quantity"
                                        >
                                            <Minus size={13} weight="bold" />
                                        </button>
                                        <span className="font-display text-lg w-5 text-center">{it.qty}</span>
                                        <button
                                            onClick={() => updateQty(it.dish_id, 1)}
                                            className="w-7 h-7 grid place-items-center active:scale-90 hover:bg-[#FFF3E7] rounded transition-colors"
                                            data-testid={`cart-inc-${it.dish_id}`}
                                            aria-label="Increase quantity"
                                        >
                                            <Plus size={13} weight="bold" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t-2 border-black bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs uppercase tracking-widest font-extrabold text-gray-500">Subtotal</div>
                                <div className="font-display text-2xl text-[#0A0A0A]">${cartTotal.toFixed(2)}</div>
                            </div>
                            <div className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 mb-4 flex items-center justify-between">
                                <span>{tableCode ? `Delivering to ${formatTable(tableCode)}` : "Takeaway / Counter Pickup"}</span>
                                <span className="text-[#FC8019]">8% Tax Added</span>
                            </div>
                            <button
                                onClick={submitOrder}
                                disabled={placing}
                                className="brand-btn w-full py-4 text-sm font-extrabold rounded-md shadow-[4px_4px_0px_0px_#0A0A0A]"
                                data-testid="diner-submit-order-btn"
                            >
                                {placing ? "Placing Order…" : `Place Order — $${(cartTotal * 1.08).toFixed(2)}`}
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
            <div className="max-w-2xl mx-auto px-5 mt-12 pt-6 border-t-2 border-black text-center text-xs uppercase tracking-widest font-bold text-gray-500">
                Powered by <span className="text-[#FC8019] font-display text-base tracking-wide">Tabler.AR</span>
            </div>
        </div>
    );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function CatPill({ active, onClick, label, testId }) {
    return (
        <button
            onClick={onClick}
            data-testid={testId}
            className={`px-4 py-2 border-2 border-black text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] rounded ${
                active
                    ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(252,128,25,1)]"
                    : "bg-white text-black hover:bg-[#FFF3E7] shadow-sm"
            }`}
        >
            {label}
        </button>
    );
}

function ARPreviewSheet({ dish, onClose, onAdd }) {
    const modelViewerRef = useRef(null);

    function startAR() {
        if (modelViewerRef.current && typeof modelViewerRef.current.activateAR === 'function') {
            modelViewerRef.current.activateAR();
        } else {
            console.log("AR engine not ready or unsupported on this device");
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#FFF3E7] flex flex-col" data-testid="ar-preview-sheet">
            {/* Top Bar Overlay */}
            <div className="relative z-20 p-4 flex justify-between items-center bg-transparent">
                <button
                    onClick={onClose}
                    className="w-11 h-11 rounded-full bg-white hard-border grid place-items-center shadow-[2px_2px_0px_0px_#0A0A0A] active:scale-[0.97] transition-[transform,background-color] hover:bg-[#FFF3E7]"
                    data-testid="ar-close-btn"
                    aria-label="Close AR view"
                >
                    <X size={20} weight="bold" />
                </button>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FC8019] text-white border-2 border-black font-extrabold uppercase tracking-wider text-[11px] rounded shadow-[2px_2px_0px_0px_#0A0A0A]">
                    <Cube size={14} weight="bold" /> 1:1 Scale WebAR
                </span>
            </div>

            {/* Interaction Instructions Banner */}
            <div className="relative z-10 flex justify-center -mt-1 px-4 pointer-events-none">
                <span className="bg-black/80 backdrop-blur-sm text-white text-[11px] font-semibold px-3.5 py-1 rounded-full border border-white/20 tracking-wide shadow">
                    Drag to spin · Pinch to zoom · Tap "View on Table"
                </span>
            </div>

            {/* 3D Model Window */}
            <div className="flex-1 relative w-full flex items-center justify-center p-2 min-h-0" data-testid="ar-model-container">
                <ModelViewer
                    ref={modelViewerRef}
                    src={dish.model_url}
                    iosSrc={dish.model_usdz_url}
                    className="w-full h-full"
                />
            </div>

            {/* Bottom Dish Card */}
            <div className="relative z-20 p-4 bg-gradient-to-t from-[#FFF3E7] to-transparent">
                <div className="bg-white hard-border p-5 max-w-xl mx-auto hard-shadow rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Live 3D Preview</div>
                            <div className="font-display text-3xl truncate mt-0.5 text-[#0A0A0A]">{dish.name}</div>
                            {dish.description && (
                                <div className="text-xs text-gray-600 line-clamp-2 mt-1 font-medium leading-relaxed">{dish.description}</div>
                            )}
                        </div>
                        <div className="font-display text-3xl text-[#FC8019] whitespace-nowrap">
                            ${dish.price.toFixed(2)}
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-1">
                        <button
                            onClick={startAR}
                            className="flex-1 ghost-btn py-3.5 px-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-extrabold rounded active:scale-[0.97]"
                        >
                            <VideoCamera size={16} weight="bold" />
                            View on Table
                        </button>

                        <button 
                            onClick={() => onAdd(dish)} 
                            className="flex-1 brand-btn py-3.5 px-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-extrabold rounded active:scale-[0.97] shadow-[4px_4px_0px_0px_#0A0A0A]"
                            data-testid="ar-add-cart-btn"
                        >
                            <ShoppingBag size={16} weight="bold" />
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OrderPlacedSheet({ order, onClose }) {
    return (
        <div className="fixed inset-0 z-50 bg-[#FC8019] flex flex-col items-center justify-center p-6 animate-in fade-in duration-200" data-testid="order-placed-sheet">
            <CheckCircle size={80} weight="fill" className="text-[#0A0A0A] drop-shadow-md animate-checkmark-spring" />
            <div className="font-display text-6xl mt-6 text-black text-center tracking-tight">Order in!</div>
            <div className="text-black/90 mt-2 text-center text-sm font-semibold">The kitchen is on it. Ticket <b>#{order.order_no}</b>.</div>
            <div className="mt-8 bg-white hard-border p-5 w-full max-w-sm text-center hard-shadow rounded-lg animate-in zoom-in-95 duration-200">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">Total Charged</div>
                <div className="font-display text-5xl mt-1 text-[#0A0A0A] tabular-nums">${order.total.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1 font-bold">Includes 8% tax · Fast Kitchen Dispatch</div>
            </div>
            <button
                onClick={onClose}
                className="mt-8 pill-btn px-8 py-3.5 text-xs font-extrabold shadow-lg active:scale-[0.97]"
                data-testid="order-placed-close"
            >
                Back to Menu
            </button>
        </div>
    );
}