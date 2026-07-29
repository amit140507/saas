export interface CheckInPlanData {
    id: string;
    client: string;
    start_date: string;
    created_at: string;
    daily_logs?: CheckInLogData[];
}

export interface CheckInLogData {
    id: string | number;
    tenant: string;
    plan: string;
    week_number: number;
    date: string;
    fluid_intake: number | null;
    hunger_level: number | null;
    hunger_level_display?: string;
    craving_level: number | null;
    off_plan_meal: boolean;
    off_plan_meal_details: string | null;
    steps: number | null;
    cardio: boolean;
    cardio_duration: number | null;
    strength_training: boolean;
    strength_training_details: string | null;
    motivation: number | null;
    performance: number | null;
    muscle_soreness: number | null;
    energy_levels: number | null;
    stress_levels: number | null;
    stool_frequency: number | null;
    stool_quality: string | null;
    gi_distress: string | null;
    sleep_duration: number | null;
    sleep_quality: number | null;
    notes: string | null;
}
