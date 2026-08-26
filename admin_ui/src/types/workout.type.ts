export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced";
export type WorkoutAssignmentStatus = "active" | "completed" | "paused" | "cancelled";
export type WorkoutDayType = "training" | "active_recovery" | "off";
export type ExerciseTrainingLocation = "gym" | "home";
export type WorkoutType = "push" | "pull" | "legs" | "";
export type ExerciseType = 1 | 2 | 3;
export type ExerciseRepsRange = "" | "4-6" | "6-8" | "8-10" | "10-12" | "12-15" | "15-20";
export type ExerciseRestPeriod = 15 | 30 | 45 | 60 | 75 | 90 | 105 | 120;
export type WorkoutSetMethod = "normal" | "superset" | "drop_set";

export interface MuscleGroup {
    id: string | number;
    name: string;
}

export interface MuscleGroupPayload {
    name: string;
}

export interface Muscle {
    id: string | number;
    muscle_group: string | number;
    muscle_group_name?: string;
    name: string;
}

export interface MusclePayload {
    muscle_group: string | number;
    name: string;
}

export interface ExerciseMedia {
    id: string | number;
    exercise: string;
    youtube_url: string | null;
}

export interface ExerciseMuscle {
    id: string | number;
    exercise: string;
    muscle: string | number;
    muscle_name?: string;
    muscle_group?: string | number;
    muscle_group_name?: string;
    is_primary: boolean;
}

export interface Exercise {
    id: string;
    tenant?: string;
    name: string;
    primary_muscle: string | number | null;
    primary_muscle_name?: string | null;
    muscle_group?: string | number | null;
    muscle_group_name?: string | null;
    training_location?: ExerciseTrainingLocation | null;
    workout_type?: WorkoutType | null;
    exercise_type: ExerciseType;
    reps: ExerciseRepsRange;
    rest: ExerciseRestPeriod | null;
    equipment_required: boolean;
    instructions: string | null;
    is_active: boolean;
    media?: ExerciseMedia[];
    muscles?: ExerciseMuscle[];
    created_at?: string;
    updated_at?: string;
}

export interface ExercisePayload {
    tenant?: string;
    name: string;
    primary_muscle: string | number;
    training_location: ExerciseTrainingLocation;
    workout_type: WorkoutType;
    exercise_type: ExerciseType;
    reps: ExerciseRepsRange;
    rest: ExerciseRestPeriod | null;
    equipment_required: boolean;
    instructions: string;
    is_active: boolean;
    muscle_links: Array<{
        muscle: string | number;
        is_primary: boolean;
    }>;
    media_items: Array<{
        youtube_url: string;
    }>;
}

export interface WorkoutPlan {
    id: string;
    tenant?: string;
    title: string;
    difficulty: WorkoutDifficulty;
    description: string | null;
    goal: string | null;
    duration_weeks: number;
    created_by: string | null;
    created_by_name?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    template_days?: WorkoutDay[];
}

export interface WorkoutPlanPayload {
    tenant?: string;
    title: string;
    difficulty: WorkoutDifficulty;
    description: string;
    goal: string;
    duration_weeks: number;
    is_active: boolean;
    days?: WorkoutDayTemplatePayload[];
}

export interface WorkoutPlanAssignment {
    id: string;
    tenant?: string;
    client: string;
    client_name?: string;
    plan: string;
    plan_title?: string;
    assigned_by: string | null;
    start_date: string;
    end_date: string | null;
    status: WorkoutAssignmentStatus;
    notes: string | null;
    share_token?: string;
    created_at: string;
    updated_at: string;
    workout_days?: WorkoutDay[];
}

export interface WorkoutPlanAssignmentPayload {
    tenant?: string;
    client: string;
    plan: string;
    start_date: string;
    end_date: string | null;
    status: WorkoutAssignmentStatus;
    notes: string;
}

export interface WorkoutExercise {
    id: string | number;
    workout_day: string | number;
    exercise: string;
    exercise_name?: string;
    exercise_video_urls?: string[];
    sequence: number;
    body_part: string | null;
    video_url: string | null;
    weight: number | null;
    sets: number;
    reps: string;
    rest: number;
    set_method: WorkoutSetMethod;
    superset_group: string | null;
    notes: string | null;
    exercise_type: ExerciseType;
}

export interface WorkoutExercisePayload {
    workout_day: string | number;
    exercise: string;
    sequence?: number;
    body_part?: string | null;
    video_url?: string | null;
    weight: number | null;
    sets: number;
    reps: string;
    rest: number;
    set_method?: WorkoutSetMethod;
    superset_group?: string | null;
    notes: string;
}

export interface WorkoutDay {
    id: string | number;
    tenant?: string;
    plan?: string | null;
    plan_assignment?: string | null;
    name: string;
    day_number: number;
    day_type: WorkoutDayType;
    notes: string | null;
    exercises?: WorkoutExercise[];
}

export interface WorkoutDayPayload {
    tenant?: string;
    plan?: string | null;
    plan_assignment?: string | null;
    name: string;
    day_number: number;
    day_type: WorkoutDayType;
    notes: string;
}

export interface WorkoutExerciseTemplatePayload {
    exercise: string;
    sequence: number;
    body_part: string | null;
    video_url: string | null;
    weight: number | null;
    sets: number;
    reps: string;
    rest: number;
    set_method: WorkoutSetMethod;
    superset_group: string | null;
    notes: string;
}

export interface WorkoutDayTemplatePayload {
    name: string;
    day_number: number;
    day_type: WorkoutDayType;
    notes: string;
    exercises: WorkoutExerciseTemplatePayload[];
}
