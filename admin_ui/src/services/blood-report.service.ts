import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { BloodReport } from "@/types/blood-report.type";

type PaginatedResponse<T> = {
    results?: T[];
    data?: T[];
};

type BloodReportListResponse = BloodReport[] | PaginatedResponse<BloodReport>;

function normalizeBloodReportList(data: BloodReportListResponse): BloodReport[] {
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

export async function getBloodReports(): Promise<BloodReport[]> {
    const response = await api.get<BloodReportListResponse>(API_ENDPOINTS.reports.bloodReports);
    return normalizeBloodReportList(response.data);
}

export async function createBloodReport(payload: FormData): Promise<BloodReport> {
    const response = await api.post<BloodReport>(API_ENDPOINTS.reports.bloodReports, payload, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
}
