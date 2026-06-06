import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { Coupon } from "@/types/coupon.type";

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
