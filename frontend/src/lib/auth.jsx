import React, { createContext, useContext, useEffect, useState } from "react";
import { http, setToken, getToken, formatApiError } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined); // undefined = loading

    useEffect(() => {
        if (!getToken()) {
            setUser(null);
            return;
        }
        http.get("/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => {
                setToken(null);
                setUser(null);
            });
    }, []);

    async function login(email, password) {
        const { data } = await http.post("/auth/login", { email, password });
        setToken(data.token);
        setUser(data.user);
        return data.user;
    }
    async function register(payload) {
        const { data } = await http.post("/auth/register", payload);
        setToken(data.token);
        setUser(data.user);
        return data.user;
    }
    function logout() {
        setToken(null);
        setUser(null);
    }
    return (
        <AuthCtx.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthCtx.Provider>
    );
}

export function useAuth() {
    return useContext(AuthCtx);
}
export { formatApiError };
