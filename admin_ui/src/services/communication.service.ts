import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { EmailLog } from "@/types/communication.type";

export async function getEmailLogs(): Promise<EmailLog[]> {
    const response = await api.get<EmailLog[]>(API_ENDPOINTS.communications.emailLogs);
    return response.data;
}
