const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";

export interface SharedWorkoutExercise {
    id: string | number;
    exercise_name?: string;
    exercise_video_urls?: string[];
    sequence: number;
    body_part: string | null;
    video_url: string | null;
    weight: number | null;
    sets: number;
    reps: string;
    rest: number;
    notes: string | null;
    exercise_type: 1 | 2 | 3;
}

export interface SharedWorkoutDay {
    id: string | number;
    name: string;
    day_number: number;
    notes: string | null;
    exercises?: SharedWorkoutExercise[];
}

export interface SharedWorkoutAssignment {
    id: string;
    plan_title: string;
    client_name: string;
    start_date: string;
    end_date: string | null;
    status: string;
    notes: string | null;
    workout_days?: SharedWorkoutDay[];
}

function normalizeApiUrl(value: string): string {
    return value.trim().replace(/\/+$/, "") + "/";
}

export async function getSharedWorkoutAssignment(token: string): Promise<SharedWorkoutAssignment | null> {
    const response = await fetch(`${normalizeApiUrl(API_URL)}workout/shared-assignments/${token}/`, {
        cache: "no-store",
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Could not load workout plan.");
    }

    return response.json() as Promise<SharedWorkoutAssignment>;
}
