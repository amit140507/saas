import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { Order, OrderPayload } from "@/types/order.type";

type PaginatedResponse<T> = {
    results?: T[];
    data?: T[];
};

type OrderListResponse = Order[] | PaginatedResponse<Order>;

function normalizeOrderList(data: OrderListResponse): Order[] {
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

export async function getOrders(): Promise<Order[]> {
    const response = await api.get<OrderListResponse>(API_ENDPOINTS.orders.list);
    return normalizeOrderList(response.data);
}

export async function createOrder(payload: OrderPayload): Promise<Order> {
    const response = await api.post<Order>(API_ENDPOINTS.orders.list, payload);
    return response.data;
}

export async function updateOrder(id: string, payload: OrderPayload): Promise<Order> {
    const response = await api.put<Order>(API_ENDPOINTS.orders.detail(id), payload);
    return response.data;
}
