"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { LockIcon, ArrowLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        old_password: "",
        new_password1: "",
        new_password2: "",
    });
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new1: false,
        new2: false,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side validation
        const newErrors: Record<string, string> = {};
        if (!form.old_password) newErrors.old_password = "Current password is required.";
        if (form.new_password1.length < 8) newErrors.new_password1 = "Password must be at least 8 characters.";
        if (form.new_password1 !== form.new_password2) newErrors.new_password2 = "Passwords do not match.";
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setLoading(true);
        setErrors({});
        try {
            await api.post("auth/password/change/", form);
            setSuccess("Password changed successfully!");
            setTimeout(() => router.push("/dashboard/profile"), 2000);
        } catch (err: any) {
            const data = err.response?.data;
            if (data) {
                const mapped: Record<string, string> = {};
                for (const [key, val] of Object.entries(data)) {
                    mapped[key] = Array.isArray(val) ? (val as string[]).join(" ") : String(val);
                }
                setErrors(mapped);
            } else {
                setErrors({ non_field_errors: "Something went wrong. Please try again." });
            }
        } finally {
            setLoading(false);
        }
    };

    const Toggle = ({ field }: { field: "old" | "new1" | "new2" }) => (
        <button
            type="button"
            onClick={() => setShowPasswords((p) => ({ ...p, [field]: !p[field] }))}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            tabIndex={-1}
        >
            {showPasswords[field] ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
    );

    return (
        <div className="max-w-lg mx-auto py-10">
            <div className="mb-6">
                <Link
                    href="/dashboard/profile"
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                >
                    <ArrowLeftIcon size={14} /> Back to Profile
                </Link>
            </div>

            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <LockIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Change Password</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Update your account password</p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 shadow sm:rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                {success && (
                    <div className="mb-6 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm p-3 rounded-md border border-green-200 dark:border-green-800">
                        {success} Redirecting…
                    </div>
                )}
                {errors.non_field_errors && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md border border-red-100 dark:border-red-800">
                        {errors.non_field_errors}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Current Password */}
                    <div>
                        <label htmlFor="old_password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                id="old_password"
                                name="old_password"
                                type={showPasswords.old ? "text" : "password"}
                                value={form.old_password}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-zinc-900 dark:text-zinc-100 bg-transparent shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${errors.old_password
                                        ? "ring-red-500 focus:ring-red-600"
                                        : "ring-zinc-300 dark:ring-zinc-700 focus:ring-indigo-600"
                                    }`}
                            />
                            <Toggle field="old" />
                        </div>
                        {errors.old_password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.old_password}</p>}
                    </div>

                    {/* New Password */}
                    <div>
                        <label htmlFor="new_password1" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                id="new_password1"
                                name="new_password1"
                                type={showPasswords.new1 ? "text" : "password"}
                                value={form.new_password1}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-zinc-900 dark:text-zinc-100 bg-transparent shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${errors.new_password1
                                        ? "ring-red-500 focus:ring-red-600"
                                        : "ring-zinc-300 dark:ring-zinc-700 focus:ring-indigo-600"
                                    }`}
                            />
                            <Toggle field="new1" />
                        </div>
                        {errors.new_password1 && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.new_password1}</p>}
                    </div>

                    {/* Confirm New Password */}
                    <div>
                        <label htmlFor="new_password2" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                id="new_password2"
                                name="new_password2"
                                type={showPasswords.new2 ? "text" : "password"}
                                value={form.new_password2}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-zinc-900 dark:text-zinc-100 bg-transparent shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${errors.new_password2
                                        ? "ring-red-500 focus:ring-red-600"
                                        : "ring-zinc-300 dark:ring-zinc-700 focus:ring-indigo-600"
                                    }`}
                            />
                            <Toggle field="new2" />
                        </div>
                        {errors.new_password2 && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.new_password2}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Link
                            href="/dashboard/profile"
                            className="flex-1 text-center rounded-md bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition disabled:opacity-50"
                        >
                            {loading ? "Saving…" : "Change Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
