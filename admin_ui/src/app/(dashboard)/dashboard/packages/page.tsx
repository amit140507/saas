"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircleIcon,
    EditIcon,
    Loader2Icon,
    PackageIcon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
    XIcon,
} from "lucide-react";

import {
    createPackage,
    deletePackage,
    getPackages,
    updatePackage,
} from "@/services/package.service";
import type { Package, PackagePayload } from "@/types/package.type";

type ModalMode = "create" | "edit";

const emptyForm = {
    name: "",
    description: "",
    max_freezes: "0",
    is_active: true,
};

function toForm(packageItem: Package) {
    return {
        name: packageItem.name,
        description: packageItem.description || "",
        max_freezes: String(packageItem.max_freezes ?? 0),
        is_active: packageItem.is_active,
    };
}

function formatCurrency(value: string) {
    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatCycle(value: string) {
    return value.replace("-", " ");
}

export default function PackagesPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
    const [formError, setFormError] = useState("");
    const [form, setForm] = useState(emptyForm);

    const { data: packages = [], isLoading, error } = useQuery({
        queryKey: ["admin-packages"],
        queryFn: getPackages,
    });

    const refreshPackages = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
    };

    const createMutation = useMutation({
        mutationFn: createPackage,
        onSuccess: () => {
            refreshPackages();
            closeModal();
        },
        onError: () => setFormError("Could not create package. Please check the details and try again."),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: PackagePayload }) => updatePackage(id, payload),
        onSuccess: () => {
            refreshPackages();
            closeModal();
        },
        onError: () => setFormError("Could not update package. Please check the details and try again."),
    });

    const deleteMutation = useMutation({
        mutationFn: deletePackage,
        onSuccess: () => {
            refreshPackages();
            setPackageToDelete(null);
        },
    });

    const filteredPackages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return packages;
        }

        return packages.filter((packageItem) => {
            const description = packageItem.description || "";
            return (
                packageItem.name.toLowerCase().includes(query) ||
                description.toLowerCase().includes(query)
            );
        });
    }, [packages, searchQuery]);

    const stats = {
        total: packages.length,
        active: packages.filter((packageItem) => packageItem.is_active).length,
        plans: packages.reduce((count, packageItem) => count + packageItem.plans.length, 0),
    };

    const openCreateModal = () => {
        setModalMode("create");
        setSelectedPackage(null);
        setForm(emptyForm);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEditModal = (packageItem: Package) => {
        setModalMode("edit");
        setSelectedPackage(packageItem);
        setForm(toForm(packageItem));
        setFormError("");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedPackage(null);
        setForm(emptyForm);
        setFormError("");
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload: PackagePayload = {
            name: form.name.trim(),
            description: form.description.trim(),
            max_freezes: Number(form.max_freezes),
            is_active: form.is_active,
        };

        if (!payload.name) {
            setFormError("Package name is required.");
            return;
        }

        if (Number.isNaN(payload.max_freezes) || payload.max_freezes < 0) {
            setFormError("Max freezes must be zero or higher.");
            return;
        }

        if (modalMode === "edit" && selectedPackage) {
            updateMutation.mutate({ id: selectedPackage.id, payload });
            return;
        }

        createMutation.mutate(payload);
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <PackageIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
                        Packages
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Manage membership tiers and package availability.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreateModal}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Package
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Total packages", value: stats.total },
                    { label: "Active packages", value: stats.active },
                    { label: "Linked plans", value: stats.plans },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
                    >
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</div>
                        <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{item.value}</div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center text-sm">
                <div className="relative w-full md:w-96">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search packages..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-red-500 text-zinc-900 dark:text-white transition-colors"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-500 font-semibold transition-colors">
                                <th className="px-6 py-4">Package</th>
                                <th className="px-6 py-4">Plans</th>
                                <th className="px-6 py-4">Max freezes</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                                        <div className="flex justify-center">
                                            <Loader2Icon className="animate-spin text-red-600 w-8 h-8" />
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                                        Error loading packages. Please try again.
                                    </td>
                                </tr>
                            ) : filteredPackages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                                        {searchQuery ? "No matching packages found." : "No packages found. Add one above."}
                                    </td>
                                </tr>
                            ) : (
                                filteredPackages.map((packageItem) => (
                                    <tr key={packageItem.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-6 py-4 min-w-72">
                                            <div className="font-semibold text-zinc-900 dark:text-white text-base">
                                                {packageItem.name}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                                                {packageItem.description || "No description"}
                                            </div>
                                            {packageItem.features.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {packageItem.features.map((feature) => (
                                                        <span
                                                            key={feature.id}
                                                            className="rounded-md bg-zinc-100 dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400"
                                                        >
                                                            {feature.feature_details.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 min-w-64">
                                            {packageItem.plans.length === 0 ? (
                                                <span className="text-zinc-400">No plans</span>
                                            ) : (
                                                <div className="space-y-2">
                                                    {packageItem.plans.map((plan) => (
                                                        <div key={plan.id} className="flex items-center justify-between gap-4">
                                                            <div>
                                                                <div className="font-medium text-zinc-900 dark:text-white">{plan.name}</div>
                                                                <div className="text-xs text-zinc-500 capitalize">{formatCycle(plan.billing_cycle)}</div>
                                                            </div>
                                                            <div className="font-semibold text-zinc-900 dark:text-white">
                                                                {formatCurrency(plan.price)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{packageItem.max_freezes}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                                                packageItem.is_active
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                            }`}>
                                                {packageItem.is_active && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                                {packageItem.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(packageItem)}
                                                    className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Edit package"
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPackageToDelete(packageItem)}
                                                    className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete package"
                                                >
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-xl rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                {modalMode === "edit" ? "Edit Package" : "Add Package"}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                title="Close"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {formError && (
                                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label htmlFor="package-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Name
                                </label>
                                <input
                                    id="package-name"
                                    type="text"
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="package-description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Description
                                </label>
                                <textarea
                                    id="package-description"
                                    value={form.description}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    className="mt-1 block min-h-24 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="max-freezes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Max freezes
                                    </label>
                                    <input
                                        id="max-freezes"
                                        type="number"
                                        min="0"
                                        value={form.max_freezes}
                                        onChange={(event) => setForm((current) => ({ ...current, max_freezes: event.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                    />
                                </div>
                                <label className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 mt-6 sm:mt-0">
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                                        className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
                                    />
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active package</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 inline-flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2Icon className="w-4 h-4 animate-spin" />}
                                    {modalMode === "edit" ? "Save Changes" : "Create Package"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {packageToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Delete package?</h2>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            This will remove {packageToDelete.name}. Existing linked plans or orders may prevent deletion.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setPackageToDelete(null)}
                                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate(packageToDelete.id)}
                                disabled={deleteMutation.isPending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 inline-flex items-center gap-2"
                            >
                                {deleteMutation.isPending && <Loader2Icon className="w-4 h-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
