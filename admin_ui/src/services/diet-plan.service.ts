import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
    DietPlan,
    DietPlanAssignment,
    DietPlanAssignmentPayload,
    DietPlanPayload,
    FoodItem,
    PlannedMeal,
} from "@/types/diet-plan.type";

type PaginatedResponse<T> = {
    results?: T[];
    data?: T[];
};

type ListResponse<T> = T[] | PaginatedResponse<T>;

function normalizeList<T>(data: ListResponse<T>): T[] {
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

export interface GenerateDietPlanPayload {
    startDate: string;
    endDate: string;
    checkInDate: string;
    totalCardio: string;
    clientEmail: string;
    clientPhone: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    weightGain: number;
    meals: Array<{
        time: string;
        foods: Array<{ name: string; amount: string; unit: string }>;
        supplements: Array<{ name: string; amount: string; unit: string }>;
    }>;
}

export async function generateDietPlanPdf(payload: GenerateDietPlanPayload): Promise<void> {
    await api.post(API_ENDPOINTS.meal.generateDietPlanPdf, payload);
}

export async function downloadDietPlanPdf(payload: GenerateDietPlanPayload): Promise<void> {
    const response = await api.post(API_ENDPOINTS.meal.downloadDietPlanPdf, payload, {
        responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "diet_plan.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

export async function getDietPlans(): Promise<DietPlan[]> {
    const response = await api.get<ListResponse<DietPlan>>(API_ENDPOINTS.meal.plans);
    return normalizeList(response.data);
}

export async function createDietPlan(payload: DietPlanPayload): Promise<DietPlan> {
    const response = await api.post<DietPlan>(API_ENDPOINTS.meal.plans, payload);
    return response.data;
}

export async function updateDietPlan(id: string, payload: DietPlanPayload): Promise<DietPlan> {
    const response = await api.put<DietPlan>(API_ENDPOINTS.meal.planDetail(id), payload);
    return response.data;
}

export async function deleteDietPlan(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.meal.planDetail(id));
}

export async function getDietPlanAssignments(): Promise<DietPlanAssignment[]> {
    const response = await api.get<ListResponse<DietPlanAssignment>>(API_ENDPOINTS.meal.assignments);
    return normalizeList(response.data);
}

export async function createDietPlanAssignment(payload: DietPlanAssignmentPayload): Promise<DietPlanAssignment> {
    const response = await api.post<DietPlanAssignment>(API_ENDPOINTS.meal.assignments, payload);
    return response.data;
}

export async function updateDietPlanAssignment(id: string, payload: DietPlanAssignmentPayload): Promise<DietPlanAssignment> {
    const response = await api.put<DietPlanAssignment>(API_ENDPOINTS.meal.assignmentDetail(id), payload);
    return response.data;
}

export async function deleteDietPlanAssignment(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.meal.assignmentDetail(id));
}

export async function getFoodItems(): Promise<FoodItem[]> {
    const response = await api.get<ListResponse<FoodItem>>(API_ENDPOINTS.meal.foodItems);
    return normalizeList(response.data);
}

export async function getPlannedMeals(): Promise<PlannedMeal[]> {
    const response = await api.get<ListResponse<PlannedMeal>>(API_ENDPOINTS.meal.plannedMeals);
    return normalizeList(response.data);
}
