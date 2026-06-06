export type CouponDiscountType = "percent" | "fixed" | "fixed_price" | "free_shipping";

export interface Coupon {
    id: string;
    tenant: string;
    code: string;
    description: string | null;
    discount_type: CouponDiscountType;
    discount_value: string;
    fixed_price_amount: string | null;
    max_discount_cap: string | null;
    category: string;
    user_segment: string;
    is_auto_applied: boolean;
    is_public: boolean;
    valid_from: string | null;
    valid_to: string | null;
    max_uses: number | null;
    times_used: number;
    max_uses_per_user: number | null;
    first_time_users_only: boolean;
    is_active: boolean;
    usage_count: number;
}
