import type { PackagePlan } from "@/types/package.type";

export type MembershipStatus = "active" | "expired" | "frozen" | "cancelled" | "pending";
export type MembershipAddonStatus = "active" | "expired" | "cancelled";
export type AddonBillingType = "one_time" | "recurring";

export type SnapshotJson = Record<string, unknown>;

export interface SubscriptionFeature {
    id: string;
    tenant: string;
    name: string;
    code: string;
    description: string;
}

export interface AddonFeature {
    id: string;
    tenant: string;
    addon: string;
    feature: string;
    feature_details?: SubscriptionFeature;
}

export interface Addon {
    id: string;
    tenant: string;
    name: string;
    code: string;
    description: string;
    price: string;
    billing_type: AddonBillingType;
    duration_days: number | null;
    is_active: boolean;
    addon_features?: AddonFeature[];
}

export interface MembershipAddon {
    id: string;
    tenant: string;
    membership: string;
    addon: string;
    addon_details?: Addon;
    price: string;
    start_date: string;
    end_date: string | null;
    status: MembershipAddonStatus;
}

export interface MembershipFreeze {
    id: string;
    tenant: string;
    membership: string;
    start_date: string;
    end_date: string;
    days: number;
}

export interface MembershipSnapshot {
    id: string;
    tenant: string;
    membership: string;
    data: SnapshotJson;
}

export interface MembershipChange {
    id: string;
    tenant: string;
    membership: string;
    from_plan: string;
    from_plan_details?: PackagePlan;
    to_plan: string;
    to_plan_details?: PackagePlan;
    price_difference: string;
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
    freezes?: MembershipFreeze[];
    addons?: MembershipAddon[];
    snapshot?: MembershipSnapshot | null;
    changes?: MembershipChange[];
    created_at?: string;
    updated_at?: string;
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
