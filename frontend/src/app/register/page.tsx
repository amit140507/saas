"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        password_confirm: "",
        tenant_name: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.password_confirm) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await api.post("auth/registration/", {
                username: formData.username,
                email: formData.email,
                password1: formData.password,
                password2: formData.password_confirm,
                tenant_name: formData.tenant_name,
            });
            router.push("/login?registered=true");
        } catch (err: any) {
            console.error(err.response?.data);
            const errorData = err.response?.data;
            let errorMessage = "Registration failed. Please try again.";
            if (errorData) {
                const firstErrorKey = Object.keys(errorData)[0];
                const firstError = errorData[firstErrorKey];
                errorMessage = Array.isArray(firstError) ? firstError[0] : (firstError.detail || firstError);
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-zinc-900">
                    Create an account
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-white p-8 rounded-xl shadow-lg border border-zinc-200">
                <form className="space-y-6" onSubmit={handleRegister}>
                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium leading-6 text-zinc-900">
                            Username
                        </label>
                        <div className="mt-2">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-zinc-900">
                            Email address
                        </label>
                        <div className="mt-2">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="tenant_name" className="block text-sm font-medium leading-6 text-zinc-900">
                            Organization Name
                        </label>
                        <div className="mt-2">
                            <input
                                id="tenant_name"
                                name="tenant_name"
                                type="text"
                                required
                                value={formData.tenant_name}
                                onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="My Awesome Company"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" title="password" className="block text-sm font-medium leading-6 text-zinc-900">
                            Password
                        </label>
                        <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password_confirm" className="block text-sm font-medium leading-6 text-zinc-900">
                            Confirm Password
                        </label>
                        <div className="mt-2">
                            <input
                                id="password_confirm"
                                name="password_confirm"
                                type="password"
                                required
                                value={formData.password_confirm}
                                onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition"
                        >
                            {loading ? "Creating account..." : "Join Now"}
                        </button>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm text-zinc-500">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
