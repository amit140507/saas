"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { UserIcon, MailIcon, ShieldIcon, BuildingIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

interface UserProfile {
    pk: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    tenant_details?: {
        name: string;
    };
}

export default function AdminProfilePage() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ username: "", email: "", first_name: "", last_name: "" });
    const [availability, setAvailability] = useState<{
        username: boolean | null | 'loading',
        email: boolean | null | 'loading'
    }>({
        username: null,
        email: null
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchUser = async () => {
        try {
            const response = await api.get("auth/user/");
            setUser(response.data);
            setEditData({
                username: response.data.username || "",
                email: response.data.email || "",
                first_name: response.data.first_name || "",
                last_name: response.data.last_name || "",
            });
        } catch (err: any) {
            setError("Failed to load profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    // Debounced availability check
    useEffect(() => {
        if (!isEditing) return;

        const timer = setTimeout(async () => {
            const checks: any = {};
            if (editData.username && editData.username !== user?.username) {
                checks.username = editData.username;
            }

            if (editData.email && editData.email !== user?.email) {
                checks.email = editData.email;
            }

            if (Object.keys(checks).length > 0) {
                if (checks.username) setAvailability(prev => ({ ...prev, username: 'loading' }));
                if (checks.email) setAvailability(prev => ({ ...prev, email: 'loading' }));
                try {
                    const response = await api.get("auth/check-availability/", { params: checks });
                    setAvailability(prev => ({
                        ...prev,
                        username: checks.username ? response.data.username_available : prev.username,
                        email: checks.email ? response.data.email_available : prev.email
                    }));
                } catch (err) {
                    console.error("Availability check failed", err);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [editData.username, editData.email, isEditing, user]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (availability.username === false || availability.email === false || availability.username === 'loading' || availability.email === 'loading') {
            setError("Please resolve availability issues before saving.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");
        try {
            const response = await api.patch("auth/user/", editData);
            setUser(response.data);
            setIsEditing(false);
            setSuccess("Admin profile updated successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            const backendError = err.response?.data;
            if (backendError) {
                const messages = Object.entries(backendError).map(([key, val]: any) => `${key}: ${val[0]}`).join(", ");
                setError(messages);
            } else {
                setError("Failed to update profile. Please check your details.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && !user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-zinc-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight transition-colors">
                        Admin Profile
                    </h2>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="mt-4 md:mt-0 inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition transition-colors"
                    >
                        Edit Profile
                    </button>
                )}
            </div>

            {success && (
                <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-md border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-1 transition-colors">
                    {success}
                </div>
            )}

            {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md border border-red-100 dark:border-red-800 transition-colors">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 shadow overflow-hidden sm:rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors">
                <div className="px-4 py-5 sm:px-6 flex items-center gap-x-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
                    <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center border-2 border-red-200 dark:border-red-800 transition-colors">
                        <UserIcon size={32} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-zinc-900 dark:text-zinc-100 transition-colors">{user?.username}</h3>
                        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 transition-colors">{user?.email}</p>
                    </div>
                </div>

                {isEditing ? (
                    <form onSubmit={handleUpdate} className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-5 sm:p-6 space-y-6 transition-colors">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <label htmlFor="username" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                                    Username
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        type="text"
                                        name="username"
                                        id="username"
                                        value={editData.username}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditData({ ...editData, username: val });
                                            setAvailability(prev => ({
                                                ...prev,
                                                username: val !== user?.username ? 'loading' : null
                                            }));
                                        }}
                                        className={`block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 bg-transparent shadow-sm ring-1 ring-inset  sm:text-sm sm:leading-6 transition-colors ${availability.username === true ? "ring-green-500 focus:ring-green-600 focus:ring-2" :
                                            availability.username === false ? "ring-red-500 focus:ring-red-600 focus:ring-2" : "ring-zinc-300 dark:ring-zinc-700 focus:ring-red-600 focus:ring-2"
                                            }`}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        {availability.username === 'loading' && <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />}
                                        {availability.username === true && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                                        {availability.username === false && <XCircleIcon className="h-5 w-5 text-red-500" />}
                                    </div>
                                </div>
                                {availability.username === false && <p className="mt-1 text-xs text-red-600 dark:text-red-400 transition-colors">Username is already taken.</p>}
                                {availability.username === true && <p className="mt-1 text-xs text-green-600 dark:text-green-400 transition-colors">Username is available!</p>}
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                                    Email
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        value={editData.email}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditData({ ...editData, email: val });
                                            setAvailability(prev => ({
                                                ...prev,
                                                email: val !== user?.email ? 'loading' : null
                                            }));
                                        }}
                                        className={`block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 bg-transparent shadow-sm ring-1 ring-inset sm:text-sm sm:leading-6 transition-colors ${availability.email === true ? "ring-green-500 focus:ring-green-600 focus:ring-2" :
                                            availability.email === false ? "ring-red-500 focus:ring-red-600 focus:ring-2" : "ring-zinc-300 dark:ring-zinc-700 focus:ring-red-600 focus:ring-2"
                                            }`}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        {availability.email === 'loading' && <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />}
                                        {availability.email === true && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                                        {availability.email === false && <XCircleIcon className="h-5 w-5 text-red-500" />}
                                    </div>
                                </div>
                                {availability.email === false && <p className="mt-1 text-xs text-red-600 dark:text-red-400 transition-colors">Email is already in use.</p>}
                                {availability.email === true && <p className="mt-1 text-xs text-green-600 dark:text-green-400 transition-colors">Email is available!</p>}
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="first_name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                                    First name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="first_name"
                                        id="first_name"
                                        value={editData.first_name}
                                        onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                                        className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 bg-transparent shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="last_name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                                    Last name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="last_name"
                                        id="last_name"
                                        value={editData.last_name}
                                        onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                                        className="block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 bg-transparent shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="rounded-md bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || availability.username === 'loading' || availability.email === 'loading' || availability.username === false || availability.email === false}
                                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition transition-colors disabled:opacity-50"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-5 sm:p-0 transition-colors">
                        <dl className="sm:divide-y sm:divide-zinc-200 dark:divide-zinc-800 transition-colors">
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2 transition-colors">
                                    <UserIcon size={16} /> Full name
                                </dt>
                                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 sm:mt-0 sm:col-span-2 transition-colors">
                                    {user?.first_name} {user?.last_name || ""}
                                </dd>
                            </div>
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2 transition-colors">
                                    <MailIcon size={16} /> Email address
                                </dt>
                                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 sm:mt-0 sm:col-span-2 transition-colors">{user?.email}</dd>
                            </div>
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2 transition-colors">
                                    <ShieldIcon size={16} /> Role
                                </dt>
                                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 sm:mt-0 sm:col-span-2 capitalize transition-colors">
                                    <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/10 dark:ring-red-400/20 transition-colors">
                                        {user?.role || "user"}
                                    </span>
                                </dd>
                            </div>
                            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2 transition-colors">
                                    <BuildingIcon size={16} /> Organization
                                </dt>
                                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 sm:mt-0 sm:col-span-2 transition-colors">
                                    {user?.tenant_details?.name || "Independent Account"}
                                </dd>
                            </div>
                        </dl>
                    </div>
                )}
            </div>
        </div>
    );
}
