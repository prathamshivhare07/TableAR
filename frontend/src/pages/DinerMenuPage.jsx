import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ShoppingBag, X, Minus, Plus, Cube, ArrowLeft, MapPin, CheckCircle, VideoCamera } from "@phosphor-icons/react";
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
        <div className="min-h-[100dvh] bg-[#F9F8F6] flex items-center justify-center">
            <div className="font-display text-3xl animate-pulse">Loading…</div>
        </div>
    );

    const { tenant, categories } = data;
    const shownDishes = selectedCat === "all"
        ? data.dishes
        : data.dishes.filter((d) => d.category_id === selectedCat);

    return (
        <div className="min-h-[100dvh] bg-[#F9F8F6] pb-32" data-testid="diner-menu-page">
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
                    <div key={d.id} className="group bg-white hard-border overflow-hidden flex transition-all duration-150 hover:hard-shadow" data-testid={`diner-dish-${d.id}`}>
                        <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                   {d.is_signature && <span className="tag bg-white text-black border-black text-[10px]">Signature</span>}
                                    {d.model_status === "ready" && d.model_url && <span className="tag bg-[#FC8019] text-white border-black text-[10px]"><Cube size={12} weight="bold" /> 3D Model</span>}
                                </div>
                                <div className="font-display text-2xl mt-2 tracking-tight truncate">{d.name}</div>
                                <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{d.description}</div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="font-display text-2xl text-[#FC8019] tabular-nums">${d.price.toFixed(2)}</div>
                                <div className="flex items-center gap-2">
                                    {d.model_status === "ready" && d.model_url && (
                                        <button onClick={() => setDetail(d)} className="ghost-btn px-3 py-1.5 text-[11px] inline-flex items-center gap-1.5 active:scale-95 transition-transform" data-testid={`diner-preview-${d.id}`}>
                                            <Cube size={13} weight="bold" /> 3D Preview
                                        </button>
                                    )}
                                    <button onClick={() => addToCart(d)} className="pill-orange px-4 py-1.5 text-xs active:scale-95 transition-transform shadow-sm" data-testid={`diner-add-${d.id}`}>Add +</button>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => (d.model_status === "ready" && d.model_url) && setDetail(d)} className="w-28 md:w-36 bg-[#FFF3E7] shrink-0 relative overflow-hidden border-l-2 border-black" aria-label={`Preview ${d.name}`}>
                            <img src={d.image_url} alt={d.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            {d.model_status === "ready" && d.model_url && (
                                <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black text-white hard-border grid place-items-center shadow-md">
                                    <Cube size={14} weight="bold" />
                                </div>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Sticky cart */}
            {cartCount > 0 && !showCart && (
                <div className="fixed bottom-4 left-0 right-0 px-5 z-40">
                    <button onClick={() => setShowCart(true)} className="w-full max-w-2xl mx-auto flex items-center justify-between bg-black text-white px-5 py-4 rounded-full hard-border hard-shadow active:scale-[0.99] transition-transform" data-testid="diner-view-cart-btn">
                        <span className="flex items-center gap-2 font-extrabold uppercase tracking-widest text-xs">
                            <ShoppingBag size={18} weight="bold" /> {cartCount} {cartCount === 1 ? 'item' : 'items'}
                        </span>
                        <span className="font-display text-2xl tabular-nums">${cartTotal.toFixed(2)}</span>
                        <span className="text-xs uppercase tracking-widest font-extrabold text-[#FC8019] flex items-center gap-1">Review order →</span>
                    </button>
                </div>
            )}

            {/* Cart drawer */}
            {showCart && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center backdrop-fade" onClick={() => setShowCart(false)} data-testid="diner-cart-drawer">
                    <div className="w-full max-w-2xl bg-white hard-border max-h-[85vh] flex flex-col rounded-t-3xl overflow-hidden shadow-2xl drawer-enter" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b-2 border-black flex items-center justify-between bg-[#F9F8F6]">
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Review tray</div>
                                <div className="font-display text-3xl">Your order</div>
                            </div>
                            <button onClick={() => setShowCart(false)} className="w-9 h-9 rounded-full bg-white hard-border grid place-items-center active:scale-95 transition-transform" data-testid="cart-close-btn"><X size={18} weight="bold" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto scroll-thin p-5 space-y-3 divide-y divide-gray-100">
                            {cart.map((it) => (
                                <div key={it.dish_id} className="flex items-center gap-3 pt-3 first:pt-0">
                                    <img src={it.image_url} alt={it.name} className="w-14 h-14 object-cover hard-border rounded shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-display text-lg leading-tight truncate">{it.name}</div>
                                        <div className="text-xs text-gray-600 font-semibold mt-0.5 tabular-nums">${it.price.toFixed(2)} each</div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-[#F9F8F6] p-1 border-2 border-black rounded-full">
                                        <button onClick={() => updateQty(it.dish_id, -1)} className="w-7 h-7 rounded-full bg-white hard-border grid place-items-center active:scale-90 transition-transform" data-testid={`cart-dec-${it.dish_id}`}><Minus size={12} weight="bold" /></button>
                                        <span className="font-display text-lg w-5 text-center tabular-nums">{it.qty}</span>
                                        <button onClick={() => updateQty(it.dish_id, 1)} className="w-7 h-7 rounded-full bg-white hard-border grid place-items-center active:scale-90 transition-transform" data-testid={`cart-inc-${it.dish_id}`}><Plus size={12} weight="bold" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t-2 border-black bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs uppercase tracking-widest font-bold text-gray-500">Order Subtotal</div>
                                <div className="font-display text-3xl tabular-nums text-[#0A0A0A]">${cartTotal.toFixed(2)}</div>
                            </div>
                            <div className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 mb-4 flex items-center gap-1.5">
                                <MapPin size={13} className="text-[#FC8019]" />
                                {tableCode ? `Serving to Table ${tableCode}` : "Takeaway Order"} · Tax calculated at submit
                            </div>
                            <button onClick={submitOrder} disabled={placing} className="brand-btn w-full py-4 text-sm flex items-center justify-center gap-2" data-testid="diner-submit-order-btn">
                                {placing ? "Sending to kitchen…" : `Fire order to kitchen · $${cartTotal.toFixed(2)}`}
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

// ==========================================
// SUB-COMPONENTS
// ==========================================

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
    const modelViewerRef = useRef(null);

    function startAR() {
        if (modelViewerRef.current && typeof modelViewerRef.current.activateAR === 'function') {
            modelViewerRef.current.activateAR();
        } else {
            toast.info("Point camera at a flat table surface to project 3D dish");
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#FFF3E7] flex flex-col modal-enter" data-testid="ar-preview-sheet">
            {/* Top Bar Overlay */}
            <div className="p-4 flex justify-between items-center z-10">
                <button
                    onClick={onClose}
                    className="w-11 h-11 rounded-full bg-white hard-border grid place-items-center shadow-md active:scale-95 transition-transform"
                    data-testid="ar-close-btn"
                    aria-label="Close 3D viewer"
                >
                    <X size={20} weight="bold" />
                </button>
                
                <div className="flex items-center gap-2">
                    <span className="tag bg-[#FC8019] text-white border-black font-extrabold uppercase tracking-widest text-[10px] shadow-sm">
                        <Cube size={12} weight="bold" /> 1:1 Scale 3D
                    </span>
                </div>
            </div>

            {/* 3D Model Window */}
            <div className="flex-1 relative flex items-center justify-center min-h-0" data-testid="ar-model-container">
                <ModelViewer
                    ref={modelViewerRef}
                    src={dish.model_url}
                    iosSrc={dish.model_usdz_url}
                    className="w-full h-full"
                />
                <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                    <div className="px-3 py-1 bg-black/75 backdrop-blur-sm text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full border border-white/20 shadow-md">
                        Drag to rotate · Pinch to zoom
                    </div>
                </div>
            </div>

            {/* Bottom Dish Card */}
            <div className="p-4 bg-white hard-border border-b-0 rounded-t-3xl shadow-2xl max-w-xl mx-auto w-full z-10">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Interactive preview</div>
                        <div className="font-display text-3xl truncate mt-0.5">{dish.name}</div>
                        {dish.description && (
                            <div className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">{dish.description}</div>
                        )}
                    </div>
                    <div className="font-display text-3xl text-[#FC8019] tabular-nums whitespace-nowrap">
                        ${dish.price.toFixed(2)}
                    </div>
                </div>
                
                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <button
                        onClick={startAR}
                        className="ghost-btn py-3.5 px-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-extrabold active:scale-95 transition-transform"
                    >
                        <VideoCamera size={18} weight="bold" />
                        View on Table (AR)
                    </button>

                    <button 
                        onClick={() => onAdd(dish)} 
                        className="brand-btn py-3.5 px-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-extrabold active:scale-95 transition-transform"
                        data-testid="ar-add-cart-btn"
                    >
                        <ShoppingBag size={18} weight="bold" />
                        Add to Tray
                    </button>
                </div>
            </div>
        </div>
    );
}

function OrderPlacedSheet({ order, onClose }) {
    return (
        <div className="fixed inset-0 z-50 bg-[#FC8019] flex flex-col items-center justify-center p-6 modal-enter" data-testid="order-placed-sheet">
            <div className="w-16 h-16 rounded-full bg-black text-white grid place-items-center mb-4 hard-shadow">
                <CheckCircle size={40} weight="fill" color="#FC8019" />
            </div>
            <div className="font-display text-6xl text-black text-center tracking-tight">Order in!</div>
            <div className="text-black font-semibold mt-2 text-center text-sm">
                The kitchen received your order and started prep.
            </div>
            <div className="mt-6 bg-white hard-border hard-shadow-lg p-6 w-full max-w-sm text-center">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">Kitchen Ticket</div>
                <div className="font-display text-4xl mt-1 text-[#0A0A0A]">{order.order_no}</div>
                <div className="my-4 border-b-2 border-dashed border-gray-300"></div>
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">Total charged</div>
                <div className="font-display text-4xl mt-1 tabular-nums text-[#FC8019]">${order.total.toFixed(2)}</div>
                <div className="text-[11px] text-gray-500 mt-1 font-medium">Includes local sales tax</div>
            </div>
            <button onClick={onClose} className="mt-6 brand-btn bg-black text-white border-black px-8 py-3.5 text-xs font-extrabold tracking-widest" data-testid="order-placed-close">
                Back to menu
            </button>
        </div>
    );
}