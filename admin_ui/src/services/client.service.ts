import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { ClientData, ClientPayload } from "@/types/client.type";

type PaginatedResponse<T> = {
    results?: T[];
    data?: T[];
};

type ClientListResponse = ClientData[] | PaginatedResponse<ClientData>;

function normalizeClientList(data: ClientListResponse): ClientData[] {
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

export async function getClients(): Promise<ClientData[]> {
    const response = await api.get<ClientListResponse>(API_ENDPOINTS.clients.list);
    return normalizeClientList(response.data);
}

export async function getClient(id: string): Promise<ClientData> {
    const response = await api.get<ClientData>(API_ENDPOINTS.clients.detail(id));
    return response.data;
}

export async function createClient(payload: ClientPayload): Promise<ClientData> {
    const response = await api.post<ClientData>(API_ENDPOINTS.clients.list, payload);
    return response.data;
}

export async function updateClient(id: string, payload: ClientPayload): Promise<ClientData> {
    const response = await api.put<ClientData>(API_ENDPOINTS.clients.detail(id), payload);
    return response.data;
}

export async function activateClient(id: string): Promise<ClientData> {
    const response = await api.post<ClientData>(API_ENDPOINTS.clients.activate(id));
    return response.data;
}

export async function deactivateClient(id: string): Promise<ClientData> {
    const response = await api.post<ClientData>(API_ENDPOINTS.clients.deactivate(id));
    return response.data;
}

export async function deleteClient(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.clients.detail(id));
}
