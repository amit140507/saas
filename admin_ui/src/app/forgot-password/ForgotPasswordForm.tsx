"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, MailIcon } from "lucide-react";
import { AxiosError } from "axios";

import { requestPasswordReset } from "@/services/auth.service";

const RESET_SENT_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

function getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
        const detail = error.response?.data as { detail?: string; email?: string[] } | undefined;
        return detail?.detail || detail?.email?.[0] || "Unable to send reset email. Please try again.";
    }

    return "Unable to send reset email. Please try again.";
}

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            await requestPasswordReset(email.trim());
            setSuccess(true);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center bg-zinc-950 px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="mb-6 flex justify-center text-red-500">
                    <MailIcon size={48} />
                </div>
                <h2 className="text-center text-3xl font-bold leading-9 tracking-tight text-white">
                    Reset Admin Password
                </h2>
                <p className="mt-2 text-center text-sm text-zinc-500">
                    Enter your admin email to receive a reset link.
                </p>
            </div>

            <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl sm:mx-auto sm:w-full sm:max-w-sm">
                {success ? (
                    <div className="space-y-6">
                        <div className="rounded-md border border-emerald-900/50 bg-emerald-900/20 p-3 text-sm text-emerald-300">
                            {RESET_SENT_MESSAGE}
                        </div>
                        <Link
                            href="/login"
                            className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                            <ArrowLeftIcon size={16} />
                            Back to login
                        </Link>
                    </div>
                ) : (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
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
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="block w-full rounded-md border-0 bg-zinc-800 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                        >
                            {loading ? "Sending..." : "Send reset link"}
                        </button>

                        <Link
                            href="/login"
                            className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
                        >
                            <ArrowLeftIcon size={16} />
                            Back to login
                        </Link>
                    </form>
                )}
            </div>
        </div>
    );
}
