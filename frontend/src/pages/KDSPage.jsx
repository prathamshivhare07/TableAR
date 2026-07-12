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
        <div className="min-h-screen kds-body flex flex-col" data-testid="kds-page">
            <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-white/60 hover:text-white transition-colors" data-testid="kds-back-link">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Kitchen Display System</div>
                        <div className="font-display text-3xl">Line · Live</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-[#00C244]" : "bg-red-500"} ${connected ? "animate-pulse" : ""}`}></span>
                        {connected ? "Realtime connected" : "Reconnecting…"}
                    </div>
                    <div className="text-xs font-mono text-white/70">{new Date(now).toLocaleTimeString()}</div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                {COLUMNS.map((col) => (
                    <div key={col.key} className="flex flex-col min-h-0" data-testid={`kds-col-${col.key}`}>
                        <div className="kds-col-head px-4 py-3 flex items-center justify-between mb-3" style={{ borderColor: col.color + "55" }}>
                            <div className="flex items-center gap-2">
                                <col.icon size={20} weight="bold" color={col.color} />
                                <span className="font-display text-2xl">{col.label}</span>
                            </div>
                            <span className="text-3xl font-display" style={{ color: col.color }}>{byStatus[col.key].length}</span>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto scroll-thin pr-1">
                            {byStatus[col.key].map((o) => {
                                const ageSec = Math.floor((now - new Date(o.created_at).getTime()) / 1000);
                                const hot = col.key === "new" && ageSec > 90;
                                return (
                                    <div key={o.id} className={`kds-card p-4 fade-in ${hot ? "ring-2 ring-[#FF3B30]" : ""}`} data-testid={`kds-ticket-${o.order_no}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="font-display text-3xl leading-none">{o.order_no}</div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Table</div>
                                                <div className="font-display text-2xl leading-none">{o.table_code || "T/A"}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-1">
                                            {o.items.map((it, i) => (
                                                <div key={i} className="flex items-start justify-between text-sm">
                                                    <div>
                                                        <span className="text-[#FC8019] font-extrabold">×{it.qty}</span>{" "}
                                                        <span className="font-semibold">{it.name}</span>
                                                        {it.note && <div className="text-[11px] text-white/50 italic">— {it.note}</div>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-[11px] text-white/50 uppercase tracking-widest font-bold">
                                            <span>{timeAgo(o.created_at)} ago</span>
                                            <span>${o.total.toFixed(2)}</span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            {col.key === "new" && (
                                                <>
                                                    <button onClick={() => setStatus(o, "preparing")} className="col-span-2 py-2 bg-[#FC8019] text-black font-extrabold uppercase tracking-widest text-xs hover:bg-[#E56B0C] transition-colors" data-testid={`kds-start-${o.order_no}`}>Start cooking →</button>
                                                    <button onClick={() => setStatus(o, "cancelled")} className="col-span-2 py-2 border border-white/20 text-white/70 text-xs uppercase tracking-widest font-bold hover:bg-red-500/20 hover:text-white transition-colors" data-testid={`kds-cancel-${o.order_no}`}>Cancel</button>
                                                </>
                                            )}
                                            {col.key === "preparing" && (
                                                <button onClick={() => setStatus(o, "ready")} className="col-span-2 py-2 bg-[#00C244] text-black font-extrabold uppercase tracking-widest text-xs hover:brightness-95 transition-all" data-testid={`kds-ready-${o.order_no}`}>Mark ready →</button>
                                            )}
                                            {col.key === "ready" && (
                                                <button onClick={() => setStatus(o, "served")} className="col-span-2 py-2 bg-white text-black font-extrabold uppercase tracking-widest text-xs hover:bg-white/80 transition-colors" data-testid={`kds-served-${o.order_no}`}>Served ✓</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {byStatus[col.key].length === 0 && (
                                <div className="text-center text-white/30 py-16 text-xs uppercase tracking-widest font-bold">No tickets</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
