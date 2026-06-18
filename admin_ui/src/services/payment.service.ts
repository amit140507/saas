import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
    AdminCheckoutIntentResponse,
    AdminManualPaymentPayload,
    AdminManualPaymentResponse,
    AdminPaymentLinkPayload,
    AdminPaymentLinkRequest,
    AdminPaymentLinkResponse,
    CheckoutIntentStatus,
} from "@/types/payment.type";

export async function getAdminPaymentLinks(): Promise<AdminPaymentLinkRequest[]> {
    const response = await api.get<AdminPaymentLinkRequest[]>(API_ENDPOINTS.payments.adminPaymentLinks);
    return response.data;
}

export async function createAdminPaymentLink(payload: AdminPaymentLinkPayload): Promise<AdminPaymentLinkResponse> {
    const response = await api.post<AdminPaymentLinkResponse>(API_ENDPOINTS.payments.adminPaymentLinks, payload);
    return response.data;
}

export async function createAdminCashPayment(payload: AdminPaymentLinkPayload): Promise<AdminManualPaymentResponse> {
    const response = await api.post<AdminManualPaymentResponse>(API_ENDPOINTS.payments.adminCashPayments, payload);
    return response.data;
}

export async function createAdminManualPayment(payload: AdminManualPaymentPayload): Promise<AdminManualPaymentResponse> {
    const response = await api.post<AdminManualPaymentResponse>(API_ENDPOINTS.payments.adminManualPayments, payload);
    return response.data;
}

export async function createAdminCheckoutIntent(payload: AdminPaymentLinkPayload): Promise<AdminCheckoutIntentResponse> {
    const response = await api.post<AdminCheckoutIntentResponse>(API_ENDPOINTS.payments.adminCheckoutIntents, payload);
    return response.data;
}

export async function getCheckoutIntentStatus(id: string): Promise<CheckoutIntentStatus> {
    const response = await api.get<CheckoutIntentStatus>(API_ENDPOINTS.payments.checkoutIntentDetail(id));
    return response.data;
}
