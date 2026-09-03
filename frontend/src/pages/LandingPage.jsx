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
        <div className="min-h-[100dvh] bg-[#F9F8F6] text-black" data-testid="landing-page">
            {/* Top nav */}
            <header className="border-b-2 border-black bg-white sticky top-0 z-30">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4 h-18">
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
                        <button onClick={() => nav("/login")} className="hidden sm:inline-flex ghost-btn px-4 py-2 text-sm active:scale-95" data-testid="nav-login-btn">Log in</button>
                        <button onClick={() => nav("/register")} className="brand-btn px-4 py-2 text-sm active:scale-95" data-testid="nav-register-btn">Get started →</button>
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

            {/* Hero */}
            <section className="max-w-[1400px] mx-auto px-6 py-12 md:py-20 grid grid-cols-12 gap-6 items-center">
                <div className="col-span-12 lg:col-span-7">
                    <Chip tone="orange">✦ QR × WebAR × KDS</Chip>
                    <h1 className="font-display text-[60px] md:text-[104px] mt-4 leading-[0.92] tracking-tight">
                        Kill the<br/>
                        <span className="bg-[#FC8019] px-3 inline-block -ml-1 hard-border text-white">Menu.</span><br/>
                        Serve the <span className="text-[#FC8019]">experience.</span>
                    </h1>
                    <p className="mt-5 text-base md:text-lg max-w-xl text-gray-700 font-medium leading-relaxed">
                        App-free QR ordering with 1:1 WebAR dish previews on diner tables, streamed live to kitchen display systems.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                        <button onClick={() => nav("/register")} className="brand-btn px-6 py-4 text-base active:scale-[0.98]" data-testid="hero-cta-register">
                            Start free - no card
                        </button>
                        <button onClick={() => nav("/m/spice-route")} className="ghost-btn px-6 py-4 text-base inline-flex items-center gap-2 active:scale-[0.98]" data-testid="hero-cta-demo">
                            Try the diner demo <ArrowUpRight size={18} weight="bold" />
                        </button>
                    </div>
                </div>

                {/* Right: live 3D card */}
                <div className="col-span-12 lg:col-span-5">
                    <div className="hard-border bg-white p-4 hard-shadow-lg relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="tag"><Cube size={14} weight="bold" /> Live 3D Model</div>
                            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#FC8019] flex items-center gap-1">
                                Drag to rotate ✦
                            </div>
                        </div>
                        <div className="aspect-[4/5] bg-[#FFF3E7] hard-border overflow-hidden relative">
                            <ModelViewer src={SAMPLE_MODEL} className="w-full h-full" />
                            <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-between pointer-events-none">
                                <span>1:1 True Scale Preview</span>
                                <span className="text-[#FC8019]">WebAR Ready</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <div className="font-display text-2xl tracking-tight">Truffle Smash</div>
                                <div className="text-xs text-gray-600 font-semibold mt-0.5">Signature Brioche Burger · 3D + AR</div>
                            </div>
                            <div className="pill-orange px-4 py-2 text-sm shadow-sm">$14.50</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="border-t-2 border-black bg-white">
                <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
                    <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
                        <div>
                            <h2 className="font-display text-5xl md:text-7xl">How it works</h2>
                        </div>
                        <p className="max-w-md text-gray-700 text-sm md:text-base font-medium">Onboard your restaurant in minutes. From menu upload to 1:1 table WebAR orders: everything connects seamlessly in real-time.</p>
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
            <section id="features" className="border-t-2 border-black bg-[#F9F8F6]">
                <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 grid grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-4">
                        <h2 className="font-display text-5xl md:text-6xl tracking-tight">Every brand.<br/>One codebase.</h2>
                        <p className="mt-5 text-gray-700 font-medium leading-relaxed">Strict tenant_id isolation. Deploy once, serve thousands of independent restaurants: each with dedicated menus, tables, and analytics.</p>
                    </div>
                    <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                            { t: "Video → 3D pipeline", d: "Merchants upload a short video of the dish. Our team turns it into a &lt;15MB .glb ready for WebAR.", icon: Cube },
                            { t: "Real-time KDS", d: "WebSocket-powered kitchen board. Tickets appear the instant a diner hits submit.", icon: Lightning },
                            { t: "Table-scoped QR codes", d: "Auto-generate a printable QR per table. Order lands with the exact table code attached.", icon: QrCode },
                            { t: "Analytics that matter", d: "Revenue, top dishes, average ticket, daily trends. No dashboard tourism.", icon: ChartLineUp },
                        ].map((f) => (
                            <div key={f.t} className="hard-border bg-white p-6 hover:bg-[#FFF3E7] hover:hard-shadow transition-all">
                                <f.icon size={26} weight="bold" />
                                <div className="font-display text-2xl mt-4">{f.t}</div>
                                <div className="text-sm text-gray-700 mt-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: f.d }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="border-t-2 border-black bg-white text-black">
                <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
                    <h2 className="font-display text-5xl md:text-7xl">Simple. Fair. Scalable.</h2>
                    <p className="mt-3 text-gray-700 max-w-lg text-sm md:text-base font-medium">Predictable pricing with zero commissions on food sales. Pick the plan that matches your service scale.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                        {[
                            { name: "Starter", price: "$0", period: "/month", tag: "1 restaurant, up to 20 dishes", perks: ["Instant QR menus", "3D previews up to 5 dishes", "Basic kitchen KDS", "Community support"] },
                            { name: "Growth", price: "$99", period: "/location/mo", featured: true, tag: "High-volume independent venues", perks: ["Unlimited menu items", "Unlimited WebAR 3D models", "WebSocket real-time KDS", "Detailed sales & item analytics", "Priority 3D conversion pipeline"] },
                            { name: "Empire", price: "Custom", period: "", tag: "Multi-concept groups & franchises", perks: ["Dedicated SLA & onboarding", "Custom restaurant domain", "Multi-brand centralized admin", "SSO & enterprise audit logs"] },
                        ].map((p) => (
                            <div key={p.name} className={`p-8 border-2 hard-border transition-all flex flex-col justify-between ${p.featured ? "bg-[#FC8019] text-[#0A0A0A] hard-shadow-lg scale-[1.02] relative" : "bg-[#F9F8F6] text-black hard-shadow hover:-translate-y-1"}`}>
                                {p.featured && (
                                    <div className="absolute -top-3.5 left-6 bg-black text-white px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest hard-border">
                                        Most Popular
                                    </div>
                                )}
                                <div>
                                    <div className={`text-xs font-extrabold uppercase tracking-widest ${p.featured ? "text-[#0A0A0A]" : "text-gray-600"}`}>{p.name}</div>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className="font-display text-6xl tracking-tight tabular-nums">{p.price}</span>
                                        {p.period && <span className={`text-sm font-bold ${p.featured ? "text-black/80" : "text-gray-600"}`}>{p.period}</span>}
                                    </div>
                                    <div className={`text-xs mt-1 font-medium ${p.featured ? "text-black/80" : "text-gray-600"}`}>{p.tag}</div>
                                    <div className={`my-6 h-px ${p.featured ? "bg-black/20" : "bg-black/10"}`}></div>
                                    <ul className="space-y-2.5 text-sm font-medium">
                                        {p.perks.map((x) => (
                                            <li key={x} className="flex items-start gap-2">
                                                <span className="font-bold text-black">✓</span>
                                                <span>{x}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button onClick={() => nav("/register")} className={`mt-8 w-full px-4 py-3 text-xs font-extrabold uppercase tracking-widest border-2 border-black transition-all active:scale-[0.98] ${p.featured ? "bg-black text-white hover:bg-neutral-900 shadow-md" : "brand-btn"}`}>
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
