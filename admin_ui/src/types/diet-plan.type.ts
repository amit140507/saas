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
    quantity_g: string;
    notes: string | null;
}

export interface PlannedMeal {
    id: string;
    tenant?: string;
    plan: string;
    day_number: number;
    meal_slot: string;
    notes: string | null;
    items?: PlannedMealItem[];
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
