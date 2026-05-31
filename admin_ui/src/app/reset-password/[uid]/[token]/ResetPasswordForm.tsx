"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, KeyRoundIcon } from "lucide-react";
import { AxiosError } from "axios";

import { confirmPasswordReset } from "@/services/auth.service";

interface ResetPasswordFormProps {
    uid: string;
    token: string;
}

function firstMessage(value: unknown): string | undefined {
    if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
    }

    if (typeof value === "string") {
        return value;
    }

    return undefined;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
        const data = error.response?.data as Record<string, unknown> | undefined;
        return (
            firstMessage(data?.new_password1) ||
            firstMessage(data?.new_password2) ||
            firstMessage(data?.token) ||
            firstMessage(data?.uid) ||
            firstMessage(data?.detail) ||
            "Unable to reset password. Please request a new link."
        );
    }

    return "Unable to reset password. Please request a new link.";
}

export default function ResetPasswordForm({ uid, token }: ResetPasswordFormProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await confirmPasswordReset({
                uid,
                token,
                new_password1: password,
                new_password2: confirmPassword,
            });
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
                    <KeyRoundIcon size={48} />
                </div>
                <h2 className="text-center text-3xl font-bold leading-9 tracking-tight text-white">
                    Create New Password
                </h2>
                <p className="mt-2 text-center text-sm text-zinc-500">
                    Choose a strong password for your admin account.
                </p>
            </div>

            <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl sm:mx-auto sm:w-full sm:max-w-sm">
                {success ? (
                    <div className="space-y-6">
                        <div className="rounded-md border border-emerald-900/50 bg-emerald-900/20 p-3 text-sm text-emerald-300">
                            Your password has been reset. You can now sign in with the new password.
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
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-zinc-300">
                                New Password
                            </label>
                            <div className="mt-2">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="block w-full rounded-md border-0 bg-zinc-800 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-zinc-300">
                                Confirm Password
                            </label>
                            <div className="mt-2">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    className="block w-full rounded-md border-0 bg-zinc-800 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                        >
                            {loading ? "Resetting..." : "Reset password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
