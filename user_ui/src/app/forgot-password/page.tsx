"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            await axios.post(`${API_URL}auth/password/reset/`, { email });
            setMessage("Check your email for a link to reset your password.");
        } catch (err: any) {
            setError(err.response?.data?.detail || "An error occurred. Please check your email address.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-zinc-900">
                    Forgot Password
                </h2>
                <p className="mt-2 text-center text-sm text-zinc-600">
                    Enter your email to receive a password reset link.
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-white p-8 rounded-xl shadow-lg border border-zinc-200">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {message && (
                        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md border border-green-100">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}
                    
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
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm text-zinc-500">
                    Remember your password?{" "}
                    <Link href="/login" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
                        Back to sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
