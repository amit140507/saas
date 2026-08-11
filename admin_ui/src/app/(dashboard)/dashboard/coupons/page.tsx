"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircleIcon,
    EditIcon,
    EyeIcon,
    Loader2Icon,
    PlusIcon,
    SearchIcon,
    TicketPercentIcon,
    Trash2Icon,
} from "lucide-react";

import {
    createCoupon,
    deleteCoupon,
    getCoupons,
    updateCoupon,
} from "@/services/coupon.service";
import type { Coupon, CouponPayload } from "@/types/coupon.type";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell } from "@/components/ui/page";
import { can, PERMISSIONS, useCurrentUserPermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { CouponFormModal, couponToForm, emptyCouponForm } from "./_components/CouponFormModal";

type ModalMode = "create" | "edit";

function formatDate(value: string | null) {
    if (!value) {
        return "Not set";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function getDiscountLabel(coupon: Coupon) {
    const value = Number(coupon.discount_value);
    if (coupon.discount_type === "percent") {
        return `${Number.isNaN(value) ? coupon.discount_value : value}%`;
    }
    if (coupon.discount_type === "free_shipping") {
        return "Free shipping";
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);
}

export default function CouponsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
    const [form, setForm] = useState(emptyCouponForm);
    const [formError, setFormError] = useState("");
    const { userPermissions } = useCurrentUserPermissions();
    const canManageCoupons = can(userPermissions, PERMISSIONS.MANAGE_ORDERS);

    const { data: coupons = [], isLoading, error } = useQuery({
        queryKey: ["admin-coupons"],
        queryFn: getCoupons,
    });

    const refreshCoupons = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedCoupon(null);
        setForm(emptyCouponForm);
        setFormError("");
    };

    const createMutation = useMutation({
        mutationFn: createCoupon,
        onSuccess: () => {
            refreshCoupons();
            closeModal();
        },
        onError: () => setFormError("Could not create coupon. Please check the details and try again."),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: CouponPayload }) => updateCoupon(id, payload),
        onSuccess: () => {
            refreshCoupons();
            closeModal();
        },
        onError: () => setFormError("Could not update coupon. Please check the details and try again."),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCoupon,
        onSuccess: () => {
            refreshCoupons();
            setCouponToDelete(null);
        },
    });

    const filteredCoupons = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return coupons;
        }

        return coupons.filter((coupon) => (
            coupon.code.toLowerCase().includes(query) ||
            (coupon.description || "").toLowerCase().includes(query)
        ));
    }, [coupons, searchQuery]);

    const stats = {
        total: coupons.length,
        active: coupons.filter((coupon) => coupon.is_active).length,
        used: coupons.reduce((count, coupon) => count + coupon.usage_count, 0),
    };

    const openCreateModal = () => {
        setModalMode("create");
        setSelectedCoupon(null);
        setForm(emptyCouponForm);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEditModal = (coupon: Coupon) => {
        setModalMode("edit");
        setSelectedCoupon(coupon);
        setForm(couponToForm(coupon));
        setFormError("");
        setIsModalOpen(true);
    };

    const handleSubmit = (payload: CouponPayload) => {
        setFormError("");
        if (modalMode === "edit" && selectedCoupon) {
            updateMutation.mutate({ id: selectedCoupon.id, payload });
            return;
        }
        createMutation.mutate(payload);
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <PageShell>
            <PageHeader
                title="Coupons"
                description="Manage promo codes and discount availability."
                icon={TicketPercentIcon}
                actions={canManageCoupons && (
                    <Button type="button" onClick={openCreateModal}>
                        <PlusIcon className="h-5 w-5" />
                        Create Coupon
                    </Button>
                )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                    { label: "Total coupons", value: stats.total },
                    { label: "Active coupons", value: stats.active },
                    { label: "Total uses", value: stats.used },
                ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-border bg-card p-4">
                        <div className="text-sm text-muted-foreground">{item.label}</div>
                        <div className="mt-2 text-2xl font-bold text-foreground">{item.value}</div>
                    </div>
                ))}
            </div>

            <div className="relative w-full md:w-96">
                <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search coupons..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm md:block">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                                <th className="px-6 py-4">Coupon code</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Discount</th>
                                <th className="px-6 py-4">Start date</th>
                                <th className="px-6 py-4">End date</th>
                                <th className="px-6 py-4">Usage</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-primary" />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-red-500">
                                        Error loading coupons. Please try again.
                                    </td>
                                </tr>
                            ) : filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                                        {searchQuery ? "No matching coupons found." : "No coupons found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-foreground">{coupon.code}</div>
                                        </td>
                                        <td className="max-w-72 px-6 py-4">
                                            <div className="line-clamp-2 text-foreground">{coupon.description || "No description"}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{getDiscountLabel(coupon)}</td>
                                        <td className="px-6 py-4">{formatDate(coupon.valid_from)}</td>
                                        <td className="px-6 py-4">{formatDate(coupon.valid_to)}</td>
                                        <td className="px-6 py-4">{coupon.usage_count}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={coupon.is_active ? "success" : "neutral"}>
                                                {coupon.is_active && <CheckCircleIcon className="h-3.5 w-3.5" />}
                                                {coupon.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/coupons/${coupon.id}`}
                                                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                                                    title="View coupon"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </Link>
                                                {canManageCoupons && (
                                                    <>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => openEditModal(coupon)} title="Edit coupon">
                                                            <EditIcon className="h-4 w-4" />
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => setCouponToDelete(coupon)} title="Delete coupon">
                                                            <Trash2Icon className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid gap-3 md:hidden">
                {filteredCoupons.map((coupon) => (
                    <div key={coupon.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="font-semibold text-foreground">{coupon.code}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{coupon.description || "No description"}</div>
                            </div>
                            <Badge variant={coupon.is_active ? "success" : "neutral"}>{coupon.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-muted-foreground">Start</div>
                                <div className="font-medium text-foreground">{formatDate(coupon.valid_from)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">End</div>
                                <div className="font-medium text-foreground">{formatDate(coupon.valid_to)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Usage</div>
                                <div className="font-medium text-foreground">{coupon.usage_count}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Discount</div>
                                <div className="font-medium text-foreground">{getDiscountLabel(coupon)}</div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Link href={`/dashboard/coupons/${coupon.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                                <EyeIcon className="h-4 w-4" />
                                View
                            </Link>
                            {canManageCoupons && (
                                <>
                                    <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(coupon)}>
                                        <EditIcon className="h-4 w-4" />
                                        Edit
                                    </Button>
                                    <Button type="button" variant="destructive" size="sm" onClick={() => setCouponToDelete(coupon)}>
                                        <Trash2Icon className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <CouponFormModal
                    form={form}
                    mode={modalMode}
                    error={formError}
                    isSubmitting={isSubmitting}
                    onChange={setForm}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                />
            )}

            {couponToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground">Delete coupon?</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This will remove {couponToDelete.code}. Existing linked orders may prevent deletion.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setCouponToDelete(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(couponToDelete.id)}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
}
