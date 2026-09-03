import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    QrCode, ArrowUpRight, ForkKnife, Cube, Lightning, ChartLineUp,
    Check, Sparkle, ShieldCheck, DeviceMobile, Storefront, ArrowRight
} from "@phosphor-icons/react";
import ModelViewer from "../components/ModelViewer";

const HERO_MODELS = [
    {
        name: "Avocado Toast",
        category: "Signature Brunch",
        price: "$14.50",
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
    },
    {
        name: "Hydration Flask",
        category: "Beverage",
        price: "$6.00",
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb",
    },
    {
        name: "Suzanne Gelato",
        category: "Dessert Art",
        price: "$8.50",
        url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Suzanne/glTF-Binary/Suzanne.glb",
    },
];

function Chip({ children, tone = "ink" }) {
    const cls = tone === "orange"
        ? "bg-[#FC8019] text-white border-black"
        : "bg-white text-black border-black";
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest border-2 shadow-sm rounded-sm ${cls}`}>
            {children}
        </span>
    );
}

export default function LandingPage() {
    const nav = useNavigate();
    const [activeModelIdx, setActiveModelIdx] = useState(0);
    const [isSwitchingModel, setIsSwitchingModel] = useState(false);
    const activeModel = HERO_MODELS[activeModelIdx];

    function switchModel(idx) {
        if (idx === activeModelIdx) return;
        setIsSwitchingModel(true);
        setActiveModelIdx(idx);
        setTimeout(() => setIsSwitchingModel(false), 200);
    }

    return (
        <div className="min-h-screen bg-[#F9F8F6] text-[#0A0A0A] selection:bg-[#FC8019] selection:text-white" data-testid="landing-page">
            {/* Accessibility: Skip to Content */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:font-bold focus:border-2 focus:border-[#FC8019]"
            >
                Skip to main content
            </a>

            {/* Top Navigation */}
            <header className="border-b-2 border-black bg-white/90 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
                    <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-link" aria-label="Tabler.AR Home">
                        <div className="w-10 h-10 bg-[#FC8019] hard-border grid place-items-center group-hover:rotate-6 transition-transform">
                            <ForkKnife size={22} weight="fill" color="#0A0A0A" />
                        </div>
                        <div className="font-display text-2xl leading-none tracking-tight">
                            Tabler<span className="text-[#FC8019]">.AR</span>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 text-xs font-extrabold uppercase tracking-wider text-[#0A0A0A]">
                        <a href="#how" className="hover:text-[#FC8019] transition-colors py-1">How It Works</a>
                        <a href="#features" className="hover:text-[#FC8019] transition-colors py-1">Features</a>
                        <a href="#pricing" className="hover:text-[#FC8019] transition-colors py-1">Pricing</a>
                        <Link to="/m/spice-route" className="hover:text-[#FC8019] transition-colors py-1 inline-flex items-center gap-1">
                            Live Demo <ArrowUpRight size={14} weight="bold" />
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => nav("/login")}
                            className="hidden sm:inline-flex ghost-btn px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded"
                            data-testid="nav-login-btn"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => nav("/register")}
                            className="brand-btn px-5 py-2 text-xs font-extrabold uppercase tracking-wider rounded flex items-center gap-1.5"
                            data-testid="nav-register-btn"
                        >
                            Get Started <ArrowRight size={14} weight="bold" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Neo-brutalist High-Energy Marquee Ribbon */}
            <div className="bg-[#0A0A0A] text-white overflow-hidden border-b-2 border-black py-2.5 select-none" aria-hidden="true">
                <div className="marquee whitespace-nowrap">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-12 pr-12">
                            {[
                                "Kill the printed menu",
                                "1:1 WebAR on every table",
                                "Zero app downloads",
                                "Real-time kitchen display",
                                "Boost average check by 24%",
                                "Instant table QR ordering",
                            ].map((t, j) => (
                                <span key={j} className="font-display text-2xl md:text-3xl tracking-wide flex items-center gap-4">
                                    <span>{t}</span>
                                    <span className="text-[#FC8019]">✦</span>
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <main id="main-content">
                {/* Hero Section — Asymmetric Tetris Grid with Ambient Depth */}
                <section className="relative overflow-hidden border-b-2 border-black dot-grid-subtle">
                    <div className="max-w-[1400px] mx-auto px-6 py-14 md:py-24 grid grid-cols-12 gap-8 items-center">
                        <div className="col-span-12 lg:col-span-7 z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Chip tone="orange">✦ WebAR × Table Ordering</Chip>
                                <span className="text-xs font-extrabold uppercase tracking-widest text-gray-600 hidden sm:inline">
                                    Instant Mobile Browser Experience
                                </span>
                            </div>

                            <h1 className="font-display text-[56px] sm:text-[76px] md:text-[98px] leading-[0.92] tracking-tight text-balance">
                                Kill the <br />
                                <span className="bg-[#FC8019] text-white px-3.5 inline-block -ml-1 hard-border shadow-[4px_4px_0px_0px_#0A0A0A] rotate-[-1deg]">
                                    Menu.
                                </span><br />
                                Project the <span className="italic font-normal font-serif text-[#0A0A0A]">experience.</span>
                            </h1>

                            <p className="mt-6 text-base md:text-lg max-w-xl text-gray-700 font-medium leading-relaxed text-balance">
                                A restaurant ordering OS designed to eliminate dining anxiety. Diners scan a table QR code, preview dishes in 1:1 photorealistic WebAR right on their physical table, and place orders directly to a live WebSocket Kitchen Display System.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <button
                                    onClick={() => nav("/register")}
                                    className="brand-btn px-7 py-4 text-sm font-extrabold tracking-wider rounded"
                                    data-testid="hero-cta-register"
                                >
                                    Start Free — No Credit Card
                                </button>
                                <button
                                    onClick={() => nav("/m/spice-route")}
                                    className="ghost-btn px-6 py-4 text-sm font-extrabold tracking-wider rounded inline-flex items-center gap-2"
                                    data-testid="hero-cta-demo"
                                >
                                    Try Diner WebAR Demo <ArrowUpRight size={18} weight="bold" />
                                </button>
                            </div>

                            {/* Trust Signals */}
                            <div className="mt-10 pt-6 border-t border-black/10 flex flex-wrap items-center gap-3">
                                <span className="tag text-[11px] font-bold"><DeviceMobile size={14} weight="bold" /> No App Download</span>
                                <span className="tag text-[11px] font-bold"><Cube size={14} weight="bold" /> &lt;15MB Fast GLB</span>
                                <span className="tag text-[11px] font-bold"><Storefront size={14} weight="bold" /> Multi-Tenant</span>
                                <span className="tag text-[11px] font-bold"><Lightning size={14} weight="bold" /> WebSocket KDS</span>
                            </div>
                        </div>

                        {/* Right: Live Interactive 3D Card with Model Switcher */}
                        <div className="col-span-12 lg:col-span-5 z-10">
                            <div className="hard-border bg-white p-5 hard-shadow-lg rounded-lg relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FC8019] text-white text-[10px] font-extrabold uppercase tracking-wider rounded border border-black">
                                            <Cube size={13} weight="bold" /> Live 3D Canvas
                                        </span>
                                        <span className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">
                                            Google &lt;model-viewer&gt;
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#FC8019] animate-pulse">
                                        ● Interactive
                                    </div>
                                </div>

                                {/* 3D Canvas Container */}
                                <div className={`aspect-[4/4.5] bg-[#FFF3E7] hard-border overflow-hidden rounded relative transition-[opacity,filter] duration-200 ease-out ${isSwitchingModel ? "opacity-60 blur-[2px]" : "opacity-100 blur-0"}`}>
                                    <ModelViewer
                                        key={activeModel.url}
                                        src={activeModel.url}
                                        className="w-full h-full"
                                    />
                                    <div className="absolute top-2 left-2 pointer-events-none">
                                        <span className="bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                                            Drag to rotate · Scroll to zoom
                                        </span>
                                    </div>
                                </div>

                                {/* Active Model Details & Switcher */}
                                <div className="mt-4 pt-1 flex items-center justify-between">
                                    <div>
                                        <div className="font-display text-2xl text-[#0A0A0A] leading-tight">{activeModel.name}</div>
                                        <div className="text-xs text-gray-600 font-semibold mt-0.5">{activeModel.category} · 1:1 Scale</div>
                                    </div>
                                    <div className="font-display text-2xl text-[#FC8019] tabular-nums">
                                        {activeModel.price}
                                    </div>
                                </div>

                                {/* Switch Models Bar */}
                                <div className="mt-3 pt-3 border-t border-black/10 flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500">Sample Models:</span>
                                    <div className="flex gap-1.5">
                                        {HERO_MODELS.map((m, idx) => (
                                            <button
                                                key={m.name}
                                                onClick={() => switchModel(idx)}
                                                className={`px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider border border-black rounded transition-[transform,background-color] duration-150 active:scale-[0.97] ${
                                                    activeModelIdx === idx
                                                        ? "bg-black text-white shadow-sm"
                                                        : "bg-white text-black hover:bg-[#FFF3E7]"
                                                }`}
                                            >
                                                {m.name.split(" ")[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works — Sequential Value Steps */}
                <section id="how" className="border-b-2 border-black bg-white">
                    <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
                        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
                            <div>
                                <Chip tone="orange">The 4-Step Journey</Chip>
                                <h2 className="font-display text-4xl md:text-6xl mt-3 tracking-tight">
                                    Zero Friction From QR Scan to Kitchen Pass
                                </h2>
                            </div>
                            <p className="max-w-md text-gray-700 font-medium text-sm md:text-base leading-relaxed text-balance">
                                Setup takes less than 10 minutes. Diners experience immediate gratification without app store barriers or login fatigue.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                {
                                    step: "01",
                                    title: "Scan Table QR",
                                    desc: "Diner scans the table-specific code. The lightning-fast Web menu loads immediately in Safari or Chrome. No downloads.",
                                    icon: QrCode,
                                },
                                {
                                    step: "02",
                                    title: "Preview in 1:1 AR",
                                    desc: "Tap any signature dish to project a photorealistic, true-to-scale 3D preview directly onto the dining table.",
                                    icon: Cube,
                                },
                                {
                                    step: "03",
                                    title: "Instant Cart & Order",
                                    desc: "Diners customize order notes, review real-time subtotals with tax, and submit tickets with one touch.",
                                    icon: Lightning,
                                },
                                {
                                    step: "04",
                                    title: "Kitchen Fires Ticket",
                                    desc: "Incoming tickets flash and chime on the staff KDS kanban board in sub-second latency via WebSockets.",
                                    icon: ForkKnife,
                                },
                            ].map(({ step, title, desc, icon: Icon }) => (
                                <div
                                    key={step}
                                    className="hard-border bg-[#F9F8F6] p-6 hard-shadow-sm rounded-lg flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:hard-shadow"
                                    data-testid={`step-${step}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="font-display text-4xl text-[#FC8019] tabular-nums">{step}</div>
                                            <div className="w-10 h-10 rounded-full bg-white hard-border grid place-items-center">
                                                <Icon size={20} weight="bold" />
                                            </div>
                                        </div>
                                        <h3 className="font-display text-2xl mb-2 text-[#0A0A0A]">{title}</h3>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">{desc}</p>
                                    </div>
                                    <div className="mt-6 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                                        <span>Phase {step}</span>
                                        <span>Completed</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section — High Architectural Confidence */}
                <section id="features" className="border-b-2 border-black bg-[#F9F8F6]">
                    <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 grid grid-cols-12 gap-8 items-start">
                        <div className="col-span-12 md:col-span-4">
                            <Chip tone="orange">Enterprise Ready</Chip>
                            <h2 className="font-display text-4xl md:text-6xl mt-3 tracking-tight leading-tight">
                                Every Brand. <br />
                                One Isolated Codebase.
                            </h2>
                            <p className="mt-5 text-gray-700 font-medium text-sm md:text-base leading-relaxed text-balance">
                                Built with strict server-side multi-tenancy. Every query and WebSocket stream filters by authenticated <code className="bg-white px-1.5 py-0.5 rounded border border-black/20 text-xs font-mono">tenant_id</code> to isolate menus, orders, and sales data.
                            </p>
                            <div className="mt-8 space-y-3">
                                <div className="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider text-gray-800">
                                    <Check size={18} weight="bold" className="text-[#00C244]" /> Sub-second WebSocket dispatch
                                </div>
                                <div className="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider text-gray-800">
                                    <Check size={18} weight="bold" className="text-[#00C244]" /> Automated printable table QR sets
                                </div>
                                <div className="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider text-gray-800">
                                    <Check size={18} weight="bold" className="text-[#00C244]" /> Human-in-the-loop video to 3D pipeline
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                {
                                    title: "Video-to-3D Pipeline",
                                    desc: "Merchants record a 30-second pan of their plate. Platform operators sculpt and optimize lightweight GLB models with verified 1:1 physical dimensions.",
                                    icon: Cube,
                                    badge: "Exclusive",
                                },
                                {
                                    title: "Real-Time Kitchen KDS",
                                    desc: "Wall- or stand-mounted kitchen displays stream incoming, in-pass, and ready tickets with audible alerts and time-in-state monitors.",
                                    icon: Lightning,
                                    badge: "Sub-Second",
                                },
                                {
                                    title: "Table-Scoped QR Generator",
                                    desc: "Generate high-resolution QR sheets per table. When orders are placed, the exact table code is embedded automatically in the kitchen ticket.",
                                    icon: QrCode,
                                    badge: "Zero-Error",
                                },
                                {
                                    title: "Merchant Analytics Engine",
                                    desc: "Track gross revenue, top performing 3D dishes, ticket velocity, and table turnover without bloated external tracking scripts.",
                                    icon: ChartLineUp,
                                    badge: "Real-Time",
                                },
                            ].map((f) => (
                                <div
                                    key={f.title}
                                    className="hard-border bg-white p-6 rounded-lg hard-shadow-sm flex flex-col justify-between hover:bg-[#FFF3E7] transition-all duration-200"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-black text-white grid place-items-center">
                                                <f.icon size={22} weight="bold" />
                                            </div>
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 border border-black rounded bg-white">
                                                {f.badge}
                                            </span>
                                        </div>
                                        <h3 className="font-display text-2xl mt-3 text-[#0A0A0A]">{f.title}</h3>
                                        <p className="text-sm text-gray-700 mt-2 font-medium leading-relaxed">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section — Cohesive Warm Palette (Replaced Generic Dark Jump) */}
                <section id="pricing" className="border-b-2 border-black bg-white">
                    <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
                        <div className="text-center max-w-2xl mx-auto mb-14">
                            <Chip tone="orange">Transparent Plans</Chip>
                            <h2 className="font-display text-5xl md:text-7xl mt-3 tracking-tight">
                                Simple. Scalable. Fair.
                            </h2>
                            <p className="text-gray-600 font-medium mt-3 text-sm md:text-base text-balance">
                                Start free today. Upgrade when your restaurant is ready to roll out 3D models across the full catalog.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                            {[
                                {
                                    name: "Starter",
                                    price: "$0",
                                    period: "Free forever",
                                    featured: false,
                                    tag: "1 location · Up to 20 menu items",
                                    perks: [
                                        "Interactive digital QR menu",
                                        "Up to 5 signature 3D WebAR models",
                                        "Real-time Kitchen Display (1 line)",
                                        "Table-specific QR code generator",
                                        "Standard email support",
                                    ],
                                    cta: "Get Started Free",
                                },
                                {
                                    name: "Growth",
                                    price: "$79",
                                    period: "per month / location",
                                    featured: true,
                                    tag: "Our most popular package for busy venues",
                                    perks: [
                                        "Unlimited menu categories & dishes",
                                        "Unlimited 3D WebAR model pipeline",
                                        "Multi-station Kitchen Display (KDS)",
                                        "Revenue & dish analytics engine",
                                        "Priority video conversion turnaround",
                                        "Custom restaurant branding & hero art",
                                    ],
                                    cta: "Start 14-Day Free Trial",
                                },
                                {
                                    name: "Enterprise",
                                    price: "Custom",
                                    period: "tailored for multi-unit groups",
                                    featured: false,
                                    tag: "10+ locations & restaurant franchises",
                                    perks: [
                                        "Centralized multi-brand dashboard",
                                        "Custom POS & inventory integrations",
                                        "Dedicated 3D photogrammetry artist",
                                        "Custom SLA & 24/7 phone support",
                                        "Enterprise SSO & role permissions",
                                    ],
                                    cta: "Contact Enterprise Sales",
                                },
                            ].map((p) => (
                                <div
                                    key={p.name}
                                    className={`p-8 border-2 hard-border rounded-lg flex flex-col justify-between transition-all duration-200 ${
                                        p.featured
                                            ? "bg-[#FFF3E7] hard-shadow-lg scale-100 md:-translate-y-2 relative"
                                            : "bg-[#F9F8F6] hard-shadow-sm hover:hard-shadow"
                                    }`}
                                >
                                    {p.featured && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FC8019] text-white border-2 border-black px-3.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider shadow-sm">
                                            Most Popular Choice
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase tracking-widest text-[#0A0A0A]">{p.name}</span>
                                            {p.featured && <Sparkle size={18} weight="fill" className="text-[#FC8019]" />}
                                        </div>

                                        <div className="mt-4 flex items-baseline gap-1.5">
                                            <span className="font-display text-5xl md:text-6xl text-[#0A0A0A] tabular-nums">{p.price}</span>
                                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{p.period}</span>
                                        </div>

                                        <p className="text-xs text-gray-600 font-bold mt-2 pb-4 border-b border-black/15">
                                            {p.tag}
                                        </p>

                                        <ul className="mt-6 space-y-3">
                                            {p.perks.map((x) => (
                                                <li key={x} className="flex items-start gap-2.5 text-xs md:text-sm font-semibold text-gray-800">
                                                    <Check size={16} weight="bold" className="text-[#00C244] shrink-0 mt-0.5" />
                                                    <span>{x}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <button
                                        onClick={() => nav("/register")}
                                        className={`mt-8 w-full py-4 text-xs font-extrabold uppercase tracking-wider rounded border-2 border-black transition-all active:scale-[0.98] ${
                                            p.featured
                                                ? "brand-btn text-white shadow-[4px_4px_0px_0px_#0A0A0A]"
                                                : "ghost-btn text-black shadow-[3px_3px_0px_0px_#0A0A0A]"
                                        }`}
                                    >
                                        {p.cta}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Comprehensive Footer with Legal, Product Links & Status */}
            <footer className="border-t-2 border-black bg-[#F9F8F6]">
                <div className="max-w-[1400px] mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-black/15">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-[#FC8019] hard-border grid place-items-center">
                                    <ForkKnife size={18} weight="fill" color="#0A0A0A" />
                                </div>
                                <span className="font-display text-2xl tracking-tight">Tabler<span className="text-[#FC8019]">.AR</span></span>
                            </div>
                            <p className="text-xs text-gray-600 font-medium mt-3 max-w-sm leading-relaxed">
                                The modern restaurant ordering operating system. Eliminating menu hesitation with instant 1:1 WebAR dish projections and live kitchen ticket streaming.
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-700">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#00C244] animate-pulse" />
                                All Systems Operational (v1.2.0)
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-black uppercase tracking-widest text-[#0A0A0A] mb-3">Product Surfaces</div>
                            <ul className="space-y-2 text-xs font-bold text-gray-600">
                                <li>
                                    <Link to="/m/spice-route" className="hover:text-[#FC8019] transition-colors">
                                        Diner WebAR Menu
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/kds" className="hover:text-[#FC8019] transition-colors">
                                        Kitchen Display System (KDS)
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/dashboard" className="hover:text-[#FC8019] transition-colors">
                                        Merchant Admin Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/superadmin" className="hover:text-[#FC8019] transition-colors">
                                        Super Admin 3D Pipeline
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <div className="text-xs font-black uppercase tracking-widest text-[#0A0A0A] mb-3">Trust & Compliance</div>
                            <ul className="space-y-2 text-xs font-bold text-gray-600">
                                <li>
                                    <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Tabler.AR uses minimal privacy-preserving analytics with zero diner tracking cookies."); }} className="hover:text-[#FC8019] transition-colors">
                                        Privacy Policy
                                    </a>
                                </li>
                                <li>
                                    <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Standard SaaS Terms: 99.9% uptime SLA on growth tiers."); }} className="hover:text-[#FC8019] transition-colors">
                                        Terms of Service
                                    </a>
                                </li>
                                <li>
                                    <span className="text-gray-400 cursor-not-allowed">Security Architecture (SOC-2 Ready)</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-gray-500">
                        <div>© 2026 Tabler.AR Technologies Inc. All rights reserved.</div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="hover:text-[#FC8019] transition-colors">Merchant Portal</Link>
                            <span>·</span>
                            <Link to="/register" className="hover:text-[#FC8019] transition-colors">Register Location</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
