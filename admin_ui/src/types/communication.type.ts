export type EmailLogStatus = "pending" | "sent" | "failed";

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
