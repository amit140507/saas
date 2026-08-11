export type CouponDiscountType = "percent" | "fixed" | "fixed_price" | "free_shipping";

export interface CouponRule {
    id: string;
    min_order_value: string;
    buy_x_quantity: number | null;
    get_y_quantity: number | null;
    applicable_packages: string[];
    applicable_plans: string[];
    trial_extension_days: number | null;
    applies_to_upgrade: boolean;
    created_at: string;
}

export interface Coupon {
    id: string;
    tenant: string;
    code: string;
    description: string | null;
    discount_type: CouponDiscountType;
    discount_value: string;
    fixed_price_amount: string | null;
    max_discount_cap: string | null;
    referrer_reward_value: string | null;
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
    rule?: CouponRule | null;
    created_at: string;
    updated_at: string;
}

export type CouponPayload = {
    code: string;
    description: string;
    discount_type: CouponDiscountType;
    discount_value: string;
    fixed_price_amount: string | null;
    max_discount_cap: string | null;
    referrer_reward_value: string | null;
    category: string;
    user_segment: string;
    is_auto_applied: boolean;
    is_public: boolean;
    valid_from: string | null;
    valid_to: string | null;
    max_uses: number | null;
    max_uses_per_user: number | null;
    first_time_users_only: boolean;
    is_active: boolean;
};

export interface CouponUsage {
    id: string;
    coupon: string;
    user: string;
    user_email: string;
    order: string | null;
    order_number: string | null;
    order_status: string | null;
    order_total_amount: string | null;
    order_discount_amount: string | null;
    order_created_at: string | null;
    discount_applied: string;
    used_at: string;
    coupon_code: string;
}
