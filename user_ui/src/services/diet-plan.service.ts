import api from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";

export interface SharedDietMealItem {
    id: string | number;
    food_item: string;
    food_item_name?: string;
    quantity_g: string;
    notes: string | null;
}

export interface SharedDietMealSupplement {
    id: string | number;
    supplement_id: string;
    name: string;
    amount: string | null;
    unit: string;
}

export interface SharedDietMeal {
    id: string | number;
    day_number: number;
    meal_slot: string;
    notes: string | null;
    items?: SharedDietMealItem[];
    supplements?: SharedDietMealSupplement[];
}

export type MealAdherenceStatus = "completed" | "modified" | "skipped";

export interface SharedDietAssignment {
    id: string;
    plan_title: string;
    client_name: string;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    adjustments: Record<string, unknown>;
    goal: string | null;
    calories_target: number | null;
    protein_target: number | null;
    carbs_target: number | null;
    fat_target: number | null;
    meals?: SharedDietMeal[];
}

export interface MealAdherenceLog {
    id: string;
    client: string;
    plan_assignment: string;
    planned_meal: string;
    planned_meal_slot?: string;
    planned_meal_notes?: string | null;
    log_date: string;
    status: MealAdherenceStatus;
    notes: string;
}

export interface MealAdherenceSummary {
    planned_count: number;
    tracked_count: number;
    completed_count: number;
    modified_count: number;
    skipped_count: number;
    strict_adherence_percent: number;
    flexible_adherence_percent: number;
}

export interface CurrentDietPlanTracking {
    client: string;
    date: string;
    assignment: SharedDietAssignment | null;
    day_number: number | null;
    meals: SharedDietMeal[];
    logs: MealAdherenceLog[];
    adherence: MealAdherenceSummary;
}

function normalizeApiUrl(value: string): string {
    return value.trim().replace(/\/+$/, "") + "/";
}

export async function getSharedDietAssignment(token: string): Promise<SharedDietAssignment | null> {
    const response = await fetch(`${normalizeApiUrl(API_URL)}meal/shared-assignments/${token}/`, {
        cache: "no-store",
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Could not load diet plan.");
    }

    return response.json() as Promise<SharedDietAssignment>;
}

export async function getMyCurrentDietPlan(date: string): Promise<CurrentDietPlanTracking> {
    const response = await api.get<CurrentDietPlanTracking>("meal/my-plan/current/", {
        params: { date },
    });
    return response.data;
}

export async function saveMyMealLog(
    clientId: string,
    payload: { planned_meal: string; log_date: string; status: MealAdherenceStatus; notes?: string },
): Promise<MealAdherenceLog> {
    const response = await api.post<MealAdherenceLog>(`meal/clients/${clientId}/meal-logs/`, payload);
    return response.data;
}
