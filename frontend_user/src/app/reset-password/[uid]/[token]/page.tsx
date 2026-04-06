"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

export default function ResetPasswordConfirmPage({ params }: { params: Promise<{ uid: string, token: string }> }) {
    const { uid, token } = use(params);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setMessage("");
        setError("");

        try {
            await axios.post(`${API_URL}auth/password/reset/confirm/`, {
                uid,
                token,
                new_password1: newPassword,
                new_password2: confirmPassword,
            });
            setMessage("Password reset successful! Redirecting to login...");
            setTimeout(() => router.push("/login"), 3000);
        } catch (err: any) {
            setError(err.response?.data?.detail || "An error occurred. The link may have expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
                <h2 className="text-3xl font-bold leading-9 tracking-tight text-zinc-900">
                    Set New Password
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                    Please enter your new password below.
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
                        <label htmlFor="new_password" title="New Password" className="block text-sm font-medium leading-6 text-zinc-900">
                            New Password
                        </label>
                        <div className="mt-2">
                            <input
                                id="new_password"
                                name="new_password"
                                type="password"
                                required
                                minLength={8}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirm_password" title="Confirm New Password" className="block text-sm font-medium leading-6 text-zinc-900">
                            Confirm Password
                        </label>
                        <div className="mt-2">
                            <input
                                id="confirm_password"
                                name="confirm_password"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
