"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Cookies from "js-cookie";
import { ShieldAlertIcon } from "lucide-react";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            // Assuming same endpoint but maybe different role check on backend
            const response = await api.post("auth/login/", { username: email, password });
            const { access, refresh } = response.data;

            // We could check if the user is actually an admin here if the backend returns roles
            // For now, we'll just set the admin tokens
            Cookies.set("admin_access_token", access);
            Cookies.set("admin_refresh_token", refresh);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.non_field_errors?.[0] || "Invalid admin credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-950">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="flex justify-center mb-6 text-red-500">
                    <ShieldAlertIcon size={48} />
                </div>
                <h2 className="text-center text-3xl font-bold leading-9 tracking-tight text-white">
                    Admin Control Center
                </h2>
                <p className="mt-2 text-center text-sm text-zinc-500">
                    Authorized personnel only.
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800">
                <form className="space-y-6" onSubmit={handleLogin}>
                    {error && (
                        <div className="bg-red-900/20 text-red-400 text-sm p-3 rounded-md border border-red-900/50">
                            {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-zinc-300">
                            Admin Email
                        </label>
                        <div className="mt-2">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 px-3 bg-zinc-800 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" title="password" className="block text-sm font-medium leading-6 text-zinc-300">
                            Password
                        </label>
                        <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 px-3 bg-zinc-800 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 transition"
                        >
                            {loading ? "Verifying..." : "Access Console"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
