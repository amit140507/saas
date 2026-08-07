import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { Followup, FollowupPayload, FollowupSuggestedTarget } from "@/types/followup.type";

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

export async function getFollowups(): Promise<Followup[]> {
    const response = await api.get<Followup[] | PaginatedResponse<Followup>>(API_ENDPOINTS.engagement.followups);
    return normalizeList(response.data);
}

export async function createFollowup(payload: FollowupPayload): Promise<Followup> {
    const response = await api.post<Followup>(API_ENDPOINTS.engagement.followups, payload);
    return response.data;
}

export async function updateFollowup(id: string, payload: FollowupPayload): Promise<Followup> {
    const response = await api.put<Followup>(API_ENDPOINTS.engagement.followupDetail(id), payload);
    return response.data;
}

export async function deleteFollowup(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.engagement.followupDetail(id));
}

export async function getFollowupSuggestedTargets(): Promise<FollowupSuggestedTarget[]> {
    const response = await api.get<FollowupSuggestedTarget[] | PaginatedResponse<FollowupSuggestedTarget>>(
        API_ENDPOINTS.engagement.suggestedTargets,
    );
    return normalizeList(response.data);
}
