import api from "@/lib/api";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type {
    Exercise,
    ExercisePayload,
    Muscle,
    MusclePayload,
    MuscleGroup,
    MuscleGroupPayload,
    SetLog,
    SetLogPayload,
    WorkoutDay,
    WorkoutDayPayload,
    WorkoutExercise,
    WorkoutExercisePayload,
    WorkoutLog,
    WorkoutLogPayload,
    WorkoutPlan,
    WorkoutPlanAssignment,
    WorkoutPlanAssignmentPayload,
    WorkoutPlanPayload,
    WorkoutSession,
    WorkoutSessionPayload,
} from "@/types/workout.type";

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

export async function getWorkoutPlans(): Promise<WorkoutPlan[]> {
    const response = await api.get<ListResponse<WorkoutPlan>>(API_ENDPOINTS.workout.plans);
    return normalizeList(response.data);
}

export async function createWorkoutPlan(payload: WorkoutPlanPayload): Promise<WorkoutPlan> {
    const response = await api.post<WorkoutPlan>(API_ENDPOINTS.workout.plans, payload);
    return response.data;
}

export async function updateWorkoutPlan(id: string, payload: WorkoutPlanPayload): Promise<WorkoutPlan> {
    const response = await api.put<WorkoutPlan>(API_ENDPOINTS.workout.planDetail(id), payload);
    return response.data;
}

export async function deleteWorkoutPlan(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.planDetail(id));
}

export async function getMuscleGroups(): Promise<MuscleGroup[]> {
    const response = await api.get<ListResponse<MuscleGroup>>(API_ENDPOINTS.workout.muscleGroups);
    return normalizeList(response.data);
}

export async function createMuscleGroup(payload: MuscleGroupPayload): Promise<MuscleGroup> {
    const response = await api.post<MuscleGroup>(API_ENDPOINTS.workout.muscleGroups, payload);
    return response.data;
}

export async function updateMuscleGroup(id: string | number, payload: MuscleGroupPayload): Promise<MuscleGroup> {
    const response = await api.put<MuscleGroup>(API_ENDPOINTS.workout.muscleGroupDetail(id), payload);
    return response.data;
}

export async function deleteMuscleGroup(id: string | number): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.muscleGroupDetail(id));
}

export async function getMuscles(): Promise<Muscle[]> {
    const response = await api.get<ListResponse<Muscle>>(API_ENDPOINTS.workout.muscles);
    return normalizeList(response.data);
}

export async function createMuscle(payload: MusclePayload): Promise<Muscle> {
    const response = await api.post<Muscle>(API_ENDPOINTS.workout.muscles, payload);
    return response.data;
}

export async function updateMuscle(id: string | number, payload: MusclePayload): Promise<Muscle> {
    const response = await api.put<Muscle>(API_ENDPOINTS.workout.muscleDetail(id), payload);
    return response.data;
}

export async function deleteMuscle(id: string | number): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.muscleDetail(id));
}

export async function getExercises(): Promise<Exercise[]> {
    const response = await api.get<ListResponse<Exercise>>(API_ENDPOINTS.workout.exercises);
    return normalizeList(response.data);
}

export async function createExercise(payload: ExercisePayload): Promise<Exercise> {
    const response = await api.post<Exercise>(API_ENDPOINTS.workout.exercises, payload);
    return response.data;
}

export async function updateExercise(id: string, payload: ExercisePayload): Promise<Exercise> {
    const response = await api.put<Exercise>(API_ENDPOINTS.workout.exerciseDetail(id), payload);
    return response.data;
}

export async function deleteExercise(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.exerciseDetail(id));
}

export async function getWorkoutAssignments(): Promise<WorkoutPlanAssignment[]> {
    const response = await api.get<ListResponse<WorkoutPlanAssignment>>(API_ENDPOINTS.workout.assignments);
    return normalizeList(response.data);
}

export async function createWorkoutAssignment(
    payload: WorkoutPlanAssignmentPayload,
): Promise<WorkoutPlanAssignment> {
    const response = await api.post<WorkoutPlanAssignment>(API_ENDPOINTS.workout.assignments, payload);
    return response.data;
}

export async function updateWorkoutAssignment(
    id: string,
    payload: WorkoutPlanAssignmentPayload,
): Promise<WorkoutPlanAssignment> {
    const response = await api.put<WorkoutPlanAssignment>(API_ENDPOINTS.workout.assignmentDetail(id), payload);
    return response.data;
}

export async function deleteWorkoutAssignment(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.assignmentDetail(id));
}

export async function getWorkoutDays(): Promise<WorkoutDay[]> {
    const response = await api.get<ListResponse<WorkoutDay>>(API_ENDPOINTS.workout.days);
    return normalizeList(response.data);
}

export async function createWorkoutDay(payload: WorkoutDayPayload): Promise<WorkoutDay> {
    const response = await api.post<WorkoutDay>(API_ENDPOINTS.workout.days, payload);
    return response.data;
}

export async function updateWorkoutDay(id: string | number, payload: WorkoutDayPayload): Promise<WorkoutDay> {
    const response = await api.put<WorkoutDay>(API_ENDPOINTS.workout.dayDetail(id), payload);
    return response.data;
}

export async function deleteWorkoutDay(id: string | number): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.dayDetail(id));
}

export async function getWorkoutExercises(): Promise<WorkoutExercise[]> {
    const response = await api.get<ListResponse<WorkoutExercise>>(API_ENDPOINTS.workout.workoutExercises);
    return normalizeList(response.data);
}

export async function createWorkoutExercise(payload: WorkoutExercisePayload): Promise<WorkoutExercise> {
    const response = await api.post<WorkoutExercise>(API_ENDPOINTS.workout.workoutExercises, payload);
    return response.data;
}

export async function updateWorkoutExercise(id: string | number, payload: WorkoutExercisePayload): Promise<WorkoutExercise> {
    const response = await api.put<WorkoutExercise>(API_ENDPOINTS.workout.workoutExerciseDetail(id), payload);
    return response.data;
}

export async function deleteWorkoutExercise(id: string | number): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.workoutExerciseDetail(id));
}

export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
    const response = await api.get<ListResponse<WorkoutSession>>(API_ENDPOINTS.workout.sessions);
    return normalizeList(response.data);
}

export async function createWorkoutSession(payload: WorkoutSessionPayload): Promise<WorkoutSession> {
    const response = await api.post<WorkoutSession>(API_ENDPOINTS.workout.sessions, payload);
    return response.data;
}

export async function updateWorkoutSession(id: string, payload: WorkoutSessionPayload): Promise<WorkoutSession> {
    const response = await api.put<WorkoutSession>(API_ENDPOINTS.workout.sessionDetail(id), payload);
    return response.data;
}

export async function deleteWorkoutSession(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.sessionDetail(id));
}

export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
    const response = await api.get<ListResponse<WorkoutLog>>(API_ENDPOINTS.workout.logs);
    return normalizeList(response.data);
}

export async function createWorkoutLog(payload: WorkoutLogPayload): Promise<WorkoutLog> {
    const response = await api.post<WorkoutLog>(API_ENDPOINTS.workout.logs, payload);
    return response.data;
}

export async function updateWorkoutLog(id: string, payload: WorkoutLogPayload): Promise<WorkoutLog> {
    const response = await api.put<WorkoutLog>(API_ENDPOINTS.workout.logDetail(id), payload);
    return response.data;
}

export async function deleteWorkoutLog(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.logDetail(id));
}

export async function getSetLogs(): Promise<SetLog[]> {
    const response = await api.get<ListResponse<SetLog>>(API_ENDPOINTS.workout.sets);
    return normalizeList(response.data);
}

export async function createSetLog(payload: SetLogPayload): Promise<SetLog> {
    const response = await api.post<SetLog>(API_ENDPOINTS.workout.sets, payload);
    return response.data;
}

export async function updateSetLog(id: string, payload: SetLogPayload): Promise<SetLog> {
    const response = await api.put<SetLog>(API_ENDPOINTS.workout.setDetail(id), payload);
    return response.data;
}

export async function deleteSetLog(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.workout.setDetail(id));
}
