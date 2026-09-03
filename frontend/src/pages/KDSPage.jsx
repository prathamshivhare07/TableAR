import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Lightning, CheckCircle, CookingPot, HandWaving } from "@phosphor-icons/react";
import { API_BASE, getToken } from "../lib/api";
import { useAuth } from "../lib/auth";

const COLUMNS = [
    { key: "new", label: "Incoming", icon: Lightning, color: "#FC8019" },
    { key: "preparing", label: "In the pass", icon: CookingPot, color: "#FFD400" },
    { key: "ready", label: "Ready", icon: HandWaving, color: "#00C244" },
];

function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
}

export default function KDSPage() {
    const { user } = useAuth();
    const nav = useNavigate();
    const [orders, setOrders] = useState([]);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const iv = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        if (user === undefined) return;
        if (!user) { nav("/login"); return; }
        const token = getToken();
        if (!token) { nav("/login"); return; }

        const wsUrl = API_BASE.replace(/^http/, "ws") + `/api/ws/kds?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);
        ws.onmessage = (ev) => {
            try {
                const data = JSON.parse(ev.data);
                if (data.event === "snapshot") {
                    setOrders(data.orders || []);
                } else if (data.event === "order.new") {
                    setOrders((prev) => [...prev, data.order]);
                    toast(`New order ${data.order.order_no} · ${data.order.table_code || "takeaway"}`, { position: "top-center" });
                    // beep
                    try {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)();
                        const o = ctx.createOscillator();
                        const g = ctx.createGain();
                        o.frequency.value = 880;
                        o.connect(g); g.connect(ctx.destination);
                        g.gain.value = 0.08;
                        o.start(); o.stop(ctx.currentTime + 0.14);
                    } catch { /* audio disabled */ }
                } else if (data.event === "order.updated") {
                    setOrders((prev) => {
                        const idx = prev.findIndex((o) => o.id === data.order.id);
                        if (idx === -1) return prev;
                        const next = prev.slice();
                        next[idx] = data.order;
                        return next;
                    });
                }
            } catch { /* malformed frame */ }
        };
        // keepalive ping
        const ka = setInterval(() => {
            try { ws.readyState === 1 && ws.send("ping"); } catch {}
        }, 25000);
        return () => { clearInterval(ka); try { ws.close(); } catch {} };
    }, [user, nav]);

    async function setStatus(o, s) {
        try {
            const res = await fetch(`${API_BASE}/api/tenant/orders/${o.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ status: s }),
            });
            if (!res.ok) throw new Error(await res.text());
            // ws will update; but if s === "served" or "cancelled" remove locally
            if (s === "served" || s === "cancelled") {
                setOrders((prev) => prev.filter((x) => x.id !== o.id));
            }
        } catch (e) {
            toast.error("Failed to update status");
        }
    }

    const byStatus = useMemo(() => {
        const g = { new: [], preparing: [], ready: [] };
        for (const o of orders) {
            if (g[o.status]) g[o.status].push(o);
        }
        for (const k of Object.keys(g)) {
            g[k].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
        return g;
    }, [orders]);

    return (
        <div className="min-h-[100dvh] kds-body flex flex-col" data-testid="kds-page">
            <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-[#111111]">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="kds-back-link" aria-label="Back to dashboard">
                        <ArrowLeft size={22} />
                    </Link>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#FC8019] font-extrabold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#FC8019]"></span>
                            Live Kitchen Display
                        </div>
                        <div className="font-display text-3xl tracking-tight text-white">Line Command</div>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/80 font-medium">
                        <span>Active Tickets:</span>
                        <span className="font-display text-base text-[#FC8019] tabular-nums">{orders.length}</span>
                    </div>
                    <div className="text-xs uppercase tracking-widest font-extrabold flex items-center gap-2 bg-black px-3 py-1.5 rounded-full border border-white/10">
                        <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-[#00C244] animate-pulse" : "bg-red-500"}`}></span>
                        <span className={connected ? "text-white" : "text-red-400"}>
                            {connected ? "WebSocket Connected" : "Reconnecting…"}
                        </span>
                    </div>
                    <div className="text-sm font-mono text-white/80 tabular-nums px-2.5 py-1 bg-white/5 rounded border border-white/10">
                        {new Date(now).toLocaleTimeString()}
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 min-h-0 overflow-hidden">
                {COLUMNS.map((col) => (
                    <div key={col.key} className="flex flex-col min-h-0 bg-[#121212] rounded-xl border border-white/10 p-3" data-testid={`kds-col-${col.key}`}>
                        <div className="kds-col-head px-4 py-3.5 flex items-center justify-between mb-3 bg-[#181818] rounded-lg border" style={{ borderColor: col.color + "66" }}>
                            <div className="flex items-center gap-2.5">
                                <col.icon size={22} weight="bold" color={col.color} />
                                <span className="font-display text-2xl tracking-wide">{col.label}</span>
                            </div>
                            <span className="text-3xl font-display tabular-nums" style={{ color: col.color }}>{byStatus[col.key].length}</span>
                        </div>
                        <div className="flex-1 space-y-3.5 overflow-y-auto scroll-thin pr-1">
                            {byStatus[col.key].map((o) => {
                                const ageSec = Math.floor((now - new Date(o.created_at).getTime()) / 1000);
                                const isUrgent = col.key === "new" && ageSec > 120;
                                const isWarning = col.key === "new" && ageSec > 60 && !isUrgent;

                                return (
                                    <div key={o.id} className={`kds-card p-4 fade-in transition-all duration-150 rounded-lg ${isUrgent ? "ring-2 ring-[#FF3B30] bg-[#1a0f0f]" : isWarning ? "ring-1 ring-[#FFD400]/70" : "hover:border-white/20"}`} data-testid={`kds-ticket-${o.order_no}`}>
                                        <div className="flex items-start justify-between pb-3 border-b border-white/10">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-widest text-white/50 font-extrabold">Ticket</div>
                                                <div className="font-display text-3xl leading-none text-white tracking-tight">{o.order_no}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase tracking-widest text-white/50 font-extrabold">Destination</div>
                                                <div className="inline-block mt-0.5 px-2.5 py-0.5 rounded font-display text-xl leading-none bg-[#FC8019] text-black">
                                                    {o.table_code ? `Table ${o.table_code}` : "Takeaway"}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="py-3 space-y-2">
                                            {o.items.map((it, i) => (
                                                <div key={i} className="flex items-start justify-between text-sm leading-snug">
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-display text-lg text-[#FC8019] leading-none">×{it.qty}</span>
                                                        <div>
                                                            <span className="font-bold text-white/95">{it.name}</span>
                                                            {it.note && <div className="text-xs text-[#FFD400] italic mt-0.5">Note: {it.note}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60 font-medium">
                                            <span className={`font-mono font-bold flex items-center gap-1 ${isUrgent ? "text-[#FF3B30] animate-pulse" : isWarning ? "text-[#FFD400]" : "text-white/60"}`}>
                                                ⏱ {timeAgo(o.created_at)} ago
                                            </span>
                                            <span className="font-mono tabular-nums text-white/80 font-bold">${o.total.toFixed(2)}</span>
                                        </div>

                                        <div className="mt-3.5 flex flex-col gap-2">
                                            {col.key === "new" && (
                                                <>
                                                    <button onClick={() => setStatus(o, "preparing")} className="w-full py-3 bg-[#FC8019] text-black font-extrabold uppercase tracking-wider text-xs rounded hover:bg-[#E56B0C] active:scale-[0.98] transition-all shadow-md" data-testid={`kds-start-${o.order_no}`}>
                                                        Start cooking →
                                                    </button>
                                                    <button onClick={() => setStatus(o, "cancelled")} className="w-full py-1.5 border border-white/15 text-white/60 text-[11px] uppercase tracking-wider font-bold rounded hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-colors" data-testid={`kds-cancel-${o.order_no}`}>
                                                        Cancel ticket
                                                    </button>
                                                </>
                                            )}
                                            {col.key === "preparing" && (
                                                <button onClick={() => setStatus(o, "ready")} className="w-full py-3 bg-[#00C244] text-black font-extrabold uppercase tracking-wider text-xs rounded hover:bg-[#00A83A] active:scale-[0.98] transition-all shadow-md" data-testid={`kds-ready-${o.order_no}`}>
                                                    Mark ready for pass ✓
                                                </button>
                                            )}
                                            {col.key === "ready" && (
                                                <button onClick={() => setStatus(o, "served")} className="w-full py-3 bg-white text-black font-extrabold uppercase tracking-wider text-xs rounded hover:bg-gray-200 active:scale-[0.98] transition-all shadow-md" data-testid={`kds-served-${o.order_no}`}>
                                                    Order served & close ✦
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {byStatus[col.key].length === 0 && (
                                <div className="text-center text-white/30 py-20 text-xs uppercase tracking-widest font-extrabold">
                                    Queue Empty
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
