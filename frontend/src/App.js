import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import KDSPage from "./pages/KDSPage";
import DinerMenuPage from "./pages/DinerMenuPage";
import SuperAdminPage from "./pages/SuperAdminPage";

function Protected({ children, roles }) {
    const { user } = useAuth();
    if (user === undefined) {
        return (
            <div className="min-h-screen grid place-items-center bg-[#F9F8F6]">
                <div className="font-display text-3xl animate-pulse">Loading…</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    return children;
}

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/m/:slug" element={<DinerMenuPage />} />
                        <Route path="/dashboard" element={<Protected roles={["tenant_admin", "staff"]}><DashboardPage /></Protected>} />
                        <Route path="/kds" element={<Protected roles={["tenant_admin", "staff"]}><KDSPage /></Protected>} />
                        <Route path="/superadmin" element={<Protected roles={["super_admin"]}><SuperAdminPage /></Protected>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <Toaster richColors position="top-right" />
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
