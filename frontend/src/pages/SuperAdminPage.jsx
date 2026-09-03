import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Cube, VideoCamera, ArrowClockwise, Download, ArrowUpRight, SignOut, Storefront } from "@phosphor-icons/react";
import { http, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import ModelViewer from "../components/ModelViewer";

function StatBox({ label, value }) {
    return (
        <div className="hard-border bg-white p-5 rounded-xl">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500">{label}</div>
            <div className="font-display text-4xl mt-1">{value ?? "—"}</div>
        </div>
    );
}

export default function SuperAdminPage() {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const [tab, setTab] = useState("queue");
    const [stats, setStats] = useState(null);
    const [queue, setQueue] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [uploadFor, setUploadFor] = useState(null);

    async function reload() {
        try {
            const [s, q, t] = await Promise.all([
                http.get("/superadmin/stats"),
                http.get("/superadmin/queue"),
                http.get("/superadmin/tenants"),
            ]);
            setStats(s.data);
            setQueue(q.data);
            setTenants(t.data);
        } catch (e) { toast.error(formatApiError(e)); }
    }

    useEffect(() => {
        if (user === undefined) return;
        if (!user || user.role !== "super_admin") { nav("/login"); return; }
        reload();
    }, [user, nav]);

    return (
        <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#F9F8F6]" data-testid="superadmin-page">
            <header className="border-b-2 border-black bg-black text-white sticky top-0 z-30">
                <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="font-display text-2xl">Table<span className="text-[#FC8019]">.AR</span> · <span className="text-[#FC8019]">SUPER</span></Link>
                        <nav className="hidden md:flex gap-2">
                            {[
                                { k: "queue", t: "3D Queue" },
                                { k: "tenants", t: "Tenants" },
                            ].map(({ k, t }) => (
                                <button key={k} onClick={() => setTab(k)}
                                    className={`px-3 py-2 text-xs font-extrabold uppercase tracking-widest rounded-lg transition-colors ${tab === k ? "bg-[#FC8019] text-black" : "hover:bg-white/10"}`}
                                    data-testid={`super-tab-${k}`}>{t}</button>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={reload} className="text-white/70 hover:text-white transition-colors" data-testid="super-refresh"><ArrowClockwise size={18} /></button>
                        <div className="text-xs uppercase tracking-widest font-bold">{user?.email}</div>
                        <button onClick={() => { logout(); nav("/"); }} className="text-white/60 hover:text-white transition-colors" data-testid="super-logout"><SignOut size={18} /></button>
                    </div>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto p-6 md:p-10">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                    <StatBox label="Tenants" value={stats?.tenants} />
                    <StatBox label="Total dishes" value={stats?.dishes} />
                    <StatBox label="Orders" value={stats?.orders} />
                    <StatBox label="Pending 3D" value={stats?.pending_models} />
                    <StatBox label="Ready 3D" value={stats?.ready_models} />
                </div>

                {tab === "queue" && (
                    <div className="fade-in" data-testid="super-queue-tab">
                        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Human-in-the-loop</div>
                                <h1 className="font-display text-5xl">3D Model Queue</h1>
                                <p className="text-sm text-gray-700 mt-2 max-w-2xl">Download each source video, sculpt a WebAR-ready <b>.glb</b> in Meshy Studio / Blender / RealityCapture (target &lt;15MB, embedded textures), and upload it back.</p>
                            </div>
                        </div>

                        {queue.length === 0 && (
                            <div className="hard-border bg-white p-12 text-center text-gray-500 rounded-2xl">
                                <Cube size={48} className="mx-auto mb-4" />
                                <div className="font-display text-2xl">Queue clear.</div>
                                <div className="text-sm mt-1">No pending models across any tenant.</div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger">
                            {queue.map((d) => (
                                <div key={d.id} className="hard-border bg-white p-4 rounded-2xl" data-testid={`super-queue-item-${d.id}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <div className="font-display text-2xl leading-tight">{d.name}</div>
                                            <div className="text-xs text-gray-600 mt-0.5">{d.tenant?.name} · <span className="text-gray-400">{d.tenant?.slug}</span></div>
                                        </div>
                                        <span className="tag bg-yellow-300 border-black">{d.model_status}</span>
                                    </div>
                                    {d.video_url ? (
                                        <div className="aspect-video bg-black hard-border overflow-hidden mb-3 rounded-xl">
                                            <video src={d.video_url} controls className="w-full h-full object-contain" data-testid={`super-video-${d.id}`} />
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-gray-100 hard-border grid place-items-center text-xs text-gray-500 mb-3 rounded-xl">No video</div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {d.video_url && (
                                            <a href={d.video_url} download className="ghost-btn px-3 py-2 text-xs inline-flex items-center gap-2 rounded-xl" data-testid={`super-download-${d.id}`}>
                                                <Download size={14} weight="bold" /> Download video
                                            </a>
                                        )}
                                        <button onClick={() => setUploadFor(d)} className="brand-btn px-3 py-2 text-xs inline-flex items-center gap-2 rounded-xl" data-testid={`super-upload-glb-${d.id}`}>
                                            <Cube size={14} weight="bold" /> Upload .glb
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === "tenants" && (
                    <div className="fade-in" data-testid="super-tenants-tab">
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Platform</div>
                                <h1 className="font-display text-5xl">Tenants</h1>
                            </div>
                        </div>
                        <div className="hard-border bg-white overflow-hidden rounded-2xl">
                            <table className="w-full text-sm">
                                <thead className="bg-black text-white text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th className="text-left px-4 py-3">Restaurant</th>
                                        <th className="text-left px-4 py-3">Slug</th>
                                        <th className="text-left px-4 py-3">Plan</th>
                                        <th className="text-left px-4 py-3">Dishes</th>
                                        <th className="text-left px-4 py-3">Orders</th>
                                        <th className="text-left px-4 py-3">Menu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenants.map((t) => (
                                        <tr key={t.id} className="border-t-2 border-black" data-testid={`super-tenant-row-${t.slug}`}>
                                            <td className="px-4 py-3 font-display text-xl">{t.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{t.slug}</td>
                                            <td className="px-4 py-3"><span className="tag">{t.plan}</span></td>
                                            <td className="px-4 py-3 font-bold">{t.dish_count}</td>
                                            <td className="px-4 py-3 font-bold">{t.order_count}</td>
                                            <td className="px-4 py-3">
                                                <a href={`/m/${t.slug}`} target="_blank" rel="noreferrer" className="text-[#FC8019] hover:underline font-bold uppercase tracking-widest text-xs inline-flex items-center gap-1">
                                                    Open <ArrowUpRight size={12} />
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                    {tenants.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No tenants yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {uploadFor && (
                <UploadGlbModal dish={uploadFor} onClose={() => setUploadFor(null)} onDone={() => { setUploadFor(null); reload(); }} />
            )}
        </div>
    );
}

function UploadGlbModal({ dish, onClose, onDone }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    async function submit() {
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await http.post(`/superadmin/dishes/${dish.id}/upload-model`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("3D model uploaded — live on diner menu");
            onDone();
        } catch (e) {
            toast.error(formatApiError(e, "Upload failed"));
        } finally { setUploading(false); }
    }
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="super-upload-modal">
            <div className="bg-white hard-border hard-shadow-lg w-full max-w-lg p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#FC8019]">Upload 3D model</div>
                        <div className="font-display text-3xl mt-1">{dish.name}</div>
                        <div className="text-xs text-gray-600">{dish.tenant?.name}</div>
                    </div>
                    <button onClick={onClose} className="text-sm font-bold" data-testid="super-upload-close">✕</button>
                </div>
                <label className="mt-6 block border-2 border-dashed border-black p-8 text-center cursor-pointer bg-[#FFF3E7] hover:bg-[#FFE9D0] transition-colors rounded-xl">
                    <input type="file" accept=".glb,.usdz,model/gltf-binary,model/vnd.usdz+zip" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="super-glb-input" />
                    <Cube size={36} weight="bold" className="mx-auto" />
                    <div className="font-display text-2xl mt-2">{file ? file.name : "Choose .glb or .usdz"}</div>
                    <div className="text-xs text-gray-600 mt-1">{file ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : "Max 25MB"}</div>
                </label>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="ghost-btn px-4 py-3 text-sm rounded-xl">Cancel</button>
                    <button onClick={submit} disabled={!file || uploading} className="brand-btn px-4 py-3 text-sm rounded-xl" data-testid="super-glb-submit">
                        {uploading ? "Uploading…" : "Publish → diner menu"}
                    </button>
                </div>
            </div>
        </div>
    );
}
