import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { QrCode, ArrowUpRight, ForkKnife, Storefront, Lightning, Cube, ChartLineUp, Users } from "@phosphor-icons/react";
import ModelViewer from "../components/ModelViewer";

const SAMPLE_MODEL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb";

function Chip({ children, tone = "ink" }) {
    const cls = tone === "orange"
        ? "bg-[#FC8019] text-white border-black"
        : "bg-white text-black border-black";
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest border-2 ${cls}`}>
            {children}
        </span>
    );
}

export default function LandingPage() {
    const nav = useNavigate();
    return (
        <div className="min-h-screen bg-[#F9F8F6] text-black" data-testid="landing-page">
            {/* Top nav */}
            <header className="border-b-2 border-black">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
                    <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
                        <div className="w-10 h-10 bg-[#FC8019] hard-border grid place-items-center">
                            <ForkKnife size={22} weight="fill" color="#0A0A0A" />
                        </div>
                        <div className="font-display text-2xl leading-none">Tabler<span className="text-[#FC8019]">.AR</span></div>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wider">
                        <a href="#how" className="hover:text-[#FC8019] transition-colors">How it works</a>
                        <a href="#features" className="hover:text-[#FC8019] transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-[#FC8019] transition-colors">Pricing</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <button onClick={() => nav("/login")} className="hidden sm:inline-flex ghost-btn px-4 py-2 text-sm" data-testid="nav-login-btn">Log in</button>
                        <button onClick={() => nav("/register")} className="brand-btn px-4 py-2 text-sm" data-testid="nav-register-btn">Get started →</button>
                    </div>
                </div>
            </header>

            {/* Marquee */}
            <div className="bg-black text-white overflow-hidden border-b-2 border-black">
                <div className="marquee py-3 whitespace-nowrap">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-12 pr-12">
                            {["Kill the printed menu.", "Show, don't tell.", "1:1 WebAR on every table.", "Order in 20 seconds.", "KDS in real-time.", "Kill the printed menu."].map((t, j) => (
                                <span key={j} className="font-display text-3xl md:text-4xl">
                                    {t} <span className="text-[#FC8019]">✦</span>
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hero — asymmetric Tetris grid */}
            <section className="max-w-[1400px] mx-auto px-6 py-14 md:py-24 grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-7">
                    <Chip tone="orange">✦ QR × WebAR × KDS</Chip>
                    <h1 className="font-display text-[64px] md:text-[112px] mt-5 leading-[0.9]">
                        Kill the<br/>
                        <span className="bg-[#FC8019] px-3 inline-block -ml-1 hard-border">Menu.</span><br/>
                        Serve the <span className="italic font-normal font-serif">experience.</span>
                    </h1>
                    <p className="mt-6 text-base md:text-lg max-w-xl text-gray-700 font-medium">
                        A B2B ordering OS for restaurants. Diners scan a QR, preview dishes in 1:1 WebAR right on their table, order in seconds — and the kitchen sees the ticket instantly on a real-time KDS.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                        <button onClick={() => nav("/register")} className="brand-btn px-6 py-4 text-base" data-testid="hero-cta-register">
                            Start free — no card
                        </button>
                        <button onClick={() => nav("/m/spice-route")} className="ghost-btn px-6 py-4 text-base inline-flex items-center gap-2" data-testid="hero-cta-demo">
                            Try the diner demo <ArrowUpRight size={18} weight="bold" />
                        </button>
                    </div>
                    <div className="mt-10 flex flex-wrap items-center gap-3">
                        <Chip>No app download</Chip>
                        <Chip>&lt;15MB models</Chip>
                        <Chip>Multi-tenant</Chip>
                        <Chip>WebSocket KDS</Chip>
                    </div>
                </div>

                {/* Right: live 3D card */}
                <div className="col-span-12 lg:col-span-5">
                    <div className="hard-border bg-white p-4 hard-shadow-lg relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="tag"><Cube size={14} weight="bold" /> Live 3D</div>
                            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Try it →</div>
                        </div>
                        <div className="aspect-[4/5] bg-[#FFF3E7] hard-border overflow-hidden">
                            <ModelViewer src={SAMPLE_MODEL} className="w-full h-full" />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <div className="font-display text-2xl">Truffle Smash</div>
                                <div className="text-xs text-gray-600 font-semibold">Signature Burger · 3D + AR</div>
                            </div>
                            <div className="pill-orange px-4 py-2 text-sm">$14.50</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="border-t-2 border-black bg-white">
                <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
                    <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
                        <div>
                            <Chip>01 → 02 → 03 → 04</Chip>
                            <h2 className="font-display text-5xl md:text-7xl mt-3">How it works</h2>
                        </div>
                        <p className="max-w-md text-gray-700">Onboard a restaurant in under 10 minutes. From menu upload to first order — everything lives in one dashboard.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
                        {[
                            { n: "01", t: "Scan the QR", d: "Diner scans a table-specific QR. Menu opens in the browser instantly. No downloads.", icon: QrCode },
                            { n: "02", t: "Preview in AR", d: "Tap any dish → view a 1:1 3D model. Project it right onto the table on iOS + Android.", icon: Cube },
                            { n: "03", t: "One-tap order", d: "Cart → checkout → done. Order streams to the kitchen in real-time.", icon: Lightning },
                            { n: "04", t: "Kitchen fires", d: "Touch-optimized KDS. New → Preparing → Ready → Served. Zero lost tickets.", icon: ForkKnife },
                        ].map(({ n, t, d, icon: Icon }) => (
                            <div key={n} className="hard-border bg-[#F9F8F6] p-6 hard-shadow-sm transition-transform hover:-translate-y-1 hover:hard-shadow" data-testid={`step-${n}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="font-display text-4xl text-[#FC8019]">{n}</div>
                                    <Icon size={28} weight="bold" />
                                </div>
                                <div className="font-display text-2xl mb-2">{t}</div>
                                <div className="text-sm text-gray-700 leading-relaxed">{d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features grid */}
            <section id="features" className="border-t-2 border-black">
                <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 grid grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-4">
                        <Chip tone="orange">Built for scale</Chip>
                        <h2 className="font-display text-5xl md:text-6xl mt-3">Every brand.<br/>One codebase.</h2>
                        <p className="mt-5 text-gray-700 font-medium">Strict tenant_id isolation. Deploy once, serve thousands of independent restaurants — each with their own menu, brand, tables and analytics.</p>
                    </div>
                    <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                            { t: "Video → 3D pipeline", d: "Merchants upload a short video of the dish. Our team turns it into a &lt;15MB .glb ready for WebAR.", icon: Cube },
                            { t: "Real-time KDS", d: "WebSocket-powered kitchen board. Tickets appear the instant a diner hits submit.", icon: Lightning },
                            { t: "Table-scoped QR codes", d: "Auto-generate a printable QR per table. Order lands with the exact table code attached.", icon: QrCode },
                            { t: "Analytics that matter", d: "Revenue, top dishes, average ticket, daily trends. No dashboard tourism.", icon: ChartLineUp },
                        ].map((f) => (
                            <div key={f.t} className="hard-border bg-white p-6 hover:bg-[#FFF3E7] transition-colors">
                                <f.icon size={26} weight="bold" />
                                <div className="font-display text-2xl mt-4">{f.t}</div>
                                <div className="text-sm text-gray-700 mt-2" dangerouslySetInnerHTML={{ __html: f.d }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="border-t-2 border-black bg-[#0A0A0A] text-white">
                <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
                    <Chip tone="orange">Pricing</Chip>
                    <h2 className="font-display text-5xl md:text-7xl mt-3">Simple. Loud. Fair.</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                        {[
                            { name: "Starter", price: "$0", tag: "1 restaurant, 20 dishes", perks: ["QR menus", "3D up to 5 dishes", "Basic KDS"] },
                            { name: "Growth", price: "8,999", featured: true, tag: "per location / month", perks: ["Unlimited dishes", "Unlimited 3D models", "Real-time KDS", "Advanced analytics"] },
                            { name: "Empire", price: "Custom", tag: "50+ locations", perks: ["Dedicated SLA", "Custom branding", "SSO + audit logs", "White-label"] },
                        ].map((p) => (
                            <div key={p.name} className={`p-8 border-2 ${p.featured ? "bg-[#FC8019] text-black border-[#FC8019]" : "bg-[#141414] border-white/15"}`}>
                                <div className={`text-xs font-extrabold uppercase tracking-widest ${p.featured ? "text-black" : "text-white/60"}`}>{p.name}</div>
                                <div className="font-display text-6xl mt-2">{p.price}</div>
                                <div className={`text-sm mt-1 ${p.featured ? "text-black/80" : "text-white/70"}`}>{p.tag}</div>
                                <div className="my-6 h-px bg-black/20"></div>
                                <ul className="space-y-2 text-sm font-medium">
                                    {p.perks.map((x) => <li key={x}>→ {x}</li>)}
                                </ul>
                                <button onClick={() => nav("/register")} className={`mt-8 w-full px-4 py-3 font-extrabold uppercase tracking-widest ${p.featured ? "bg-black text-white hover:bg-[#1a1a1a]" : "bg-white text-black hover:bg-[#FC8019]"} transition-colors`}>
                                    Choose {p.name}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t-2 border-black bg-[#F9F8F6]">
                <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#FC8019] hard-border grid place-items-center"><ForkKnife size={16} weight="fill" /></div>
                        <div className="font-display text-xl">Tabler.AR</div>
                    </div>
                    <div className="text-xs uppercase tracking-widest text-gray-500 font-bold">© 2026 · The end of paper menus</div>
                    <div className="flex gap-3">
                        <button onClick={() => nav("/m/spice-route")} className="text-xs uppercase tracking-widest font-bold hover:text-[#FC8019] transition-colors" data-testid="footer-demo-link">Diner demo</button>
                        <button onClick={() => nav("/kds")} className="text-xs uppercase tracking-widest font-bold hover:text-[#FC8019] transition-colors" data-testid="footer-kds-link">KDS</button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
