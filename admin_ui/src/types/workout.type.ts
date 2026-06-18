export type WorkoutPlanType = "workout" | "diet" | "hybrid";
export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced";
export type WorkoutAssignmentStatus = "active" | "completed" | "paused" | "cancelled";

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
    plan_type: WorkoutPlanType;
    difficulty: WorkoutDifficulty;
    description: string | null;
    goal: string | null;
    duration_weeks: number;
    created_by: string | null;
    created_by_name?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkoutPlanPayload {
    tenant?: string;
    title: string;
    plan_type: WorkoutPlanType;
    difficulty: WorkoutDifficulty;
    description: string;
    goal: string;
    duration_weeks: number;
    is_active: boolean;
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
    created_at: string;
    updated_at: string;
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
    weight: number | null;
    sets: number;
    reps: string;
    rest: number;
    notes: string | null;
    exercise_type: 1 | 2 | 3;
}

export interface WorkoutExercisePayload {
    workout_day: string | number;
    exercise: string;
    weight: number | null;
    sets: number;
    reps: string;
    rest: number;
    notes: string;
    exercise_type: 1 | 2 | 3;
}

export interface WorkoutDay {
    id: string | number;
    tenant?: string;
    plan_assignment: string;
    name: string;
    day_number: number;
    notes: string | null;
    exercises?: WorkoutExercise[];
}

export interface WorkoutDayPayload {
    tenant?: string;
    plan_assignment: string;
    name: string;
    day_number: number;
    notes: string;
}

export interface WorkoutSession {
    id: string;
    tenant?: string;
    client: string;
    plan_assignment: string | null;
    workout_day: string | number | null;
    session_date: string;
    logs?: WorkoutLog[];
    created_at: string;
}

export interface WorkoutSessionPayload {
    tenant?: string;
    client: string;
    plan_assignment: string | null;
    workout_day: string | number | null;
    session_date: string;
}

export interface WorkoutLog {
    id: string;
    tenant?: string;
    session: string;
    exercise: string;
    exercise_name?: string;
    plan_exercise: string | number | null;
    planned_sets: number | null;
    planned_reps: number | null;
    planned_weight: number | null;
    notes: string;
    sets?: SetLog[];
}

export interface WorkoutLogPayload {
    tenant?: string;
    session: string;
    exercise: string;
    plan_exercise: string | number | null;
    planned_sets: number | null;
    planned_reps: number | null;
    planned_weight: number | null;
    notes: string;
}

export interface SetLog {
    id: string;
    tenant?: string;
    workout_log: string;
    set_number: number;
    reps: number;
    weight: number;
    rest_sec: number;
    is_pr: boolean;
}

export interface SetLogPayload {
    tenant?: string;
    workout_log: string;
    set_number: number;
    reps: number;
    weight: number;
    rest_sec: number;
    is_pr: boolean;
}
