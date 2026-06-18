export type OrderStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type ManualPaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "pos";
export type OrderPaymentMethod = ManualPaymentMethod | "checkout" | "payment_link";

export interface OrderItem {
    id: string;
    product: string | null;
    quantity: number;
    unit_price: string;
    total_price: string;
}

export interface Order {
    id: string;
    client: string;
    tenant: string;
    order_number: string;
    status: OrderStatus;
    subtotal: string;
    discount_amount: string;
    tax_amount: string;
    total_amount: string;
    coupon: string | null;
    notes: string | null;
    payment_link_token: string | null;
    payment_method: OrderPaymentMethod;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    items: OrderItem[];
}

export interface OrderItemPayload {
    product: string;
    quantity: number;
    unit_price: string;
    total_price: string;
}

export interface OrderPayload {
    client: string;
    status: OrderStatus;
    payment_method: OrderPaymentMethod;
    subtotal: string;
    discount_amount: string;
    tax_amount: string;
    total_amount: string;
    coupon: string | null;
    notes: string;
    items: OrderItemPayload[];
}
