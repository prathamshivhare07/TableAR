import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, formatApiError } from "../lib/auth";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const nav = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const u = await login(email.trim(), password);
            toast.success(`Welcome back, ${u.name}`);
            if (u.role === "super_admin") nav("/superadmin");
            else nav("/dashboard");
        } catch (err) {
            toast.error(formatApiError(err, "Login failed"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#F9F8F6] grid md:grid-cols-2" data-testid="login-page">
            <div className="hidden md:flex flex-col justify-between p-10 bg-[#FC8019] text-black border-r-2 border-black">
                <Link to="/" className="font-display text-3xl" data-testid="login-brand">Table.AR</Link>
                <div>
                    <div className="font-display text-6xl leading-[0.9]">Welcome<br/>back, chef.</div>
                    <div className="mt-5 max-w-md text-black/80 font-medium">Every second between the diner and the kitchen matters. Log in and get back to firing tickets.</div>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-widest font-extrabold text-black/70 mb-2">Instant Demo Access</div>
                    <button
                        type="button"
                        onClick={() => { setEmail("demo@spice.co"); setPassword("demo123"); }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-black text-white hover:bg-black/85 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] shadow-sm"
                        data-testid="demo-quickfill-btn"
                    >
                        Fill Demo Login (demo@spice.co) →
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-center p-6 md:p-10">
                <form onSubmit={onSubmit} className="w-full max-w-md" data-testid="login-form">
                    <div className="text-xs uppercase tracking-widest font-extrabold text-[#FC8019]">Sign in</div>
                    <h1 className="font-display text-5xl mt-2">Log in.</h1>
                    <p className="mt-2 text-gray-700 text-sm">No account? <Link to="/register" className="underline font-bold" data-testid="link-register">Start free →</Link></p>

                    <label className="block mt-8">
                        <span className="text-xs uppercase tracking-widest font-extrabold">Email</span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-2 w-full px-4 py-3 hard-border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FC8019] transition-all"
                            data-testid="login-email-input"
                        />
                    </label>
                    <label className="block mt-5">
                        <span className="text-xs uppercase tracking-widest font-extrabold">Password</span>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-2 w-full px-4 py-3 hard-border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FC8019] transition-all"
                            data-testid="login-password-input"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="brand-btn w-full mt-8 px-6 py-4 rounded-xl active:scale-[0.98]"
                        data-testid="login-submit-btn"
                    >
                        {loading ? "Logging in…" : "Log in →"}
                    </button>
                </form>
            </div>
        </div>
    );
}
