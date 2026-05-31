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
import { getFeatures } from "@/services/feature.service";
import type { Package, PackageFeaturePayload, PackagePayload, PackagePlanPayload } from "@/types/package.type";

type ModalMode = "create" | "edit";
type PackageForm = {
    name: string;
    description: string;
    max_freezes: string;
    is_active: boolean;
    features: PackageFeaturePayload[];
    plans: Array<Omit<PackagePlanPayload, "duration_in_days"> & { duration_in_days: string }>;
};

const createEmptyFeature = (): PackageFeaturePayload => ({
    name: "",
    code: "",
    description: "",
});

const createEmptyPlan = (): PackageForm["plans"][number] => ({
    name: "",
    price: "",
    duration_in_days: "30",
    is_active: true,
});

const emptyForm: PackageForm = {
    name: "",
    description: "",
    max_freezes: "0",
    is_active: true,
    features: [createEmptyFeature()],
    plans: [createEmptyPlan()],
};

function toForm(packageItem: Package): PackageForm {
    return {
        name: packageItem.name,
        description: packageItem.description || "",
        max_freezes: String(packageItem.max_freezes ?? 0),
        is_active: packageItem.is_active,
        features: packageItem.features.length
            ? packageItem.features.map((feature) => ({
                name: feature.feature_details.name,
                code: feature.feature_details.code,
                description: feature.feature_details.description || "",
            }))
            : [createEmptyFeature()],
        plans: packageItem.plans.length
            ? packageItem.plans.map((plan) => ({
                name: plan.name,
                price: plan.price,
                duration_in_days: plan.duration_in_days === null ? "" : String(plan.duration_in_days),
                is_active: plan.is_active,
            }))
            : [createEmptyPlan()],
    };
}

function slugifyFeatureCode(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
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

    const { data: featureCatalog = [], isLoading: isLoadingFeatures } = useQuery({
        queryKey: ["admin-package-features"],
        queryFn: getFeatures,
    });

    const refreshPackages = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
        queryClient.invalidateQueries({ queryKey: ["admin-package-features"] });
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

    const updateFeature = (index: number, field: keyof PackageFeaturePayload, value: string) => {
        setForm((current) => ({
            ...current,
            features: current.features.map((feature, featureIndex) => {
                if (featureIndex !== index) {
                    return feature;
                }

                const nextFeature = { ...feature, [field]: value };
                if (field === "name" && !feature.code.trim()) {
                    nextFeature.code = slugifyFeatureCode(value);
                }

                return nextFeature;
            }),
        }));
    };

    const selectExistingFeature = (index: number, code: string) => {
        const selectedFeature = featureCatalog.find((feature) => feature.code === code);
        if (!selectedFeature) {
            return;
        }

        setForm((current) => ({
            ...current,
            features: current.features.map((feature, featureIndex) => (
                featureIndex === index
                    ? {
                        name: selectedFeature.name,
                        code: selectedFeature.code,
                        description: selectedFeature.description || "",
                    }
                    : feature
            )),
        }));
    };

    const addFeature = () => {
        setForm((current) => ({ ...current, features: [...current.features, createEmptyFeature()] }));
    };

    const removeFeature = (index: number) => {
        setForm((current) => ({
            ...current,
            features: current.features.filter((_, featureIndex) => featureIndex !== index),
        }));
    };

    const updatePlan = <Field extends keyof PackageForm["plans"][number]>(
        index: number,
        field: Field,
        value: PackageForm["plans"][number][Field],
    ) => {
        setForm((current) => ({
            ...current,
            plans: current.plans.map((plan, planIndex) => (
                planIndex === index ? { ...plan, [field]: value } : plan
            )),
        }));
    };

    const addPlan = () => {
        setForm((current) => ({ ...current, plans: [...current.plans, createEmptyPlan()] }));
    };

    const removePlan = (index: number) => {
        setForm((current) => ({
            ...current,
            plans: current.plans.filter((_, planIndex) => planIndex !== index),
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const features = form.features
            .map((feature) => ({
                name: feature.name.trim(),
                code: slugifyFeatureCode(feature.code),
                description: feature.description.trim(),
            }))
            .filter((feature) => feature.name || feature.code || feature.description);

        const plans = form.plans.map((plan) => ({
            name: plan.name.trim(),
            price: plan.price.trim(),
            duration_in_days: plan.duration_in_days.trim() ? Number(plan.duration_in_days) : null,
            is_active: plan.is_active,
        }));

        const payload: PackagePayload = {
            name: form.name.trim(),
            description: form.description.trim(),
            max_freezes: Number(form.max_freezes),
            is_active: form.is_active,
            features,
            plans,
        };

        if (!payload.name) {
            setFormError("Package name is required.");
            return;
        }

        if (Number.isNaN(payload.max_freezes) || payload.max_freezes < 0) {
            setFormError("Max freezes must be zero or higher.");
            return;
        }

        if (payload.features.some((feature) => !feature.name || !feature.code)) {
            setFormError("Every feature must have a name and unique code.");
            return;
        }

        const featureCodes = payload.features.map((feature) => feature.code);
        if (new Set(featureCodes).size !== featureCodes.length) {
            setFormError("Feature codes must be unique.");
            return;
        }

        if (payload.plans.length === 0) {
            setFormError("At least one plan is required.");
            return;
        }

        if (payload.plans.some((plan) => !plan.name)) {
            setFormError("Every plan must have a name.");
            return;
        }

        if (payload.plans.some((plan) => !plan.price || Number.isNaN(Number(plan.price)) || Number(plan.price) < 0)) {
            setFormError("Every plan needs a price of zero or higher.");
            return;
        }

        if (payload.plans.some((plan) => plan.duration_in_days !== null && (!Number.isInteger(plan.duration_in_days) || plan.duration_in_days < 1))) {
            setFormError("Plan duration must be blank or at least one day.");
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
                                                                <div className="text-xs text-zinc-500">
                                                                    {plan.duration_in_days ? `${plan.duration_in_days} days` : "No fixed duration"}
                                                                </div>
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
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl">
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

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-73px)]">
                            {formError && (
                                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                                    {formError}
                                </div>
                            )}

                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Basic details
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                                </div>
                                <div>
                                    <label htmlFor="package-description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Description
                                    </label>
                                    <textarea
                                        id="package-description"
                                        value={form.description}
                                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                        className="mt-1 block min-h-20 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                    />
                                </div>
                                <label className="inline-flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                                        className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
                                    />
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active package</span>
                                </label>
                            </section>

                            <section className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        Package features
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addFeature}
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add Feature
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {form.features.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                                            No package features added.
                                        </div>
                                    ) : (
                                        form.features.map((feature, index) => (
                                            <div key={index} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Use existing feature</label>
                                                    <select
                                                        value={featureCatalog.some((catalogFeature) => catalogFeature.code === feature.code) ? feature.code : ""}
                                                        onChange={(event) => selectExistingFeature(index, event.target.value)}
                                                        disabled={isLoadingFeatures || featureCatalog.length === 0}
                                                        className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                                    >
                                                        <option value="">
                                                            {isLoadingFeatures
                                                                ? "Loading features..."
                                                                : featureCatalog.length === 0
                                                                    ? "No existing features"
                                                                    : "Select a tenant feature"}
                                                        </option>
                                                        {featureCatalog.map((catalogFeature) => (
                                                            <option key={catalogFeature.id} value={catalogFeature.code}>
                                                                {catalogFeature.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Feature name</label>
                                                        <input
                                                            type="text"
                                                            value={feature.name}
                                                            onChange={(event) => updateFeature(index, "name", event.target.value)}
                                                            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Feature code</label>
                                                        <input
                                                            type="text"
                                                            value={feature.code}
                                                            onChange={(event) => updateFeature(index, "code", event.target.value)}
                                                            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFeature(index)}
                                                        className="self-end p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Remove feature"
                                                    >
                                                        <Trash2Icon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description</label>
                                                    <input
                                                        type="text"
                                                        value={feature.description}
                                                        onChange={(event) => updateFeature(index, "description", event.target.value)}
                                                        className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            <section className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        Package plans
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addPlan}
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add Plan
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {form.plans.map((plan, index) => (
                                        <div key={index} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_0.9fr_0.8fr_auto] gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Plan name</label>
                                                    <input
                                                        type="text"
                                                        value={plan.name}
                                                        onChange={(event) => updatePlan(index, "name", event.target.value)}
                                                        className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Price</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={plan.price}
                                                        onChange={(event) => updatePlan(index, "price", event.target.value)}
                                                        className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Duration days</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={plan.duration_in_days}
                                                        onChange={(event) => updatePlan(index, "duration_in_days", event.target.value)}
                                                        className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-red-500"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removePlan(index)}
                                                    className="self-end p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                                                    title="Remove plan"
                                                    disabled={form.plans.length === 1}
                                                >
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <label className="inline-flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={plan.is_active}
                                                    onChange={(event) => updatePlan(index, "is_active", event.target.checked)}
                                                    className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
                                                />
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active plan</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </section>

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
