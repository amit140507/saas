import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";

export interface PasswordResetConfirmPayload {
    uid: string;
    token: string;
    new_password1: string;
    new_password2: string;
}

export async function requestPasswordReset(email: string): Promise<void> {
    await api.post(API_ENDPOINTS.auth.passwordReset, { email });
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<void> {
    await api.post(API_ENDPOINTS.auth.passwordResetConfirm, payload);
}
