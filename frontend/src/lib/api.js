import axios from "axios";

export const API_BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${API_BASE}/api`;

const TOKEN_KEY = "tabler_token";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
}

export const http = axios.create({ baseURL: API });
http.interceptors.request.use((cfg) => {
    const t = getToken();
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
});

export function formatApiError(err, fallback = "Something went wrong") {
    const d = err?.response?.data?.detail;
    if (!d) return err?.message || fallback;
    if (typeof d === "string") return d;
    if (Array.isArray(d))
        return d.map((e) => (e && e.msg) || JSON.stringify(e)).join(", ");
    if (d?.msg) return d.msg;
    return JSON.stringify(d);
}
