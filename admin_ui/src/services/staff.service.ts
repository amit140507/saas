import api from "@/lib/api";
import type { StaffMember } from "@/types/staff.type";

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

export async function getStaffMembers(): Promise<StaffMember[]> {
    const response = await api.get<StaffMember[] | PaginatedResponse<StaffMember>>("staff/staff/");
    return normalizeList(response.data);
}
