import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { OrganizationSettings, UpdateOrganizationSettingsPayload } from "@/types/organization.type";

export async function getOrganizationSettings(tenantId: string): Promise<OrganizationSettings> {
    const response = await api.get<OrganizationSettings>(API_ENDPOINTS.organizations.settings(tenantId));
    return response.data;
}

export async function updateOrganizationSettings(
    tenantId: string,
    payload: UpdateOrganizationSettingsPayload,
): Promise<OrganizationSettings> {
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("slug", payload.slug);
    formData.append("website", payload.website);
    formData.append("gstin", payload.gstin);
    formData.append("brand_color", payload.brand_color);
    formData.append("remove_logo", payload.remove_logo ? "true" : "false");

    if (payload.logo) {
        formData.append("logo", payload.logo);
    }

    const response = await api.patch<OrganizationSettings>(API_ENDPOINTS.organizations.settings(tenantId), formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
}
