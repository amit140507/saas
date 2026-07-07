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
