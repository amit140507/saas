export type DietGoal = "fat_loss" | "muscle_gain" | "maintenance" | "other" | "";

export interface FoodItem {
    id: string;
    name: string;
    brand: string | null;
    calories_per_100g: string;
    protein_g: string;
    carbs_g: string;
    fat_g: string;
    fiber_g: string;
    is_verified: boolean;
    metadata: Record<string, unknown>;
}

export interface FoodItemPayload {
    name: string;
    brand: string | null;
    calories_per_100g: string;
    protein_g: string;
    carbs_g: string;
    fat_g: string;
    fiber_g: string;
    is_verified: boolean;
    metadata: Record<string, unknown>;
}

export interface PlannedMealItem {
    id: string;
    tenant?: string;
    meal: string;
    food_item: string;
    food_item_name?: string;
    quantity: string;
    quantity_unit: "g" | "ml";
    notes: string | null;
}

export interface PlannedMealSupplement {
    id: string;
    tenant?: string;
    meal: string;
    supplement_id: string;
    name: string;
    amount: string | null;
    unit: string;
}

export interface PlannedMeal {
    id: string;
    tenant?: string;
    plan: string;
    day_number: number;
    meal_slot: string;
    notes: string | null;
    items?: PlannedMealItem[];
    supplements?: PlannedMealSupplement[];
}

export interface DietPlan {
    id: string;
    tenant?: string;
    title: string;
    goal: DietGoal | null;
    calories_target: number | null;
    protein_target: number | null;
    carbs_target: number | null;
    fat_target: number | null;
    created_by: string | null;
    is_active: boolean;
    meals?: PlannedMeal[];
}

export interface DietPlanPayload {
    tenant?: string;
    title: string;
    goal: Exclude<DietGoal, ""> | null;
    calories_target: number | null;
    protein_target: number | null;
    carbs_target: number | null;
    fat_target: number | null;
    is_active: boolean;
    meal_templates?: PlannedMealTemplatePayload[];
}

export interface PlannedMealTemplatePayload {
    day_number: number;
    meal_slot: string;
    notes: string;
    items: Array<{
        food_item: string;
        quantity: string;
        quantity_unit: "g" | "ml";
        notes: string;
    }>;
    supplements: Array<{
        supplement_id: string;
        name: string;
        amount: string | null;
        unit: string;
    }>;
}

export interface DietPlanAssignment {
    id: string;
    tenant?: string;
    client: string;
    client_name?: string;
    plan: string;
    plan_title?: string;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    adjustments: Record<string, unknown>;
    share_token?: string;
}

export interface DietPlanAssignmentPayload {
    tenant?: string;
    client: string;
    plan: string;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    adjustments: Record<string, unknown>;
}

export type MealAdherenceStatus = "completed" | "modified" | "skipped";

export interface MealAdherenceLog {
    id: string;
    tenant?: string;
    client: string;
    plan_assignment: string;
    planned_meal: string;
    planned_meal_slot?: string;
    planned_meal_notes?: string | null;
    log_date: string;
    status: MealAdherenceStatus;
    notes: string;
    created_at?: string;
    updated_at?: string;
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
    assignment: DietPlanAssignment | null;
    day_number: number | null;
    meals: PlannedMeal[];
    logs: MealAdherenceLog[];
    adherence: MealAdherenceSummary;
}

export interface WeeklyMealAdherence {
    client: string;
    week_start: string;
    week_end: string;
    summary: MealAdherenceSummary;
    days: Array<{
        date: string;
        planned_count: number;
        tracked_count: number;
        completed_count: number;
        modified_count: number;
        skipped_count: number;
        strict_adherence_percent: number;
        flexible_adherence_percent: number;
    }>;
}
