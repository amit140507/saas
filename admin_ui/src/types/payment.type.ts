import type { ManualPaymentMethod } from "@/types/order.type";

export interface AdminPaymentLinkRequest {
    id: string;
    status: string;
    amount: string;
    currency: string;
    client_id: string;
    client_name: string;
    client_email: string;
    payment_url: string;
    payment_link_token: string | null;
    created_at: string;
    paid_at: string | null;
    order_id: string | null;
}

export interface AdminPaymentLinkPayloadItem {
    product: string;
    quantity: number;
    unit_price: string;
    total_price: string;
}

export interface AdminPaymentLinkPayload {
    client: string;
    coupon: string | null;
    notes: string;
    subtotal: string;
    discount_amount: string;
    tax_amount: string;
    total_amount: string;
    items: AdminPaymentLinkPayloadItem[];
}

export interface AdminManualPaymentPayload extends AdminPaymentLinkPayload {
    payment_method: ManualPaymentMethod;
}

export interface AdminPaymentLinkResponse {
    id: string;
    status: string;
    payment_link_token: string;
    payment_url: string;
    amount: string;
    currency: string;
    snapshot: {
        client_name: string;
        client_email: string;
    };
}

export interface AdminCheckoutIntentResponse {
    gateway: string;
    provider_order_id: string;
    key: string;
    amount: number;
    currency: string;
    intent_id: string;
    status: string;
}

export interface AdminManualPaymentResponse {
    order_id: string;
    order_number: string;
    status: string;
    payment_method: ManualPaymentMethod;
}

export interface CheckoutIntentStatus {
    id: string;
    status: string;
    order: string | null;
}
