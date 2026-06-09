import axios from "axios";
import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";

interface UserSession {
    accessToken?: string;
    tenantId?: string;
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
    async (config) => {
        const session = await getSession() as UserSession | null;
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

// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== "undefined" && error.response?.status === 401) {
            // NextAuth handles session expiration
        }
        return Promise.reject(error);
    }
);

export default api;
