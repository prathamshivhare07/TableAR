import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    ArrowLeft, Lightning, CookingPot, HandWaving, SpeakerHigh, SpeakerSlash,
    Clock, Check, X, ShieldCheck
} from "@phosphor-icons/react";
import { API_BASE, getToken } from "../lib/api";
import { useAuth } from "../lib/auth";

const COLUMNS = [
    { key: "new", label: "Incoming", icon: Lightning, color: "#FC8019", actionText: "Start Cooking →", nextStatus: "preparing" },
    { key: "preparing", label: "In the Pass", icon: CookingPot, color: "#FFD400", actionText: "Mark Ready →", nextStatus: "ready" },
    { key: "ready", label: "Ready for Pickup", icon: HandWaving, color: "#00C244", actionText: "Served ✓", nextStatus: "served" },
];

function formatTable(code) {
    if (!code) return "Takeaway";
    const c = String(code).trim();
    if (/^table\s*/i.test(c)) return c;
    if (/^t0*(\d+)$/i.test(c)) return `Table ${c.replace(/^t0*/i, "")}`;
    if (/^\d+$/.test(c)) return `Table ${c}`;
    return `Table ${c}`;
}

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
    const [soundEnabled, setSoundEnabled] = useState(true);
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
                    toast(`New Ticket #${data.order.order_no} · ${formatTable(data.order.table_code)}`, {
                        position: "top-center",
                    });
                    // Sound alert
                    if (soundEnabled) {
                        try {
                            const ctx = new (window.AudioContext || window.webkitAudioContext)();
                            const o = ctx.createOscillator();
                            const g = ctx.createGain();
                            o.frequency.value = 880;
                            o.connect(g);
                            g.connect(ctx.destination);
                            g.gain.value = 0.1;
                            o.start();
                            o.stop(ctx.currentTime + 0.16);
                        } catch { /* audio disabled in browser */ }
                    }
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

        // Keepalive ping
        const ka = setInterval(() => {
            try { ws.readyState === 1 && ws.send("ping"); } catch {}
        }, 25000);

        return () => {
            clearInterval(ka);
            try { ws.close(); } catch {}
        };
    }, [user, nav, soundEnabled]);

    async function setStatus(o, s) {
        try {
            const res = await fetch(`${API_BASE}/api/tenant/orders/${o.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ status: s }),
            });
            if (!res.ok) throw new Error(await res.text());
            if (s === "served" || s === "cancelled") {
                setOrders((prev) => prev.filter((x) => x.id !== o.id));
            }
        } catch (e) {
            toast.error("Failed to update ticket status");
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

    const activeTicketsCount = orders.filter((o) => o.status !== "served" && o.status !== "cancelled").length;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col selection:bg-[#FC8019] selection:text-black font-sans" data-testid="kds-page">
            {/* Header: Kitchen Command Center Navigation */}
            <header className="border-b border-white/10 px-6 py-3.5 flex items-center justify-between bg-[#111111]/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => nav("/dashboard")}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 grid place-items-center transition-colors active:scale-95"
                        data-testid="kds-back-btn"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={18} weight="bold" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-[#FC8019] font-black">
                                Kitchen Display System
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-white/10 text-white/70 rounded-md font-mono font-bold">
                                {activeTicketsCount} Active
                            </span>
                        </div>
                        <h1 className="font-display text-2xl tracking-wide">Live Line Board</h1>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    {/* Sound alert toggle */}
                    <button
                        onClick={() => {
                            setSoundEnabled(!soundEnabled);
                            toast(soundEnabled ? "Chime muted" : "Chime active");
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                            soundEnabled
                                ? "bg-white/10 text-white border-white/20 hover:bg-white/15"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                        title={soundEnabled ? "Mute audio alerts" : "Unmute audio alerts"}
                    >
                        {soundEnabled ? <SpeakerHigh size={16} weight="bold" /> : <SpeakerSlash size={16} weight="bold" />}
                        <span className="hidden sm:inline">{soundEnabled ? "Sound ON" : "Muted"}</span>
                    </button>

                    {/* Connection Status */}
                    <div className="text-xs uppercase tracking-widest font-extrabold flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-[#00C244] shadow-[0_0_8px_#00C244]" : "bg-red-500"} ${connected ? "animate-pulse" : ""}`} />
                        <span className="text-white/80">{connected ? "Connected" : "Reconnecting…"}</span>
                    </div>

                    {/* Live Clock with Tabular Numbers */}
                    <div className="text-xs font-mono font-bold text-white/60 tabular-nums hidden sm:block bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                        {new Date(now).toLocaleTimeString()}
                    </div>
                </div>
            </header>

            {/* Kanban Columns */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 min-h-0">
                {COLUMNS.map((col) => {
                    const tickets = byStatus[col.key] || [];
                    return (
                        <div key={col.key} className="flex flex-col min-h-0 bg-[#141414] rounded-2xl border border-white/10 p-3.5" data-testid={`kds-col-${col.key}`}>
                            {/* Column Header */}
                            <div className="px-3 py-2.5 flex items-center justify-between mb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <col.icon size={20} weight="bold" style={{ color: col.color }} />
                                    <h2 className="font-display text-2xl tracking-wide">{col.label}</h2>
                                </div>
                                <span className="text-2xl font-display tabular-nums" style={{ color: col.color }}>
                                    {tickets.length}
                                </span>
                            </div>

                            {/* Ticket Card Feed */}
                            <div className="flex-1 space-y-3 overflow-y-auto scroll-thin pr-1">
                                {tickets.map((o) => {
                                    const ageSec = Math.floor((now - new Date(o.created_at).getTime()) / 1000);
                                    const isHot = col.key === "new" && ageSec > 120; // Highlight if waiting over 2 minutes
                                    return (
                                        <div
                                            key={o.id}
                                            className={`bg-[#1C1C1C] border border-white/15 rounded-xl p-4 transition-all duration-200 ${
                                                isHot ? "ring-2 ring-[#FF3B30] bg-[#221717]" : "hover:border-white/30"
                                            }`}
                                            data-testid={`kds-ticket-${o.order_no}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Ticket</div>
                                                    <div className="font-display text-3xl leading-none text-white tabular-nums">#{o.order_no}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Location</div>
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 text-white font-extrabold text-xs uppercase tracking-wider mt-0.5">
                                                        {formatTable(o.table_code)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ordered Dishes */}
                                            <div className="mt-3.5 space-y-2 border-t border-b border-white/10 py-3">
                                                {o.items.map((it, i) => (
                                                    <div key={i} className="flex items-start justify-between text-sm">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-[#FC8019] font-black tabular-nums text-base leading-none">
                                                                ×{it.qty}
                                                            </span>
                                                            <div>
                                                                <div className="font-bold text-white leading-tight">{it.name}</div>
                                                                {it.note && (
                                                                    <div className="text-xs text-yellow-300/80 font-medium italic mt-0.5">
                                                                        Note: {it.note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Meta & Elapsed Time */}
                                            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-white/60">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={13} weight="bold" />
                                                    <span className={`tabular-nums font-bold ${isHot ? "text-red-400" : ""}`}>
                                                        {timeAgo(o.created_at)} ago
                                                    </span>
                                                </span>
                                                <span className="tabular-nums font-bold text-white/80">
                                                    ₹{o.total.toFixed(2)}
                                                </span>
                                            </div>

                                            {/* Action Transitions */}
                                            <div className="mt-3.5 grid grid-cols-2 gap-2">
                                                {col.key === "new" && (
                                                    <>
                                                        <button
                                                            onClick={() => setStatus(o, "preparing")}
                                                            className="col-span-2 py-2.5 bg-[#FC8019] text-black font-extrabold uppercase tracking-wider text-xs rounded-xl hover:bg-[#E56B0C] active:scale-[0.97] transition-[transform,background-color] duration-150 shadow-sm"
                                                            data-testid={`kds-start-${o.order_no}`}
                                                        >
                                                            Start Cooking →
                                                        </button>
                                                        <button
                                                            onClick={() => setStatus(o, "cancelled")}
                                                            className="col-span-2 py-1.5 border border-white/20 text-white/60 text-[11px] uppercase tracking-wider font-bold rounded-xl hover:bg-red-500/20 hover:text-white hover:border-red-500/40 active:scale-[0.97] transition-[transform,background-color,border-color] duration-150"
                                                            data-testid={`kds-cancel-${o.order_no}`}
                                                        >
                                                            Cancel Order
                                                        </button>
                                                    </>
                                                )}
                                                {col.key === "preparing" && (
                                                    <button
                                                        onClick={() => setStatus(o, "ready")}
                                                        className="col-span-2 py-2.5 bg-[#00C244] text-black font-extrabold uppercase tracking-wider text-xs rounded-xl hover:brightness-105 active:scale-[0.97] transition-[transform,filter] duration-150 shadow-sm flex items-center justify-center gap-1.5"
                                                        data-testid={`kds-ready-${o.order_no}`}
                                                    >
                                                        <Check size={16} weight="bold" />
                                                        Mark Ready For Pickup
                                                    </button>
                                                )}
                                                {col.key === "ready" && (
                                                    <button
                                                        onClick={() => setStatus(o, "served")}
                                                        className="col-span-2 py-2.5 bg-white text-black font-extrabold uppercase tracking-wider text-xs rounded-xl hover:bg-white/90 active:scale-[0.97] transition-[transform,background-color] duration-150 shadow-sm flex items-center justify-center gap-1.5"
                                                        data-testid={`kds-served-${o.order_no}`}
                                                    >
                                                        <Check size={16} weight="bold" />
                                                        Mark Served
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Empty State when no tickets */}
                                {tickets.length === 0 && (
                                    <div className="text-center text-white/30 py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
                                        <col.icon size={36} weight="duotone" className="text-white/20 mb-2" />
                                        <div className="text-xs uppercase tracking-widest font-extrabold">All Clear</div>
                                        <div className="text-[11px] text-white/40 mt-1 font-medium">No tickets in this stage</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
