export type FollowupType = "call" | "whatsapp" | "email" | "in_person" | "sms";
export type FollowupStatus = "pending" | "completed" | "missed" | "rescheduled";
export type FollowupPriority = "low" | "medium" | "high";

export interface Followup {
    id: string;
    tenant: string;
    client: string;
    client_name: string;
    client_email: string;
    client_phone: string | null;
    assigned_to: string | null;
    assigned_to_name: string;
    followup_type: FollowupType;
    status: FollowupStatus;
    priority: FollowupPriority;
    scheduled_at: string | null;
    completed_at: string | null;
    notes: string | null;
    outcome: string | null;
    next_followup: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface FollowupPayload {
    client: string;
    assigned_to: string | null;
    followup_type: FollowupType;
    status: FollowupStatus;
    priority: FollowupPriority;
    scheduled_at: string | null;
    completed_at: string | null;
    notes: string;
    outcome: string;
    next_followup: string | null;
}

export type FollowupSuggestedTargetReason = "lead" | "expiring_soon";

export interface FollowupSuggestedTarget {
    client: string;
    client_name: string;
    client_email: string;
    client_phone: string | null;
    reason: FollowupSuggestedTargetReason;
    membership: string | null;
    package_name: string;
    plan_name: string;
    end_date: string | null;
}
