import api from "@/lib/api";
import type { StaffMember, StaffUpdatePayload } from "@/types/staff.type";

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

export async function getStaffMemberByEmail(email: string): Promise<StaffMember | null> {
    const staffMembers = await getStaffMembers();
    const normalizedEmail = email.toLowerCase();

    return staffMembers.find((member) => member.email.toLowerCase() === normalizedEmail) || null;
}

export async function updateStaffMember(id: string, payload: StaffUpdatePayload): Promise<StaffMember> {
    const response = await api.put<StaffMember>(`staff/staff/${id}/`, payload);
    return response.data;
}

export async function activateStaffMember(id: string): Promise<StaffMember> {
    const response = await api.post<StaffMember>(`staff/staff/${id}/activate/`);
    return response.data;
}

export async function deactivateStaffMember(id: string): Promise<StaffMember> {
    const response = await api.post<StaffMember>(`staff/staff/${id}/deactivate/`);
    return response.data;
}

export async function deleteStaffMember(id: string): Promise<void> {
    await api.delete(`staff/staff/${id}/`);
}
