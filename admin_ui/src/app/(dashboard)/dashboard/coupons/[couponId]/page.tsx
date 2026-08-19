"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    EditIcon,
    Loader2Icon,
    TicketPercentIcon,
    Trash2Icon,
} from "lucide-react";

import {
    deleteCoupon,
    getCoupon,
    getCouponUsages,
    updateCoupon,
} from "@/services/coupon.service";
import type { Coupon, CouponPayload, CouponUsage } from "@/types/coupon.type";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/ui/page";
import { can, PERMISSIONS, useCurrentUserPermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { CouponFormModal, couponToForm, emptyCouponForm } from "../_components/CouponFormModal";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";

function formatDateTime(value: string | null) {
    if (!value) {
        return "Not set";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatCurrency(value: string | null) {
    if (value === null) {
        return "Not set";
    }

    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
}

function boolLabel(value: boolean) {
    return value ? "Yes" : "No";
}

function ValueRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-foreground sm:max-w-[65%] sm:text-right">{value}</dd>
        </div>
    );
}

function OrderUsageRow({ usage }: { usage: CouponUsage }) {
    return (
        <tr className="border-b border-border last:border-0">
            <td className="px-4 py-3 font-medium text-foreground">{usage.order_number || "No order"}</td>
            <td className="px-4 py-3">
                <Badge variant={usage.order_status === "confirmed" ? "success" : "neutral"}>
                    {usage.order_status || "Unknown"}
                </Badge>
            </td>
            <td className="px-4 py-3">{formatCurrency(usage.order_total_amount)}</td>
            <td className="px-4 py-3">{formatCurrency(usage.order_discount_amount)}</td>
            <td className="px-4 py-3">{formatDateTime(usage.order_created_at)}</td>
        </tr>
    );
}

export default function CouponDetailPage() {
    const params = useParams<{ couponId: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const couponId = params.couponId;
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [form, setForm] = useState(emptyCouponForm);
    const [formError, setFormError] = useState("");
    const { userPermissions } = useCurrentUserPermissions();
    const canManageCoupons = can(userPermissions, PERMISSIONS.MANAGE_ORDERS);

    const { data: coupon, isLoading: isLoadingCoupon, error: couponError } = useQuery({
        queryKey: ["admin-coupon", couponId],
        queryFn: () => getCoupon(couponId),
    });

    const { data: usages = [], isLoading: isLoadingUsages } = useQuery({
        queryKey: ["admin-coupon-usages", couponId],
        queryFn: () => getCouponUsages(couponId),
    });

    const orderUsages = useMemo(() => usages.filter((usage) => Boolean(usage.order)), [usages]);
    const lastFiveOrders = orderUsages.slice(0, 5);

    const updateMutation = useMutation({
        mutationFn: (payload: CouponPayload) => updateCoupon(couponId, payload),
        onSuccess: (updatedCoupon) => {
            queryClient.setQueryData(["admin-coupon", couponId], updatedCoupon);
            queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
            setIsEditOpen(false);
            setFormError("");
        },
        onError: () => setFormError("Could not update coupon. Please check the details and try again."),
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteCoupon(couponId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
            router.push("/dashboard/coupons");
        },
    });

    const openEdit = (selectedCoupon: Coupon) => {
        setForm(couponToForm(selectedCoupon));
        setFormError("");
        setIsEditOpen(true);
    };

    if (isLoadingCoupon) {
        return (
            <PageShell>
                <div className="flex items-center justify-center py-16">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                </div>
            </PageShell>
        );
    }

    if (couponError || !coupon) {
        return (
            <PageShell>
                <PageHeader title="Coupon not found" icon={TicketPercentIcon} />
                <Link href="/dashboard/coupons" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back
                </Link>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <PageHeader
                title={coupon.code}
                description={coupon.description || "No description"}
                icon={TicketPercentIcon}
                actions={(
                    <>
                        <Link href="/dashboard/coupons" className={cn(buttonVariants({ variant: "outline" }))}>
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back
                        </Link>
                        {canManageCoupons && (
                            <>
                                <Button type="button" variant="outline" onClick={() => openEdit(coupon)}>
                                    <EditIcon className="h-4 w-4" />
                                    Edit
                                </Button>
                                <Button type="button" variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                                    <Trash2Icon className="h-4 w-4" />
                                    Delete
                                </Button>
                            </>
                        )}
                    </>
                )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Order usage</div>
                    <div className="mt-2 text-2xl font-bold text-foreground">{orderUsages.length}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Times used</div>
                    <div className="mt-2 text-2xl font-bold text-foreground">{coupon.times_used}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="mt-3">
                        <Badge variant={coupon.is_active ? "success" : "neutral"}>
                            {coupon.is_active && <CheckCircleIcon className="h-3.5 w-3.5" />}
                            {coupon.is_active ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                </div>
            </div>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Coupon Fields</h2>
                <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <ValueRow label="ID" value={coupon.id} />
                    <ValueRow label="Tenant" value={coupon.tenant} />
                    <ValueRow label="Code" value={coupon.code} />
                    <ValueRow label="Name / description" value={coupon.description || "Not set"} />
                    <ValueRow label="Discount type" value={coupon.discount_type} />
                    <ValueRow label="Discount value" value={formatCurrency(coupon.discount_value)} />
                    <ValueRow label="Fixed price amount" value={formatCurrency(coupon.fixed_price_amount)} />
                    <ValueRow label="Max discount cap" value={formatCurrency(coupon.max_discount_cap)} />
                    <ValueRow label="Referrer reward value" value={formatCurrency(coupon.referrer_reward_value)} />
                    <ValueRow label="Category" value={coupon.category} />
                    <ValueRow label="User segment" value={coupon.user_segment} />
                    <ValueRow label="Auto applied" value={boolLabel(coupon.is_auto_applied)} />
                    <ValueRow label="Public" value={boolLabel(coupon.is_public)} />
                    <ValueRow label="Start date" value={formatDateTime(coupon.valid_from)} />
                    <ValueRow label="End date" value={formatDateTime(coupon.valid_to)} />
                    <ValueRow label="Max uses" value={coupon.max_uses ?? "Unlimited"} />
                    <ValueRow label="Times used" value={coupon.times_used} />
                    <ValueRow label="Max uses per user" value={coupon.max_uses_per_user ?? "Unlimited"} />
                    <ValueRow label="First-time users only" value={boolLabel(coupon.first_time_users_only)} />
                    <ValueRow label="Active" value={boolLabel(coupon.is_active)} />
                    <ValueRow label="Created at" value={formatDateTime(coupon.created_at)} />
                    <ValueRow label="Updated at" value={formatDateTime(coupon.updated_at)} />
                </dl>
            </section>

            {coupon.rule && (
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">Coupon Rule</h2>
                    <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ValueRow label="Minimum order value" value={formatCurrency(coupon.rule.min_order_value)} />
                        <ValueRow label="Buy quantity" value={coupon.rule.buy_x_quantity ?? "Not set"} />
                        <ValueRow label="Get quantity" value={coupon.rule.get_y_quantity ?? "Not set"} />
                        <ValueRow label="Trial extension days" value={coupon.rule.trial_extension_days ?? "Not set"} />
                        <ValueRow label="Applies to upgrade" value={boolLabel(coupon.rule.applies_to_upgrade)} />
                        <ValueRow label="Applicable packages" value={coupon.rule.applicable_packages.length} />
                        <ValueRow label="Applicable plans" value={coupon.rule.applicable_plans.length} />
                    </dl>
                </section>
            )}

            <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-foreground">Last 5 Used Orders</h2>
                    <Badge variant="neutral">{orderUsages.length} orders</Badge>
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <ResponsiveTableFromRows
                    columns={["Order", "Status", "Total", "Discount", "Created"]}
                    emptyText="No records found."
                        headerClassName="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground"
                >
                                {isLoadingUsages ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center">
                                            <Loader2Icon className="mx-auto h-6 w-6 animate-spin text-primary" />
                                        </td>
                                    </tr>
                                ) : lastFiveOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                                            No linked orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    lastFiveOrders.map((usage) => <OrderUsageRow key={usage.id} usage={usage} />)
                                )}
                            
                </ResponsiveTableFromRows>
                </div>
            </section>

            {isEditOpen && (
                <CouponFormModal
                    form={form}
                    mode="edit"
                    error={formError}
                    isSubmitting={updateMutation.isPending}
                    onChange={setForm}
                    onClose={() => setIsEditOpen(false)}
                    onSubmit={(payload) => {
                        setFormError("");
                        updateMutation.mutate(payload);
                    }}
                />
            )}

            {isDeleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground">Delete coupon?</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This will remove {coupon.code}. Existing linked orders may prevent deletion.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
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
