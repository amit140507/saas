import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
    AdminPaymentLinkPayload,
    AdminPaymentLinkRequest,
    AdminPaymentLinkResponse,
} from "@/types/payment.type";

export async function getAdminPaymentLinks(): Promise<AdminPaymentLinkRequest[]> {
    const response = await api.get<AdminPaymentLinkRequest[]>(API_ENDPOINTS.payments.adminPaymentLinks);
    return response.data;
}

export async function createAdminPaymentLink(payload: AdminPaymentLinkPayload): Promise<AdminPaymentLinkResponse> {
    const response = await api.post<AdminPaymentLinkResponse>(API_ENDPOINTS.payments.adminPaymentLinks, payload);
    return response.data;
}
