import type { PackagePlan } from "@/types/package.type";

export type MembershipStatus = "active" | "expired" | "frozen" | "cancelled" | "pending";

export interface SubscriptionFeature {
    id: string;
    tenant: string;
    name: string;
    code: string;
    description: string;
}

export interface Membership {
    id: string;
    tenant: string;
    client: string;
    plan: string;
    plan_details?: PackagePlan;
    order: string | null;
    start_date: string;
    base_end_date: string;
    extended_end_date: string;
    status: MembershipStatus;
    renewed_from: string | null;
    notes: string | null;
}

export interface MembershipPayload {
    client: string;
    plan: string;
    order: string | null;
    start_date: string;
    status?: MembershipStatus;
    notes: string;
}

export interface SubscriptionFeaturePayload {
    name: string;
    code: string;
    description: string;
}
