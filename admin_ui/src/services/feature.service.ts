import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { FeatureCatalogItem } from "@/types/package.type";

type PaginatedResponse<T> = {
    results: T[];
};

function normalizeList<T>(data: T[] | PaginatedResponse<T>): T[] {
    return Array.isArray(data) ? data : data.results;
}

export async function getFeatures(): Promise<FeatureCatalogItem[]> {
    const response = await api.get<FeatureCatalogItem[] | PaginatedResponse<FeatureCatalogItem>>(API_ENDPOINTS.features.list);
    return normalizeList(response.data);
}
