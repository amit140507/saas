import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { CheckInLogData, CheckInPlanData } from "@/types/checkin.type";

type PaginatedResponse<T> = {
    results?: T[];
    data?: T[];
};

type ListResponse<T> = T[] | PaginatedResponse<T>;

function normalizeList<T>(data: ListResponse<T>): T[] {
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

export async function getCheckInPlansByClient(clientId: string): Promise<CheckInPlanData[]> {
    const response = await api.get<ListResponse<CheckInPlanData>>(API_ENDPOINTS.progress.checkins, {
        params: { client: clientId },
    });
    return normalizeList(response.data);
}

export async function getCheckInLogsByPlan(planId: string, weekNumber: number): Promise<CheckInLogData[]> {
    const response = await api.get<ListResponse<CheckInLogData>>(API_ENDPOINTS.progress.checkinLogs, {
        params: { plan: planId, week_number: weekNumber },
    });
    return normalizeList(response.data);
}
