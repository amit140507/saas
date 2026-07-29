"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
    AlertCircleIcon,
    Building2Icon,
    CheckIcon,
    GlobeIcon,
    ImagePlusIcon,
    PaletteIcon,
    SaveIcon,
    ShieldAlertIcon,
    XIcon,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useCurrentUserPermissions } from "@/lib/permissions";
import { getOrganizationSettings, updateOrganizationSettings } from "@/services/organization.service";
import type { OrganizationSettings } from "@/types/organization.type";
import api from "@/lib/api";

const DEFAULT_BRAND_COLOR = "#EF4444";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const BRAND_COLOR_OPTIONS = [
    "#EF1F2D",
    "#D9346B",
    "#F45A0B",
    "#B01A55",
    "#6D43E6",
    "#4564E8",
    "#2284D6",
    "#0B8F9E",
    "#2F913A",
    "#07865E",
    "#343A40",
    "#765241",
] as const;

interface UserMembership {
    tenant_id: string;
    tenant_name: string;
    role: string | null;
    is_owner: boolean;
}

interface CurrentUserResponse {
    memberships?: UserMembership[];
}

function normalizeHexColor(value: string): string | null {
    const color = value.trim();
    if (!HEX_COLOR_PATTERN.test(color)) {
        return null;
    }

    const hexValue = color.slice(1);
    if (hexValue.length === 3) {
        return `#${hexValue.split("").map((char) => char + char).join("").toUpperCase()}`;
    }
    return `#${hexValue.toUpperCase()}`;
}

function readFieldError(data: unknown, field: string): string | null {
    if (!data || typeof data !== "object" || !(field in data)) {
        return null;
    }

    const value = (data as Record<string, unknown>)[field];
    if (Array.isArray(value) && value[0]) {
        return String(value[0]);
    }
    if (typeof value === "string" && value.trim()) {
        return value;
    }
    return null;
}

function getErrorMessage(error: unknown): string {
    if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
    ) {
        const data = error.response.data;
        const orderedFields = ["name", "slug", "logo", "website", "gstin", "brand_color"];
        for (const field of orderedFields) {
            const message = readFieldError(data, field);
            if (message) {
                return message;
            }
        }
    }
    return "Unable to save organization settings.";
}

function revokeObjectUrl(url: string | null) {
    if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
    }
}

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const { tenantId, sessionStatus } = useCurrentUserPermissions();
    const [organizationName, setOrganizationName] = useState<string | null>(null);
    const [brandColor, setBrandColor] = useState<string | null>(null);
    const [slug, setSlug] = useState<string | null>(null);
    const [website, setWebsite] = useState<string | null>(null);
    const [gstin, setGstin] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    const { data: currentUser, isLoading: userLoading } = useQuery<CurrentUserResponse>({
        queryKey: ["settings-current-user", tenantId],
        enabled: sessionStatus === "authenticated",
        queryFn: async () => {
            const response = await api.get<CurrentUserResponse>("auth/user/");
            return response.data;
        },
    });

    const currentMembership = useMemo(
        () => currentUser?.memberships?.find((membership) => membership.tenant_id === tenantId) || currentUser?.memberships?.[0],
        [currentUser?.memberships, tenantId],
    );
    const isOwner = Boolean(currentMembership?.is_owner);

    const {
        data: organization,
        isLoading: settingsLoading,
        isError: settingsFailed,
    } = useQuery<OrganizationSettings>({
        queryKey: ["organization-settings", tenantId],
        enabled: Boolean(tenantId) && isOwner,
        queryFn: () => getOrganizationSettings(tenantId as string),
    });

    useEffect(() => {
        return () => {
            revokeObjectUrl(logoPreviewUrl);
        };
    }, [logoPreviewUrl]);

    const activeBrandColor = brandColor ?? organization?.brand_color ?? DEFAULT_BRAND_COLOR;
    const activeOrganizationName = organizationName ?? organization?.name ?? "";
    const activeSlug = slug ?? organization?.slug ?? "";
    const activeWebsite = website ?? organization?.website ?? "";
    const activeGstin = gstin ?? organization?.gstin ?? "";
    const normalizedColor = normalizeHexColor(activeBrandColor);
    const normalizedSavedColor = organization?.brand_color ? normalizeHexColor(organization.brand_color) : null;
    const displayedLogo = removeLogo ? null : logoPreviewUrl || organization?.logo || null;

    const hasChanges = Boolean(
        organization &&
        normalizedColor &&
        (
            normalizedColor !== normalizedSavedColor ||
            activeOrganizationName.trim() !== organization.name ||
            activeSlug.trim() !== organization.slug ||
            activeWebsite.trim() !== (organization.website ?? "") ||
            activeGstin.trim() !== (organization.gstin ?? "") ||
            Boolean(logoFile) ||
            (removeLogo && Boolean(organization.logo))
        )
    );

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!tenantId || !normalizedColor) {
                throw new Error("A valid brand color is required.");
            }
            return updateOrganizationSettings(tenantId, {
                name: activeOrganizationName.trim(),
                slug: activeSlug.trim(),
                website: activeWebsite.trim(),
                gstin: activeGstin.trim(),
                brand_color: normalizedColor,
                logo: logoFile,
                remove_logo: removeLogo,
            });
        },
        onSuccess: (updatedOrganization) => {
            queryClient.setQueryData(["organization-settings", tenantId], updatedOrganization);
            setOrganizationName(null);
            setBrandColor(null);
            setSlug(null);
            setWebsite(null);
            setGstin(null);
            setLogoFile(null);
            setLogoPreviewUrl((currentLogoPreviewUrl) => {
                revokeObjectUrl(currentLogoPreviewUrl);
                return null;
            });
            setRemoveLogo(false);
            setSuccessMessage("Organization settings saved.");
            window.setTimeout(() => setSuccessMessage(""), 3000);
        },
    });

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSuccessMessage("");
        if (!normalizedColor) {
            return;
        }
        updateMutation.mutate();
    };

    const handleCancel = () => {
        setOrganizationName(null);
        setBrandColor(null);
        setSlug(null);
        setWebsite(null);
        setGstin(null);
        setLogoFile(null);
        setLogoPreviewUrl((currentLogoPreviewUrl) => {
            revokeObjectUrl(currentLogoPreviewUrl);
            return null;
        });
        setRemoveLogo(false);
        setSuccessMessage("");
        updateMutation.reset();
    };

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setLogoFile(file);
        setLogoPreviewUrl((currentLogoPreviewUrl) => {
            revokeObjectUrl(currentLogoPreviewUrl);
            return file ? URL.createObjectURL(file) : null;
        });
        if (file) {
            setRemoveLogo(false);
        }
    };

    if (sessionStatus === "loading" || userLoading) {
        return (
            <div className="mx-auto max-w-5xl py-10">
                <div className="h-8 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-8 h-96 animate-pulse rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="mx-auto max-w-5xl py-10">
                <div className="rounded-lg border border-zinc-200 bg-white p-8 text-zinc-900 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            <ShieldAlertIcon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Only the organization owner can edit organization settings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Settings</h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Manage organization details for {organization?.name || currentMembership?.tenant_name || "your organization"}.
                </p>
            </div>

            {successMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <CheckIcon className="h-4 w-4" aria-hidden="true" />
                    {successMessage}
                </div>
            )}

            {settingsFailed && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircleIcon className="h-4 w-4" aria-hidden="true" />
                    Failed to load organization settings.
                </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-4 py-5 sm:px-6 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            <Building2Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Organization profile</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Update your public identity, website, tax id, and branding.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 px-4 py-6 sm:p-6">
                    {settingsLoading ? (
                        <div className="space-y-4">
                            <div className="h-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="organization-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Organization name
                                        </label>
                                        <input
                                            id="organization-name"
                                            type="text"
                                            value={activeOrganizationName}
                                            onChange={(event) => setOrganizationName(event.target.value)}
                                            required
                                            maxLength={255}
                                            className="mt-2 block h-10 w-full rounded-md border-0 bg-transparent px-3 text-sm text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-red-600 dark:text-zinc-100 dark:ring-zinc-700"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="organization-slug" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Slug
                                        </label>
                                        <input
                                            id="organization-slug"
                                            type="text"
                                            value={activeSlug}
                                            onChange={(event) => setSlug(event.target.value)}
                                            placeholder="iron-gym"
                                            className="mt-2 block h-10 w-full rounded-md border-0 bg-transparent px-3 text-sm text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-red-600 dark:text-zinc-100 dark:ring-zinc-700"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="organization-gstin" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            GSTIN
                                        </label>
                                        <input
                                            id="organization-gstin"
                                            type="text"
                                            value={activeGstin}
                                            onChange={(event) => setGstin(event.target.value.toUpperCase())}
                                            placeholder="22AAAAA0000A1Z5"
                                            maxLength={15}
                                            className="mt-2 block h-10 w-full rounded-md border-0 bg-transparent px-3 text-sm text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-red-600 dark:text-zinc-100 dark:ring-zinc-700"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="organization-website" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Website
                                        </label>
                                        <div className="relative mt-2">
                                            <GlobeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                                            <input
                                                id="organization-website"
                                                type="url"
                                                value={activeWebsite}
                                                onChange={(event) => setWebsite(event.target.value)}
                                                placeholder="https://www.example.com"
                                                className="block h-10 w-full rounded-md border-0 bg-transparent pl-10 pr-3 text-sm text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-red-600 dark:text-zinc-100 dark:ring-zinc-700"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
                                    <div className="flex items-center gap-2">
                                        <ImagePlusIcon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Logo</h3>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Upload a square image for the cleanest result.
                                    </p>

                                    <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                                        {displayedLogo ? (
                                            <Image
                                                src={displayedLogo}
                                                alt="Organization logo preview"
                                                width={320}
                                                height={176}
                                                unoptimized
                                                className="h-44 w-full object-contain"
                                            />
                                        ) : (
                                            <div className="flex h-44 items-center justify-center text-sm text-zinc-400">
                                                No logo uploaded
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <label
                                            htmlFor="organization-logo"
                                            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                        >
                                            <ImagePlusIcon className="h-4 w-4" aria-hidden="true" />
                                            {logoFile ? "Replace logo" : "Upload logo"}
                                        </label>
                                        <input
                                            id="organization-logo"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="sr-only"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLogoFile(null);
                                                setLogoPreviewUrl((currentLogoPreviewUrl) => {
                                                    revokeObjectUrl(currentLogoPreviewUrl);
                                                    return null;
                                                });
                                                setRemoveLogo(true);
                                            }}
                                            disabled={!displayedLogo}
                                            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                                        >
                                            <XIcon className="h-4 w-4" aria-hidden="true" />
                                            Remove logo
                                        </button>
                                    </div>

                                    {logoFile && (
                                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{logoFile.name}</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                            <PaletteIcon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Brand color</h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Primary color used for organization branding.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 px-4 py-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                            Brand colour
                                        </label>
                                        <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label="Brand colour">
                                            {BRAND_COLOR_OPTIONS.map((color) => {
                                                const isSelected = normalizedColor === color;

                                                return (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setBrandColor(color)}
                                                        className={cn(
                                                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900",
                                                            isSelected
                                                                ? "bg-white ring-2 ring-zinc-300 ring-offset-1 dark:bg-zinc-900 dark:ring-zinc-500"
                                                                : "hover:scale-105",
                                                        )}
                                                        role="radio"
                                                        aria-checked={isSelected}
                                                        aria-label={`Use ${color} as brand colour`}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "h-9 w-9 rounded-full border transition",
                                                                isSelected ? "border-white shadow-sm" : "border-transparent",
                                                            )}
                                                            style={{ backgroundColor: color }}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                            Used on your buttons and on the plan pages your clients see.
                                        </p>
                                    </div>

                                    <div className="max-w-xs">
                                        <label htmlFor="brand-color-hex" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Hex value
                                        </label>
                                        <div className="mt-2 flex items-center gap-3">
                                            <span
                                                className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 shadow-inner dark:border-zinc-700"
                                                style={{ backgroundColor: normalizedColor || DEFAULT_BRAND_COLOR }}
                                                aria-label="Selected brand colour preview"
                                            />
                                            <input
                                                id="brand-color-hex"
                                                type="text"
                                                value={activeBrandColor}
                                                onChange={(event) => setBrandColor(event.target.value)}
                                                placeholder="#EF4444"
                                                maxLength={7}
                                                className={cn(
                                                    "block h-10 w-full rounded-md border-0 bg-transparent px-3 text-sm text-zinc-900 shadow-sm ring-1 ring-inset transition-colors placeholder:text-zinc-400 focus:ring-2 focus:ring-inset dark:text-zinc-100",
                                                    normalizedColor
                                                        ? "ring-zinc-300 focus:ring-red-600 dark:ring-zinc-700"
                                                        : "ring-red-500 focus:ring-red-600",
                                                )}
                                            />
                                        </div>
                                        {!normalizedColor && (
                                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                                Use #RGB or #RRGGBB format.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {updateMutation.isError && (
                        <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                            <AlertCircleIcon className="h-4 w-4" aria-hidden="true" />
                            {getErrorMessage(updateMutation.error)}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-6">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={updateMutation.isPending || !hasChanges}
                        className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                    >
                        <XIcon className="h-4 w-4" aria-hidden="true" />
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={updateMutation.isPending || !hasChanges || !normalizedColor}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <SaveIcon className="h-4 w-4" aria-hidden="true" />
                        {updateMutation.isPending ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}
