import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { Coupon, CouponPayload, CouponUsage } from "@/types/coupon.type";

type PaginatedResponse<T> = {
    results?: T[];
    data?: T[];
};

type CouponListResponse = Coupon[] | PaginatedResponse<Coupon>;

function normalizeCouponList(data: CouponListResponse): Coupon[] {
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

export async function getCoupons(): Promise<Coupon[]> {
    const response = await api.get<CouponListResponse>(API_ENDPOINTS.coupons.list);
    return normalizeCouponList(response.data);
}

export async function getCoupon(id: string): Promise<Coupon> {
    const response = await api.get<Coupon>(API_ENDPOINTS.coupons.detail(id));
    return response.data;
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
    const response = await api.post<Coupon>(API_ENDPOINTS.coupons.list, payload);
    return response.data;
}

export async function updateCoupon(id: string, payload: CouponPayload): Promise<Coupon> {
    const response = await api.put<Coupon>(API_ENDPOINTS.coupons.detail(id), payload);
    return response.data;
}

export async function deleteCoupon(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.coupons.detail(id));
}

export async function getCouponUsages(id: string): Promise<CouponUsage[]> {
    const response = await api.get<CouponUsage[]>(API_ENDPOINTS.coupons.usages(id));
    return response.data;
}
