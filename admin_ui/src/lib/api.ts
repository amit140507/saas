import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
    async (config) => {
        const session = await getSession();
        const token = (session as any)?.accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
        if (typeof window !== "undefined" && error.response?.status === 401) {
            await signOut({ callbackUrl: "/login", redirect: true });
        }

        return Promise.reject(error);
    }
);

export default api;
