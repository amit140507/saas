import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";

export interface CurrentUserMembership {
    tenant_id: string;
    tenant_name: string;
    tenant_logo: string | null;
    tenant_brand_color?: string;
    role: string | null;
    is_owner: boolean;
}

export interface CurrentAdminUser {
    memberships?: CurrentUserMembership[];
}

export interface PasswordResetConfirmPayload {
    uid: string;
    token: string;
    new_password1: string;
    new_password2: string;
}

export async function getCurrentAdminUser(): Promise<CurrentAdminUser> {
    const response = await api.get<CurrentAdminUser>(API_ENDPOINTS.auth.currentUser);
    return response.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
    await api.post(API_ENDPOINTS.auth.passwordReset, { email });
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<void> {
    await api.post(API_ENDPOINTS.auth.passwordResetConfirm, payload);
}
