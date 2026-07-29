import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { WeeklyMeasurementData } from "@/types/measurement.type";

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

export async function getMeasurementsByClient(clientId: string): Promise<WeeklyMeasurementData[]> {
    const response = await api.get<ListResponse<WeeklyMeasurementData>>(API_ENDPOINTS.progress.weeklyMeasurements, {
        params: { client: clientId },
    });
    return normalizeList(response.data);
}
