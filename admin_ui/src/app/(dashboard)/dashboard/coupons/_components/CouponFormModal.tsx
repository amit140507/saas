"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import type { Coupon, CouponDiscountType, CouponPayload } from "@/types/coupon.type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CouponForm = {
    code: string;
    description: string;
    discount_type: CouponDiscountType;
    discount_value: string;
    fixed_price_amount: string;
    max_discount_cap: string;
    referrer_reward_value: string;
    category: string;
    user_segment: string;
    is_auto_applied: boolean;
    is_public: boolean;
    valid_from: string;
    valid_to: string;
    max_uses: string;
    max_uses_per_user: string;
    first_time_users_only: boolean;
    is_active: boolean;
};

const discountTypeOptions: Array<{ value: CouponDiscountType; label: string }> = [
    { value: "percent", label: "Percentage" },
    { value: "fixed", label: "Fixed Amount" },
    { value: "fixed_price", label: "Fixed Price Override" },
    { value: "free_shipping", label: "Free Shipping" },
];

const categoryOptions = [
    { value: "general", label: "General" },
    { value: "subscription", label: "Subscription" },
    { value: "referral", label: "Referral" },
    { value: "affiliate", label: "Affiliate" },
    { value: "flash", label: "Flash Sale" },
    { value: "early_bird", label: "Early Bird" },
    { value: "upgrade", label: "Upgrade" },
];

const segmentOptions = [
    { value: "all", label: "All Users" },
    { value: "first_time", label: "First-time Users" },
    { value: "returning", label: "Returning Customers" },
    { value: "vip", label: "VIP / Premium" },
    { value: "referral", label: "Referral Recipient" },
];

export const emptyCouponForm: CouponForm = {
    code: "",
    description: "",
    discount_type: "percent",
    discount_value: "0",
    fixed_price_amount: "",
    max_discount_cap: "",
    referrer_reward_value: "",
    category: "general",
    user_segment: "all",
    is_auto_applied: false,
    is_public: true,
    valid_from: "",
    valid_to: "",
    max_uses: "",
    max_uses_per_user: "",
    first_time_users_only: false,
    is_active: true,
};

function toDateTimeInput(value: string | null) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 16);
}

function nullableDecimal(value: string) {
    return value.trim() ? value.trim() : null;
}

function nullablePositiveInteger(value: string) {
    if (!value.trim()) {
        return null;
    }

    return Number(value);
}

export function couponToForm(coupon: Coupon): CouponForm {
    return {
        code: coupon.code,
        description: coupon.description || "",
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        fixed_price_amount: coupon.fixed_price_amount || "",
        max_discount_cap: coupon.max_discount_cap || "",
        referrer_reward_value: coupon.referrer_reward_value || "",
        category: coupon.category,
        user_segment: coupon.user_segment,
        is_auto_applied: coupon.is_auto_applied,
        is_public: coupon.is_public,
        valid_from: toDateTimeInput(coupon.valid_from),
        valid_to: toDateTimeInput(coupon.valid_to),
        max_uses: coupon.max_uses === null ? "" : String(coupon.max_uses),
        max_uses_per_user: coupon.max_uses_per_user === null ? "" : String(coupon.max_uses_per_user),
        first_time_users_only: coupon.first_time_users_only,
        is_active: coupon.is_active,
    };
}

function validateAndBuildPayload(form: CouponForm): { payload: CouponPayload | null; error: string } {
    const code = form.code.trim().toUpperCase();
    const discountValue = Number(form.discount_value);
    const maxUses = nullablePositiveInteger(form.max_uses);
    const maxUsesPerUser = nullablePositiveInteger(form.max_uses_per_user);

    if (!code) {
        return { payload: null, error: "Coupon code is required." };
    }

    if (!form.discount_value.trim() || Number.isNaN(discountValue) || discountValue < 0) {
        return { payload: null, error: "Discount value must be zero or higher." };
    }

    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
        return { payload: null, error: "Max uses must be blank or at least one." };
    }

    if (maxUsesPerUser !== null && (!Number.isInteger(maxUsesPerUser) || maxUsesPerUser < 1)) {
        return { payload: null, error: "Max uses per user must be blank or at least one." };
    }

    const payload: CouponPayload = {
        code,
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value.trim(),
        fixed_price_amount: nullableDecimal(form.fixed_price_amount),
        max_discount_cap: nullableDecimal(form.max_discount_cap),
        referrer_reward_value: nullableDecimal(form.referrer_reward_value),
        category: form.category,
        user_segment: form.user_segment,
        is_auto_applied: form.is_auto_applied,
        is_public: form.is_public,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        max_uses: maxUses,
        max_uses_per_user: maxUsesPerUser,
        first_time_users_only: form.first_time_users_only,
        is_active: form.is_active,
    };

    return { payload, error: "" };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-sm font-medium text-foreground">{children}</label>;
}

function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="inline-flex items-center gap-3 rounded-md border border-border px-4 py-3">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
            />
            <span className="text-sm font-medium text-foreground">{label}</span>
        </label>
    );
}

export function CouponFormModal({
    form,
    mode,
    error,
    isSubmitting,
    onChange,
    onClose,
    onSubmit,
}: {
    form: CouponForm;
    mode: "create" | "edit";
    error: string;
    isSubmitting: boolean;
    onChange: (form: CouponForm) => void;
    onClose: () => void;
    onSubmit: (payload: CouponPayload) => void;
}) {
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setHasSubmitted(true);
        const result = validateAndBuildPayload(form);
        if (!result.payload) {
            return;
        }
        onSubmit(result.payload);
    };

    const localValidation = validateAndBuildPayload(form).error;
    const visibleError = error || (hasSubmitted ? localValidation : "");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-foreground">
                        {mode === "edit" ? "Edit Coupon" : "Create Coupon"}
                    </h2>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {visibleError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                            {visibleError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <FieldLabel>Coupon code</FieldLabel>
                            <Input
                                value={form.code}
                                onChange={(event) => onChange({ ...form, code: event.target.value })}
                                placeholder="SUMMER20"
                                maxLength={30}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Name / description</FieldLabel>
                            <Input
                                value={form.description}
                                onChange={(event) => onChange({ ...form, description: event.target.value })}
                                placeholder="Summer offer"
                            />
                        </div>
                        <div>
                            <FieldLabel>Discount type</FieldLabel>
                            <select
                                value={form.discount_type}
                                onChange={(event) => onChange({ ...form, discount_type: event.target.value as CouponDiscountType })}
                                className="mt-0 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {discountTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Discount value</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.discount_value}
                                onChange={(event) => onChange({ ...form, discount_value: event.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Fixed price amount</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.fixed_price_amount}
                                onChange={(event) => onChange({ ...form, fixed_price_amount: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Max discount cap</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.max_discount_cap}
                                onChange={(event) => onChange({ ...form, max_discount_cap: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Category</FieldLabel>
                            <select
                                value={form.category}
                                onChange={(event) => onChange({ ...form, category: event.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {categoryOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>User segment</FieldLabel>
                            <select
                                value={form.user_segment}
                                onChange={(event) => onChange({ ...form, user_segment: event.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {segmentOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Start date</FieldLabel>
                            <Input
                                type="datetime-local"
                                value={form.valid_from}
                                onChange={(event) => onChange({ ...form, valid_from: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>End date</FieldLabel>
                            <Input
                                type="datetime-local"
                                value={form.valid_to}
                                onChange={(event) => onChange({ ...form, valid_to: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Max uses</FieldLabel>
                            <Input
                                type="number"
                                min="1"
                                value={form.max_uses}
                                onChange={(event) => onChange({ ...form, max_uses: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Max uses per user</FieldLabel>
                            <Input
                                type="number"
                                min="1"
                                value={form.max_uses_per_user}
                                onChange={(event) => onChange({ ...form, max_uses_per_user: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Referrer reward value</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.referrer_reward_value}
                                onChange={(event) => onChange({ ...form, referrer_reward_value: event.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Toggle label="Active" checked={form.is_active} onChange={(checked) => onChange({ ...form, is_active: checked })} />
                        <Toggle label="Public" checked={form.is_public} onChange={(checked) => onChange({ ...form, is_public: checked })} />
                        <Toggle label="Auto applied" checked={form.is_auto_applied} onChange={(checked) => onChange({ ...form, is_auto_applied: checked })} />
                        <Toggle label="First-time users only" checked={form.first_time_users_only} onChange={(checked) => onChange({ ...form, first_time_users_only: checked })} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
                            {mode === "edit" ? "Save Changes" : "Create Coupon"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
