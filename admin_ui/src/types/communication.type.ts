export type EmailLogStatus = "pending" | "sent" | "failed";
export type MessageChannel = "email" | "whatsapp" | "sms" | "push";
export type MessageCategory =
    | "welcome"
    | "renewal_reminder"
    | "payment_receipt"
    | "plan_assigned"
    | "birthday"
    | "followup"
    | "promo"
    | "custom";
export type WhatsAppLogStatus = "success" | "failed";

export interface MessageTemplate {
    id: string;
    tenant: string;
    name: string;
    channel: MessageChannel;
    category: MessageCategory;
    subject: string | null;
    body: string;
    variables: string[];
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface MessageTemplatePayload {
    name: string;
    channel: MessageChannel;
    category: MessageCategory;
    subject: string;
    body: string;
    variables: string[];
    is_active: boolean;
}

export interface EmailLog {
    id: string;
    tenant: string;
    recipient: string | null;
    recipient_email: string;
    subject: string;
    template_name: string;
    context_data: Record<string, unknown>;
    status: EmailLogStatus;
    error_message: string;
    related_object_type: string;
    related_object_id: string;
    sent_at: string | null;
    created_at: string;
}

export interface WhatsAppLog {
    id: string;
    tenant: string;
    recipient: string | null;
    recipient_phone: string;
    template: string | null;
    message_id: string;
    sent_at: string;
    status: WhatsAppLogStatus;
    error_message: string;
}

export interface TestSendPayload {
    recipient_id: string;
    context_data?: Record<string, unknown>;
}

export interface TestSendResult {
    success: boolean;
    message: string;
}
