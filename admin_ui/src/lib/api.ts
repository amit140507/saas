import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";

interface TenantSession {
    accessToken?: string;
    tenantId?: string;
}

let isSigningOut = false;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

function withTrailingSlash(url?: string): string | undefined {
    if (!url || url.endsWith("/") || /^https?:\/\//i.test(url)) {
        return url;
    }

    const separatorIndex = url.search(/[?#]/);
    if (separatorIndex === -1) {
        return `${url}/`;
    }

    const path = url.slice(0, separatorIndex);
    const suffix = url.slice(separatorIndex);
    return path.endsWith("/") ? url : `${path}/${suffix}`;
}

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
    async (config) => {
        config.url = withTrailingSlash(config.url);
        const session = await getSession() as TenantSession | null;
        const token = session?.accessToken;
        const tenantId = session?.tenantId;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (tenantId) {
            config.headers["X-Tenant-Id"] = tenantId;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (
            typeof window !== "undefined" &&
            error.response?.status === 401 &&
            !isSigningOut &&
            window.location.pathname !== "/login"
        ) {
            isSigningOut = true;
            await signOut({ callbackUrl: "/login", redirect: false });
            window.location.assign("/login");
        }

        return Promise.reject(error);
    }
);

export default api;
