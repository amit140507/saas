export interface OrganizationSettings {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    website: string | null;
    gstin: string | null;
    brand_color: string;
}

export interface UpdateOrganizationSettingsPayload {
    name: string;
    slug: string;
    website: string;
    gstin: string;
    brand_color: string;
    logo?: File | null;
    remove_logo?: boolean;
}
