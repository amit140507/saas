import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
    EmailLog,
    MessageChannel,
    MessageTemplate,
    MessageTemplatePayload,
    TestSendPayload,
    TestSendResult,
    WhatsAppLog,
} from "@/types/communication.type";

type PaginatedResponse<T> = {
    results?: T[];
    data?: T[];
};

function normalizeList<T>(data: T[] | PaginatedResponse<T>): T[] {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data.results)) {
        return data.results;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    return [];
}

export async function getMessageTemplates(channel?: MessageChannel): Promise<MessageTemplate[]> {
    const response = await api.get<MessageTemplate[] | PaginatedResponse<MessageTemplate>>(
        API_ENDPOINTS.communications.messageTemplates,
        { params: channel ? { channel } : undefined },
    );
    return normalizeList(response.data);
}

export async function createMessageTemplate(payload: MessageTemplatePayload): Promise<MessageTemplate> {
    const response = await api.post<MessageTemplate>(API_ENDPOINTS.communications.messageTemplates, payload);
    return response.data;
}

export async function updateMessageTemplate(id: string, payload: MessageTemplatePayload): Promise<MessageTemplate> {
    const response = await api.put<MessageTemplate>(API_ENDPOINTS.communications.messageTemplateDetail(id), payload);
    return response.data;
}

export async function deleteMessageTemplate(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.communications.messageTemplateDetail(id));
}

export async function testMessageTemplate(id: string, payload: TestSendPayload): Promise<TestSendResult> {
    const response = await api.post<TestSendResult>(API_ENDPOINTS.communications.testMessageTemplate(id), payload);
    return response.data;
}

export async function getEmailLogs(): Promise<EmailLog[]> {
    const response = await api.get<EmailLog[] | PaginatedResponse<EmailLog>>(API_ENDPOINTS.communications.emailLogs);
    return normalizeList(response.data);
}

export async function getWhatsAppLogs(): Promise<WhatsAppLog[]> {
    const response = await api.get<WhatsAppLog[] | PaginatedResponse<WhatsAppLog>>(API_ENDPOINTS.communications.whatsappLogs);
    return normalizeList(response.data);
}
