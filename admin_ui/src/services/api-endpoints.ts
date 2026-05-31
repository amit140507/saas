export const API_ENDPOINTS = {
    clients: {
        list: "clients/clients/",
        detail: (id: string) => `clients/clients/${id}/`,
        activate: (id: string) => `clients/clients/${id}/activate/`,
        deactivate: (id: string) => `clients/clients/${id}/deactivate/`,
    },
    features: {
        list: "features/",
    },
    packages: {
        list: "packages/",
        detail: (id: string) => `packages/${id}/`,
    },
} as const;
