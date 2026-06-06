export const API_ENDPOINTS = {
    auth: {
        passwordReset: "auth/password/reset/",
        passwordResetConfirm: "auth/password/reset/confirm/",
    },
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
    coupons: {
        list: "coupons/",
        detail: (id: string) => `coupons/${id}/`,
    },
    orders: {
        list: "orders/orders/",
        detail: (id: string) => `orders/orders/${id}/`,
    },
} as const;
