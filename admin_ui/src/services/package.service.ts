import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { Package, PackagePayload } from "@/types/package.type";

type PaginatedResponse<T> = {
    results: T[];
};

function normalizeList<T>(data: T[] | PaginatedResponse<T>): T[] {
    return Array.isArray(data) ? data : data.results;
}

export async function getPackages(): Promise<Package[]> {
    const response = await api.get<Package[] | PaginatedResponse<Package>>(API_ENDPOINTS.packages.list);
    return normalizeList(response.data);
}

export async function createPackage(payload: PackagePayload): Promise<Package> {
    const response = await api.post<Package>(API_ENDPOINTS.packages.list, payload);
    return response.data;
}

export async function updatePackage(id: string, payload: PackagePayload): Promise<Package> {
    const response = await api.put<Package>(API_ENDPOINTS.packages.detail(id), payload);
    return response.data;
}

export async function deletePackage(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.packages.detail(id));
}
