import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
    Membership,
    MembershipPayload,
    SubscriptionFeature,
    SubscriptionFeaturePayload,
} from "@/types/subscription.type";

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

export async function getMemberships(): Promise<Membership[]> {
    const response = await api.get<Membership[] | PaginatedResponse<Membership>>(API_ENDPOINTS.subscriptions.memberships);
    return normalizeList(response.data);
}

export async function createMembership(payload: MembershipPayload): Promise<Membership> {
    const response = await api.post<Membership>(API_ENDPOINTS.subscriptions.memberships, payload);
    return response.data;
}

export async function updateMembership(id: string, payload: MembershipPayload): Promise<Membership> {
    const response = await api.put<Membership>(API_ENDPOINTS.subscriptions.membershipDetail(id), payload);
    return response.data;
}

export async function deleteMembership(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.subscriptions.membershipDetail(id));
}

export async function getSubscriptionFeatures(): Promise<SubscriptionFeature[]> {
    const response = await api.get<SubscriptionFeature[] | PaginatedResponse<SubscriptionFeature>>(API_ENDPOINTS.subscriptions.features);
    return normalizeList(response.data);
}

export async function createSubscriptionFeature(payload: SubscriptionFeaturePayload): Promise<SubscriptionFeature> {
    const response = await api.post<SubscriptionFeature>(API_ENDPOINTS.subscriptions.features, payload);
    return response.data;
}

export async function updateSubscriptionFeature(
    id: string,
    payload: SubscriptionFeaturePayload,
): Promise<SubscriptionFeature> {
    const response = await api.put<SubscriptionFeature>(API_ENDPOINTS.subscriptions.featureDetail(id), payload);
    return response.data;
}

export async function deleteSubscriptionFeature(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.subscriptions.featureDetail(id));
}
