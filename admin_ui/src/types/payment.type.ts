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
