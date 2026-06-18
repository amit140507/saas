import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";

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
