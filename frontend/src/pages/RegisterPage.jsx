import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, formatApiError } from "../lib/auth";

function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export default function RegisterPage() {
    const [form, setForm] = useState({
        restaurant_name: "",
        name: "",
        email: "",
        password: "",
        slug: "",
    });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const nav = useNavigate();

    function update(k, v) {
        setForm((f) => {
            const next = { ...f, [k]: v };
            if (k === "restaurant_name" && !f.slug) next.slug = slugify(v);
            return next;
        });
    }

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            await register({ ...form, slug: form.slug || slugify(form.restaurant_name) });
            toast.success("Welcome to Tabler.AR");
            nav("/dashboard");
        } catch (err) {
            toast.error(formatApiError(err, "Registration failed"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#F9F8F6] grid md:grid-cols-2" data-testid="register-page">
            <div className="hidden md:flex flex-col justify-between p-10 bg-black text-white border-r-2 border-black">
                <Link to="/" className="font-display text-3xl">Tabler<span className="text-[#FC8019]">.AR</span></Link>
                <div>
                    <div className="font-display text-6xl leading-[0.9]">Start<br/>in <span className="text-[#FC8019]">10 min.</span></div>
                    <div className="mt-5 max-w-md text-white/80 font-medium">Register your restaurant, get a public menu URL, drop QR codes on tables, and start plating.</div>
                </div>
                <div className="text-xs uppercase tracking-widest font-bold text-white/60">No credit card required.</div>
            </div>
            <div className="flex items-center justify-center p-6 md:p-10">
                <form onSubmit={onSubmit} className="w-full max-w-md" data-testid="register-form">
                    <div className="text-xs uppercase tracking-widest font-extrabold text-[#FC8019]">Create account</div>
                    <h1 className="font-display text-5xl mt-2">Register.</h1>
                    <p className="mt-2 text-gray-700 text-sm">Already a merchant? <Link to="/login" className="underline font-bold" data-testid="link-login">Log in →</Link></p>

                    <label className="block mt-6">
                        <span className="text-xs uppercase tracking-widest font-extrabold">Restaurant name</span>
                        <input required value={form.restaurant_name} onChange={(e) => update("restaurant_name", e.target.value)}
                            className="mt-2 w-full px-4 py-3 hard-border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FC8019] transition-all"
                            data-testid="register-restaurant-input" />
                    </label>
                    <label className="block mt-4">
                        <span className="text-xs uppercase tracking-widest font-extrabold">Public URL slug</span>
                        <div className="mt-2 flex items-stretch hard-border bg-white rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#FC8019] transition-all">
                            <span className="px-3 flex items-center text-sm text-gray-500 border-r-2 border-black bg-[#FFF3E7] font-mono">/m/</span>
                            <input required value={form.slug} onChange={(e) => update("slug", slugify(e.target.value))}
                                className="flex-1 px-4 py-3 focus:outline-none bg-transparent" data-testid="register-slug-input" />
                        </div>
                    </label>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <label className="block">
                            <span className="text-xs uppercase tracking-widest font-extrabold">Your name</span>
                            <input required value={form.name} onChange={(e) => update("name", e.target.value)}
                                className="mt-2 w-full px-4 py-3 hard-border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FC8019] transition-all"
                                data-testid="register-name-input" />
                        </label>
                        <label className="block">
                            <span className="text-xs uppercase tracking-widest font-extrabold">Email</span>
                            <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)}
                                className="mt-2 w-full px-4 py-3 hard-border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FC8019] transition-all"
                                data-testid="register-email-input" />
                        </label>
                    </div>
                    <label className="block mt-4">
                        <span className="text-xs uppercase tracking-widest font-extrabold">Password (min 6 chars)</span>
                        <input type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)}
                            className="mt-2 w-full px-4 py-3 hard-border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FC8019] transition-all"
                            data-testid="register-password-input" />
                    </label>
                    <button type="submit" disabled={loading} className="brand-btn w-full mt-8 px-6 py-4 rounded-xl active:scale-[0.98]" data-testid="register-submit-btn">
                        {loading ? "Creating your restaurant…" : "Launch my restaurant →"}
                    </button>
                </form>
            </div>
        </div>
    );
}
