"use client";

import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ChevronDownIcon,
    ChevronRightIcon,
    DownloadIcon,
    DumbbellIcon,
    EditIcon,
    EyeIcon,
    GripVerticalIcon,
    LayersIcon,
    LibraryIcon,
    Loader2Icon,
    PlusIcon,
    SearchIcon,
    SendIcon,
    Trash2Icon,
    UsersIcon,
    XIcon,
} from "lucide-react";

import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";
import { getClients } from "@/services/client.service";
import {
    createExercise,
    createMuscle,
    createMuscleGroup,
    createWorkoutPlan,
    deleteExercise,
    deleteMuscle,
    deleteMuscleGroup,
    deleteWorkoutAssignment,
    deleteWorkoutPlan,
    downloadWorkoutAssignmentPdf,
    getExercises,
    getMuscleGroups,
    getMuscles,
    getWorkoutAssignments,
    getWorkoutPlans,
    sendWorkoutAssignmentPdf,
    updateExercise,
    updateMuscle,
    updateMuscleGroup,
    updateWorkoutAssignment,
    updateWorkoutPlan,
} from "@/services/workout.service";
import { useCurrentUserPermissions } from "@/lib/permissions";
import type { ClientData } from "@/types/client.type";
import type {
    Exercise,
    ExercisePayload,
    Muscle,
    MusclePayload,
    MuscleGroup,
    MuscleGroupPayload,
    WorkoutAssignmentStatus,
    WorkoutDay,
    WorkoutDayType,
    WorkoutDayTemplatePayload,
    WorkoutDifficulty,
    ExerciseType,
    ExerciseRepsRange,
    ExerciseRestPeriod,
    ExerciseTrainingLocation,
    WorkoutType,
    WorkoutExercise,
    WorkoutExerciseTemplatePayload,
    WorkoutPlan,
    WorkoutPlanAssignment,
    WorkoutPlanAssignmentPayload,
    WorkoutPlanPayload,
} from "@/types/workout.type";

export type WorkoutSection = "plans" | "library" | "muscles" | "muscleGroups" | "assignments";
type TabId = WorkoutSection;
type ModalMode = "add" | "edit";
type DeleteTarget =
    | { type: "plan"; id: string; label: string }
    | { type: "muscleGroup"; id: string | number; label: string }
    | { type: "muscle"; id: string | number; label: string }
    | { type: "exercise"; id: string; label: string }
    | { type: "assignment"; id: string; label: string };

interface ApiErrorShape {
    response?: {
        data?: {
            error?: string;
            detail?: string;
            non_field_errors?: string[];
        };
    };
    message?: string;
}

export interface PlanForm {
    title: string;
    difficulty: WorkoutDifficulty;
    goal: string;
    duration_weeks: string;
    description: string;
    is_active: boolean;
    days: PlanDayForm[];
}

export interface PlanDayForm {
    id: string;
    name: string;
    day_number: string;
    day_type: WorkoutDayType;
    notes: string;
    exercises: PlanExerciseRowForm[];
}

export interface PlanExerciseRowForm {
    id: string;
    muscle_group: string;
    body_part: string;
    exercise: string;
    exercise_search: string;
    sets: string;
    reps: string;
    rest: string;
    video_url: string;
    notes: string;
}

interface ExerciseForm {
    name: string;
    muscle_group: string;
    primary_muscle: string;
    secondary_muscles: string[];
    media_urls: string[];
    training_location: "" | ExerciseTrainingLocation;
    workout_type: WorkoutType;
    exercise_type: ExerciseType;
    reps: ExerciseRepsRange;
    rest: "" | `${ExerciseRestPeriod}`;
    equipment_required: boolean;
    instructions: string;
    is_active: boolean;
}

interface MuscleForm {
    name: string;
}

interface MuscleItemForm {
    muscle_group: string;
    name: string;
}

interface AssignmentForm {
    client: string;
    plan: string;
    start_date: string;
    end_date: string;
    status: WorkoutAssignmentStatus;
    notes: string;
}

const tabs: Array<{ id: TabId; label: string; icon: typeof DumbbellIcon }> = [
    { id: "plans", label: "Plans", icon: DumbbellIcon },
    { id: "library", label: "Exercise Library", icon: LibraryIcon },
    { id: "muscles", label: "Muscles", icon: DumbbellIcon },
    { id: "muscleGroups", label: "Muscle Groups", icon: LayersIcon },
    { id: "assignments", label: "Assignments", icon: UsersIcon },
];

function createFormId(): string {
    return `form-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPlanExerciseRow(overrides: Partial<PlanExerciseRowForm> = {}): PlanExerciseRowForm {
    return {
        id: createFormId(),
        muscle_group: "",
        body_part: "",
        exercise: "",
        exercise_search: "",
        sets: "3",
        reps: "8-12",
        rest: "90",
        video_url: "",
        notes: "",
        ...overrides,
    };
}

export function createPlanDay(overrides: Partial<PlanDayForm> = {}): PlanDayForm {
    return {
        id: createFormId(),
        name: "MONDAY: BACK, SHOULDERS & CORE",
        day_number: "1",
        day_type: "training",
        notes: "",
        exercises: [],
        ...overrides,
    };
}

export const emptyPlanForm: PlanForm = {
    title: "",
    difficulty: "beginner",
    goal: "",
    duration_weeks: "12",
    description: "",
    is_active: true,
    days: [createPlanDay()],
};

const emptyExerciseForm: ExerciseForm = {
    name: "",
    muscle_group: "",
    primary_muscle: "",
    secondary_muscles: [],
    media_urls: [""],
    training_location: "",
    workout_type: "",
    exercise_type: 3,
    reps: "",
    rest: "",
    equipment_required: false,
    instructions: "",
    is_active: true,
};

const emptyMuscleForm: MuscleForm = {
    name: "",
};

const emptyMuscleItemForm: MuscleItemForm = {
    muscle_group: "",
    name: "",
};

const emptyAssignmentForm: AssignmentForm = {
    client: "",
    plan: "",
    start_date: "",
    end_date: "",
    status: "active",
    notes: "",
};

const emptyPlans: WorkoutPlan[] = [];
const emptyMuscleGroups: MuscleGroup[] = [];
const emptyMuscles: Muscle[] = [];
const emptyExercises: Exercise[] = [];
const emptyAssignments: WorkoutPlanAssignment[] = [];
const emptyClients: ClientData[] = [];

export const repsOptions: ExerciseRepsRange[] = ["", "4-6", "6-8", "8-10", "10-12", "12-15", "15-20"];
export const restOptions: Array<"" | ExerciseRestPeriod> = ["", 15, 30, 45, 60, 75, 90, 105, 120];

export function getErrorMessage(error: unknown): string {
    const apiError = error as ApiErrorShape;
    const data = apiError.response?.data;
    return data?.error || data?.detail || data?.non_field_errors?.join(" ") || apiError.message || "Something went wrong.";
}

export function clientName(client?: ClientData): string {
    if (!client) {
        return "Unknown client";
    }

    const fullName = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
    return fullName || client.user.email || client.id;
}

function statusClasses(status: string): string {
    if (status === "active") {
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
    }

    if (status === "paused") {
        return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
    }

    if (status === "completed") {
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300";
    }

    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function getTrainingLocationLabel(location?: ExerciseTrainingLocation | null): string {
    if (location === "gym") return "Gym";
    if (location === "home") return "Home";
    return "Not set";
}

function getWorkoutTypeLabel(workoutType?: WorkoutType | null): string {
    if (workoutType === "push") return "Push";
    if (workoutType === "pull") return "Pull";
    if (workoutType === "legs") return "Legs";
    return "Not set";
}

function getWorkoutDayTypeLabel(dayType?: WorkoutDayType | null): string {
    if (dayType === "active_recovery") return "Active Recovery";
    if (dayType === "off") return "Off Day";
    return "Training";
}

function dayTypeClasses(dayType?: WorkoutDayType | null): string {
    if (dayType === "active_recovery") {
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
    }

    if (dayType === "off") {
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }

    return "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200";
}

function compactStrings(values: string[]): string[] {
    return values.map((value) => value.trim()).filter(Boolean);
}

export function getExerciseBodyPart(exercise?: Exercise): string {
    return exercise?.muscle_group_name || exercise?.primary_muscle_name || "";
}

export function getExerciseMuscleGroupId(exercise?: Exercise): string {
    return exercise?.muscle_group ? String(exercise.muscle_group) : "";
}

export function getExerciseVideoUrls(exercise?: Exercise): string[] {
    return (exercise?.media || []).map((media) => media.youtube_url || "").filter(Boolean);
}

export function createPlanExerciseRowFromExercise(exercise: Exercise): PlanExerciseRowForm {
    return createPlanExerciseRow({
        exercise: exercise.id,
        muscle_group: getExerciseMuscleGroupId(exercise),
        body_part: getExerciseBodyPart(exercise),
        exercise_search: exercise.name,
        video_url: getExerciseVideoUrls(exercise)[0] || "",
        reps: exercise.reps || "8-12",
        rest: exercise.rest ? String(exercise.rest) : "90",
    });
}

function getWorkoutExerciseTypeLabel(type: ExerciseType): string {
    if (type === 1) return "Body Weight";
    if (type === 2) return "Pin Loaded";
    return "Free Weight";
}

function getRestLabel(rest?: ExerciseRestPeriod | null): string {
    return rest ? `${rest}s` : "-";
}

function mapWorkoutExerciseToForm(row: WorkoutExercise, exerciseById: Map<string, Exercise>): PlanExerciseRowForm {
    const exercise = exerciseById.get(row.exercise);

    return createPlanExerciseRow({
        muscle_group: getExerciseMuscleGroupId(exercise),
        body_part: row.body_part || "",
        exercise: row.exercise,
        exercise_search: row.exercise_name || exercise?.name || "",
        sets: String(row.sets || 1),
        reps: row.reps || "",
        rest: String(row.rest || 0),
        video_url: row.video_url || row.exercise_video_urls?.[0] || "",
        notes: row.notes || "",
    });
}

export function mapWorkoutDayToForm(day: WorkoutDay, exerciseById: Map<string, Exercise>): PlanDayForm {
    const sortedExercises = [...(day.exercises || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    return createPlanDay({
        name: day.name,
        day_number: String(day.day_number),
        day_type: day.day_type || "training",
        notes: day.notes || "",
        exercises: sortedExercises.map((row) => mapWorkoutExerciseToForm(row, exerciseById)),
    });
}

export function buildWorkoutPlanPayload(
    planForm: PlanForm,
    exerciseById: Map<string, Exercise>,
    tenantPayload: Pick<WorkoutPlanPayload, "tenant"> = {},
): { payload: WorkoutPlanPayload | null; error: string } {
    const durationWeeks = Number(planForm.duration_weeks);
    if (!planForm.title.trim()) {
        return { payload: null, error: "Plan title is required." };
    }
    if (!Number.isInteger(durationWeeks) || durationWeeks < 1) {
        return { payload: null, error: "Duration must be a whole number greater than zero." };
    }

    const daysPayload: WorkoutDayTemplatePayload[] = [];
    for (const [dayIndex, day] of planForm.days.entries()) {
        const dayNumber = Number(day.day_number);
        if (!day.name.trim()) {
            return { payload: null, error: "Each workout day needs a title." };
        }
        if (!Number.isInteger(dayNumber) || dayNumber < 1) {
            return { payload: null, error: "Each workout day needs a valid day number." };
        }
        if (day.day_type === "off" && day.exercises.length > 0) {
            return { payload: null, error: "Off days cannot include exercises." };
        }

        const exercisesPayload: WorkoutExerciseTemplatePayload[] = [];
        for (const [rowIndex, row] of (day.day_type === "training" ? day.exercises : []).entries()) {
            const selectedExercise = exerciseById.get(row.exercise);
            const sets = Number(row.sets);
            const rest = Number(row.rest);
            if (!row.exercise) {
                return { payload: null, error: "Each workout row needs an exercise." };
            }
            if (!Number.isInteger(sets) || sets < 1) {
                return { payload: null, error: "Sets must be a whole number greater than zero." };
            }
            if (!row.reps.trim()) {
                return { payload: null, error: "Rep range is required for every workout row." };
            }
            if (!row.rest) {
                return { payload: null, error: "Rest is required for every workout row." };
            }
            if (!Number.isInteger(rest) || rest < 0) {
                return { payload: null, error: "Rest must be a whole number of seconds." };
            }

            exercisesPayload.push({
                exercise: row.exercise,
                sequence: rowIndex + 1,
                body_part: getExerciseBodyPart(selectedExercise) || null,
                video_url: row.video_url.trim() || null,
                weight: null,
                sets,
                reps: row.reps.trim(),
                rest,
                notes: row.notes.trim(),
            });
        }

        daysPayload.push({
            name: day.name.trim(),
            day_number: dayNumber || dayIndex + 1,
            day_type: day.day_type,
            notes: day.notes.trim(),
            exercises: exercisesPayload,
        });
    }

    return {
        error: "",
        payload: {
            ...tenantPayload,
            title: planForm.title.trim(),
            difficulty: planForm.difficulty,
            goal: planForm.goal.trim(),
            duration_weeks: durationWeeks,
            description: planForm.description.trim(),
            is_active: planForm.is_active,
            days: daysPayload,
        },
    };
}

function subscribeHydrationStore() {
    return () => undefined;
}

function getClientHydrationSnapshot() {
    return true;
}

function getServerHydrationSnapshot() {
    return false;
}

export function ModalFrame({
    title,
    children,
    onClose,
    maxWidth = "max-w-2xl",
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    maxWidth?: string;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900`}>
                <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                        title="Close"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="max-h-[calc(90vh-72px)] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

interface WorkoutManagementPageProps {
    title: string;
    description: string;
    allowedTabs: WorkoutSection[];
}

export default function WorkoutManagementPage({ title, description, allowedTabs }: WorkoutManagementPageProps) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { tenantId } = useCurrentUserPermissions();
    const visibleTabs = useMemo(() => tabs.filter((tab) => allowedTabs.includes(tab.id)), [allowedTabs]);
    const needsPlans = allowedTabs.some((tab) => tab === "plans" || tab === "assignments");
    const needsLibrary = allowedTabs.some((tab) => tab === "plans" || tab === "library" || tab === "muscles" || tab === "muscleGroups");
    const needsAssignments = allowedTabs.includes("assignments");
    const needsClients = needsAssignments;
    const hasHydrated = useSyncExternalStore(
        subscribeHydrationStore,
        getClientHydrationSnapshot,
        getServerHydrationSnapshot,
    );
    const [activeTab, setActiveTab] = useState<TabId>(allowedTabs[0] || "plans");
    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    const [planModal, setPlanModal] = useState<{ mode: ModalMode; item: WorkoutPlan | null } | null>(null);
    const [exerciseModal, setExerciseModal] = useState<{ mode: ModalMode; item: Exercise | null } | null>(null);
    const [muscleModal, setMuscleModal] = useState<{ mode: ModalMode; item: MuscleGroup | null } | null>(null);
    const [muscleItemModal, setMuscleItemModal] = useState<{ mode: ModalMode; item: Muscle | null } | null>(null);
    const [assignmentModal, setAssignmentModal] = useState<{ mode: ModalMode; item: WorkoutPlanAssignment | null } | null>(null);
    const [planView, setPlanView] = useState<WorkoutPlan | null>(null);
    const [assignmentView, setAssignmentView] = useState<WorkoutPlanAssignment | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [pdfAction, setPdfAction] = useState<{ assignmentId: string; action: "download" | "send" } | null>(null);
    const [exerciseCreateTargetDayId, setExerciseCreateTargetDayId] = useState<string | null>(null);

    const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
    const [exerciseForm, setExerciseForm] = useState<ExerciseForm>(emptyExerciseForm);
    const [muscleForm, setMuscleForm] = useState<MuscleForm>(emptyMuscleForm);
    const [muscleItemForm, setMuscleItemForm] = useState<MuscleItemForm>(emptyMuscleItemForm);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm);

    const plansQuery = useQuery({ queryKey: ["workout-plans"], queryFn: getWorkoutPlans, enabled: hasHydrated && needsPlans });
    const muscleGroupsQuery = useQuery({ queryKey: ["workout-muscle-groups"], queryFn: getMuscleGroups, enabled: hasHydrated && needsLibrary });
    const musclesQuery = useQuery({ queryKey: ["workout-muscles"], queryFn: getMuscles, enabled: hasHydrated && needsLibrary });
    const exercisesQuery = useQuery({ queryKey: ["workout-exercises"], queryFn: getExercises, enabled: hasHydrated && needsLibrary });
    const assignmentsQuery = useQuery({ queryKey: ["workout-assignments"], queryFn: getWorkoutAssignments, enabled: hasHydrated && needsAssignments });
    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients, enabled: hasHydrated && needsClients });

    const plans = plansQuery.data ?? emptyPlans;
    const muscleGroups = muscleGroupsQuery.data ?? emptyMuscleGroups;
    const muscles = musclesQuery.data ?? emptyMuscles;
    const exercises = exercisesQuery.data ?? emptyExercises;
    const assignments = assignmentsQuery.data ?? emptyAssignments;
    const clients = clientsQuery.data ?? emptyClients;

    const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
    const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
    const muscleGroupById = useMemo(() => new Map(muscleGroups.map((group) => [String(group.id), group])), [muscleGroups]);
    const muscleById = useMemo(() => new Map(muscles.map((muscle) => [String(muscle.id), muscle])), [muscles]);
    const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);

    const query = search.trim().toLowerCase();

    const filteredPlans = useMemo(() => {
        return plans.filter((plan) => {
            if (!query) return true;
            return [plan.title, plan.goal || "", plan.difficulty].some((value) => value.toLowerCase().includes(query));
        });
    }, [plans, query]);

    const filteredExercises = useMemo(() => {
        return exercises.filter((exercise) => {
            if (!query) return true;
            return [
                exercise.name,
                exercise.muscle_group_name || "",
                exercise.primary_muscle_name || "",
                getTrainingLocationLabel(exercise.training_location),
                getWorkoutTypeLabel(exercise.workout_type),
                exercise.instructions || "",
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [exercises, query]);

    const filteredMuscles = useMemo(() => {
        return muscles.filter((muscle) => {
            if (!query) return true;
            return [
                muscle.name,
                muscle.muscle_group_name || muscleGroupById.get(String(muscle.muscle_group))?.name || "",
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [muscleGroupById, muscles, query]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter((assignment) => {
            if (!query) return true;
            return [
                assignment.client_name || clientName(clientById.get(assignment.client)),
                assignment.plan_title || planById.get(assignment.plan)?.title || "",
                assignment.status,
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [assignments, clientById, planById, query]);

    const invalidatePlans = async () => {
        await queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    };

    const invalidateLibrary = async () => {
        await queryClient.invalidateQueries({ queryKey: ["workout-exercises"] });
        await queryClient.invalidateQueries({ queryKey: ["workout-muscle-groups"] });
        await queryClient.invalidateQueries({ queryKey: ["workout-muscles"] });
    };

    const invalidateAssignments = async () => {
        await queryClient.invalidateQueries({ queryKey: ["workout-assignments"] });
    };

    const planMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string; payload: WorkoutPlanPayload }) => (
            mode === "add" ? createWorkoutPlan(payload) : updateWorkoutPlan(id || "", payload)
        ),
        onSuccess: async () => {
            await invalidatePlans();
            setPlanModal(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const muscleMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string | number; payload: MuscleGroupPayload }) => (
            mode === "add" ? createMuscleGroup(payload) : updateMuscleGroup(id || "", payload)
        ),
        onSuccess: async (muscle, variables) => {
            await invalidateLibrary();
            setMuscleModal(null);
            if (variables.mode === "add") {
                openExerciseModal("add", null, String(muscle.id));
            }
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const muscleItemMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string | number; payload: MusclePayload }) => (
            mode === "add" ? createMuscle(payload) : updateMuscle(id || "", payload)
        ),
        onSuccess: async (muscle, variables) => {
            await invalidateLibrary();
            setMuscleItemModal(null);
            if (variables.mode === "add" && exerciseModal) {
                setExerciseForm((current) => ({
                    ...current,
                    muscle_group: String(muscle.muscle_group),
                    primary_muscle: String(muscle.id),
                    secondary_muscles: current.secondary_muscles.filter((selectedMuscle) => selectedMuscle !== String(muscle.id)),
                }));
            }
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const exerciseMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string; payload: ExercisePayload }) => (
            mode === "add" ? createExercise(payload) : updateExercise(id || "", payload)
        ),
        onSuccess: async (exercise, variables) => {
            await invalidateLibrary();
            setExerciseModal(null);
            if (variables.mode === "add" && exerciseCreateTargetDayId) {
                addPlanExerciseRow(exerciseCreateTargetDayId, createPlanExerciseRowFromExercise(exercise));
                setExerciseCreateTargetDayId(null);
            }
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const assignmentMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: WorkoutPlanAssignmentPayload }) => (
            updateWorkoutAssignment(id, payload)
        ),
        onSuccess: async () => {
            await invalidateAssignments();
            setAssignmentModal(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const deleteMutation = useMutation({
        mutationFn: async (target: DeleteTarget) => {
            if (target.type === "plan") await deleteWorkoutPlan(target.id);
            if (target.type === "muscleGroup") await deleteMuscleGroup(target.id);
            if (target.type === "muscle") await deleteMuscle(target.id);
            if (target.type === "exercise") await deleteExercise(target.id);
            if (target.type === "assignment") await deleteWorkoutAssignment(target.id);
            return target.type;
        },
        onSuccess: async (type) => {
            if (type === "plan") await invalidatePlans();
            if (type === "muscleGroup" || type === "muscle" || type === "exercise") await invalidateLibrary();
            if (type === "assignment") await invalidateAssignments();
            setDeleteTarget(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const handleDownloadAssignmentPdf = async (assignment: WorkoutPlanAssignment) => {
        setFormError("");
        setPdfAction({ assignmentId: assignment.id, action: "download" });

        try {
            await downloadWorkoutAssignmentPdf(assignment.id);
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setPdfAction(null);
        }
    };

    const handleSendAssignmentPdf = async (assignment: WorkoutPlanAssignment) => {
        setFormError("");
        setPdfAction({ assignmentId: assignment.id, action: "send" });

        try {
            await sendWorkoutAssignmentPdf(assignment.id);
            alert("Workout plan sent successfully.");
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setPdfAction(null);
        }
    };

    const openPlanModal = (mode: ModalMode, item: WorkoutPlan | null = null) => {
        setFormError("");
        setPlanForm(item ? {
            title: item.title,
            difficulty: item.difficulty,
            goal: item.goal || "",
            duration_weeks: String(item.duration_weeks || 12),
            description: item.description || "",
            is_active: item.is_active,
            days: (item.template_days || []).length
                ? [...(item.template_days || [])]
                    .sort((a, b) => a.day_number - b.day_number)
                    .map((day) => mapWorkoutDayToForm(day, exerciseById))
                : [createPlanDay()],
        } : { ...emptyPlanForm, days: [createPlanDay()] });
        setPlanModal({ mode, item });
    };

    const openExerciseModal = (mode: ModalMode, item: Exercise | null = null, presetMuscleGroup = "") => {
        setFormError("");
        if (mode !== "add") {
            setExerciseCreateTargetDayId(null);
        }
        setExerciseForm(item ? {
            name: item.name,
            muscle_group: item.muscle_group ? String(item.muscle_group) : "",
            primary_muscle: item.primary_muscle ? String(item.primary_muscle) : "",
            secondary_muscles: (item.muscles || [])
                .filter((muscle) => !muscle.is_primary && String(muscle.muscle) !== String(item.primary_muscle || ""))
                .map((muscle) => String(muscle.muscle)),
            media_urls: (item.media || []).map((media) => media.youtube_url || "").filter(Boolean).concat(""),
            training_location: item.training_location || "",
            workout_type: item.workout_type || "",
            exercise_type: item.exercise_type || 3,
            reps: item.reps || "",
            rest: item.rest ? String(item.rest) as `${ExerciseRestPeriod}` : "",
            equipment_required: item.equipment_required,
            instructions: item.instructions || "",
            is_active: item.is_active,
        } : { ...emptyExerciseForm, muscle_group: presetMuscleGroup });
        setExerciseModal({ mode, item });
    };

    const openExerciseModalForPlanDay = (dayId: string) => {
        setExerciseCreateTargetDayId(dayId);
        openExerciseModal("add");
    };

    const openMuscleModal = (mode: ModalMode, item: MuscleGroup | null = null) => {
        setFormError("");
        setMuscleForm(item ? { name: item.name } : emptyMuscleForm);
        setMuscleModal({ mode, item });
    };

    const openMuscleItemModal = (mode: ModalMode, item: Muscle | null = null, presetMuscleGroup = exerciseForm.muscle_group) => {
        setFormError("");
        setMuscleItemForm(item ? {
            muscle_group: String(item.muscle_group),
            name: item.name,
        } : {
            ...emptyMuscleItemForm,
            muscle_group: presetMuscleGroup,
        });
        setMuscleItemModal({ mode, item });
    };

    const openAssignmentModal = (item: WorkoutPlanAssignment) => {
        setFormError("");
        setAssignmentForm({
            client: item.client,
            plan: item.plan,
            start_date: item.start_date,
            end_date: item.end_date || "",
            status: item.status,
            notes: item.notes || "",
        });
        setAssignmentModal({ mode: "edit", item });
    };

    const tenantPayload = tenantId ? { tenant: tenantId } : {};
    const createsAssignmentVersion = Boolean(
        assignmentModal?.mode === "edit"
        && assignmentModal.item?.status === "active"
        && (
            assignmentForm.client !== assignmentModal.item.client
            || assignmentForm.plan !== assignmentModal.item.plan
            || assignmentForm.start_date !== assignmentModal.item.start_date
        ),
    );

    const updatePlanDay = (dayId: string, updates: Partial<PlanDayForm>) => {
        setPlanForm((current) => ({
            ...current,
            days: current.days.map((day) => day.id === dayId ? { ...day, ...updates } : day),
        }));
    };

    const addPlanDay = () => {
        setPlanForm((current) => ({
            ...current,
            days: [
                ...current.days,
                createPlanDay({
                    name: `DAY ${current.days.length + 1}`,
                    day_number: String(current.days.length + 1),
                }),
            ],
        }));
    };

    const removePlanDay = (dayId: string) => {
        setPlanForm((current) => ({
            ...current,
            days: current.days.length > 1 ? current.days.filter((day) => day.id !== dayId) : current.days,
        }));
    };

    const updatePlanExerciseRow = (dayId: string, rowId: string, updates: Partial<PlanExerciseRowForm>) => {
        setPlanForm((current) => ({
            ...current,
            days: current.days.map((day) => {
                if (day.id !== dayId) return day;
                return {
                    ...day,
                    exercises: day.exercises.map((row) => row.id === rowId ? { ...row, ...updates } : row),
                };
            }),
        }));
    };

    const movePlanExerciseRow = (dayId: string, draggedRowId: string, targetRowId: string) => {
        if (draggedRowId === targetRowId) return;

        setPlanForm((current) => ({
            ...current,
            days: current.days.map((day) => {
                if (day.id !== dayId) return day;

                const fromIndex = day.exercises.findIndex((row) => row.id === draggedRowId);
                const toIndex = day.exercises.findIndex((row) => row.id === targetRowId);
                if (fromIndex === -1 || toIndex === -1) return day;

                const nextRows = [...day.exercises];
                const [movedRow] = nextRows.splice(fromIndex, 1);
                nextRows.splice(toIndex, 0, movedRow);
                return { ...day, exercises: nextRows };
            }),
        }));
    };

    const addPlanExerciseRow = (dayId: string, row: PlanExerciseRowForm = createPlanExerciseRow()) => {
        setPlanForm((current) => ({
            ...current,
            days: current.days.map((day) => (
                day.id === dayId
                    ? { ...day, exercises: [...day.exercises, row] }
                    : day
            )),
        }));
    };

    const removePlanExerciseRow = (dayId: string, rowId: string) => {
        setPlanForm((current) => ({
            ...current,
            days: current.days.map((day) => {
                if (day.id !== dayId) return day;
                return { ...day, exercises: day.exercises.filter((row) => row.id !== rowId) };
            }),
        }));
    };

    const submitPlan = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { payload, error } = buildWorkoutPlanPayload(planForm, exerciseById, tenantPayload);
        if (!payload) {
            setFormError(error);
            return;
        }

        planMutation.mutate({
            mode: planModal?.mode || "add",
            id: planModal?.item?.id,
            payload,
        });
    };

    const submitMuscle = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!muscleForm.name.trim()) {
            setFormError("Muscle group name is required.");
            return;
        }

        muscleMutation.mutate({
            mode: muscleModal?.mode || "add",
            id: muscleModal?.item?.id,
            payload: { name: muscleForm.name.trim() },
        });
    };

    const submitMuscleItem = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!muscleItemForm.muscle_group) {
            setFormError("Muscle group is required.");
            return;
        }
        if (!muscleItemForm.name.trim()) {
            setFormError("Muscle name is required.");
            return;
        }

        muscleItemMutation.mutate({
            mode: muscleItemModal?.mode || "add",
            id: muscleItemModal?.item?.id,
            payload: {
                muscle_group: muscleItemForm.muscle_group,
                name: muscleItemForm.name.trim(),
            },
        });
    };

    const submitExercise = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!exerciseForm.name.trim()) {
            setFormError("Exercise name is required.");
            return;
        }
        if (!exerciseForm.muscle_group || !exerciseForm.primary_muscle) {
            setFormError("Muscle group and primary muscle are required.");
            return;
        }
        if (!exerciseForm.training_location) {
            setFormError("Training location is required.");
            return;
        }

        const secondaryMuscles = exerciseForm.secondary_muscles.filter((muscle) => muscle !== exerciseForm.primary_muscle);
        const mediaUrls = compactStrings(exerciseForm.media_urls);

        exerciseMutation.mutate({
            mode: exerciseModal?.mode || "add",
            id: exerciseModal?.item?.id,
            payload: {
                ...tenantPayload,
                name: exerciseForm.name.trim(),
                primary_muscle: exerciseForm.primary_muscle,
                training_location: exerciseForm.training_location,
                workout_type: exerciseForm.workout_type,
                exercise_type: exerciseForm.exercise_type,
                reps: exerciseForm.reps,
                rest: exerciseForm.rest ? Number(exerciseForm.rest) as ExerciseRestPeriod : null,
                equipment_required: exerciseForm.equipment_required,
                instructions: exerciseForm.instructions.trim(),
                is_active: exerciseForm.is_active,
                muscle_links: secondaryMuscles.map((muscle) => ({ muscle, is_primary: false })),
                media_items: mediaUrls.map((youtube_url) => ({ youtube_url })),
            },
        });
    };

    const submitAssignment = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!assignmentModal?.item) {
            setFormError("Select an assignment to edit.");
            return;
        }
        if (!assignmentForm.client || !assignmentForm.plan || !assignmentForm.start_date) {
            setFormError("Client, plan, and start date are required.");
            return;
        }

        assignmentMutation.mutate({
            id: assignmentModal.item.id,
            payload: {
                ...tenantPayload,
                client: assignmentForm.client,
                plan: assignmentForm.plan,
                start_date: assignmentForm.start_date,
                end_date: assignmentForm.end_date || null,
                status: assignmentForm.status,
                notes: assignmentForm.notes.trim(),
            },
        });
    };

    const isLoading = !hasHydrated
        || (needsPlans && plansQuery.isLoading)
        || (needsLibrary && (muscleGroupsQuery.isLoading || musclesQuery.isLoading || exercisesQuery.isLoading))
        || (needsAssignments && assignmentsQuery.isLoading)
        || (needsClients && clientsQuery.isLoading);
    const pageError = (needsPlans ? plansQuery.error : null)
        || (needsLibrary ? muscleGroupsQuery.error || musclesQuery.error || exercisesQuery.error : null)
        || (needsAssignments ? assignmentsQuery.error : null)
        || (needsClients ? clientsQuery.error : null);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <DumbbellIcon className="h-7 w-7 text-indigo-500" />
                        {title}
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">{description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm md:flex">
                    {allowedTabs.includes("plans") && <Metric label="Plans" value={plans.length} />}
                    {allowedTabs.includes("library") && <Metric label="Exercises" value={exercises.length} />}
                    {allowedTabs.includes("muscles") && <Metric label="Muscles" value={muscles.length} />}
                    {allowedTabs.includes("muscleGroups") && <Metric label="Muscle Groups" value={muscleGroups.length} />}
                    {allowedTabs.includes("assignments") && <Metric label="Assignments" value={assignments.length} />}
                </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSearch("");
                                setFormError("");
                            }}
                            className={`flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                                activeTab === tab.id
                                    ? "bg-indigo-600 text-white"
                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-96">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search current tab..."
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                </div>
            </div>

            {pageError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {getErrorMessage(pageError)}
                </div>
            )}

            {isLoading ? (
                <div className="flex min-h-80 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                    <Loader2Icon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <>
                    {activeTab === "plans" && (
                        <PlansTab
                            plans={filteredPlans}
                            onAdd={() => router.push("/dashboard/workouts/planning/new")}
                            onView={(plan) => setPlanView(plan)}
                            onEdit={(plan) => openPlanModal("edit", plan)}
                            onDelete={(plan) => setDeleteTarget({ type: "plan", id: plan.id, label: plan.title })}
                        />
                    )}
                    {activeTab === "library" && (
                        <LibraryTab
                            exercises={filteredExercises}
                            muscleGroupById={muscleGroupById}
                            muscleById={muscleById}
                            onAddExercise={() => openExerciseModal("add")}
                            onEditExercise={(exercise) => openExerciseModal("edit", exercise)}
                            onDeleteExercise={(exercise) => setDeleteTarget({ type: "exercise", id: exercise.id, label: exercise.name })}
                        />
                    )}
                    {activeTab === "muscles" && (
                        <MusclesTab
                            muscles={filteredMuscles}
                            muscleGroupById={muscleGroupById}
                            onAddMuscle={() => openMuscleItemModal("add", null, "")}
                            onEditMuscle={(muscle) => openMuscleItemModal("edit", muscle)}
                            onDeleteMuscle={(muscle) => setDeleteTarget({ type: "muscle", id: muscle.id, label: muscle.name })}
                        />
                    )}
                    {activeTab === "muscleGroups" && (
                        <MuscleGroupsTab
                            muscleGroups={muscleGroups}
                            muscles={muscles}
                            onAddMuscle={() => openMuscleModal("add")}
                            onAddExerciseForMuscle={(muscleGroup) => openExerciseModal("add", null, String(muscleGroup.id))}
                            onEditMuscle={(muscle) => openMuscleModal("edit", muscle)}
                            onDeleteMuscle={(muscle) => setDeleteTarget({ type: "muscleGroup", id: muscle.id, label: muscle.name })}
                        />
                    )}
                    {activeTab === "assignments" && (
                        <AssignmentsTab
                            assignments={filteredAssignments}
                            clients={clients}
                            planById={planById}
                            clientById={clientById}
                            onView={(assignment) => setAssignmentView(assignment)}
                            onEdit={openAssignmentModal}
                            onDelete={(assignment) => setDeleteTarget({ type: "assignment", id: assignment.id, label: assignment.plan_title || planById.get(assignment.plan)?.title || "Assignment" })}
                            onDownload={handleDownloadAssignmentPdf}
                            onSend={handleSendAssignmentPdf}
                            pdfAction={pdfAction}
                        />
                    )}
                </>
            )}

            {planModal && (
                <ModalFrame title={planModal.mode === "add" ? "Create Workout Plan" : "Edit Workout Plan"} onClose={() => setPlanModal(null)} maxWidth="max-w-7xl">
                    <form onSubmit={submitPlan} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Title" value={planForm.title} onChange={(value) => setPlanForm({ ...planForm, title: value })} required />
                            <TextField label="Goal" value={planForm.goal} onChange={(value) => setPlanForm({ ...planForm, goal: value })} />
                            <SelectField label="Difficulty" value={planForm.difficulty} onChange={(value) => setPlanForm({ ...planForm, difficulty: value as WorkoutDifficulty })}>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </SelectField>
                            <TextField label="Duration Weeks" type="number" value={planForm.duration_weeks} onChange={(value) => setPlanForm({ ...planForm, duration_weeks: value })} min="1" required />
                        </div>
                        <TextArea label="Description" value={planForm.description} onChange={(value) => setPlanForm({ ...planForm, description: value })} />
                        <CheckboxField label="Active plan" checked={planForm.is_active} onChange={(checked) => setPlanForm({ ...planForm, is_active: checked })} />
                        <PlanTemplateEditor
                            days={planForm.days}
                            exercises={exercises}
                            muscleGroups={muscleGroups}
                            onAddDay={addPlanDay}
                            onRemoveDay={removePlanDay}
                            onUpdateDay={updatePlanDay}
                            onAddRow={addPlanExerciseRow}
                            onRemoveRow={removePlanExerciseRow}
                            onUpdateRow={updatePlanExerciseRow}
                            onMoveRow={movePlanExerciseRow}
                            onCreateExerciseRequest={openExerciseModalForPlanDay}
                        />
                        <ModalActions loading={planMutation.isPending} submitLabel={planModal.mode === "add" ? "Create Plan" : "Save Changes"} onCancel={() => setPlanModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {muscleModal && (
                <ModalFrame title={muscleModal.mode === "add" ? "Create Muscle Group" : "Edit Muscle Group"} onClose={() => setMuscleModal(null)}>
                    <form onSubmit={submitMuscle} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <TextField label="Name" value={muscleForm.name} onChange={(value) => setMuscleForm({ ...muscleForm, name: value })} required />
                        <ModalActions loading={muscleMutation.isPending} submitLabel={muscleModal.mode === "add" ? "Create Group" : "Save Changes"} onCancel={() => setMuscleModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {exerciseModal && (
                <ModalFrame title={exerciseModal.mode === "add" ? "Create Exercise" : "Edit Exercise"} onClose={() => {
                    setExerciseModal(null);
                    setExerciseCreateTargetDayId(null);
                }}>
                    <form onSubmit={submitExercise} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Name" value={exerciseForm.name} onChange={(value) => setExerciseForm({ ...exerciseForm, name: value })} required />
                            <SelectField label="Muscle Group" value={exerciseForm.muscle_group} onChange={(value) => setExerciseForm({ ...exerciseForm, muscle_group: value, primary_muscle: "", secondary_muscles: [] })} required>
                                <option value="">Select muscle group</option>
                                {muscleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </SelectField>
                            <SelectField label="Training Location" value={exerciseForm.training_location} onChange={(value) => setExerciseForm({ ...exerciseForm, training_location: value as "" | ExerciseTrainingLocation })} required>
                                <option value="">Select location</option>
                                <option value="gym">Gym</option>
                                <option value="home">Home</option>
                            </SelectField>
                            <SelectField label="Workout Type" value={exerciseForm.workout_type} onChange={(value) => setExerciseForm({ ...exerciseForm, workout_type: value as WorkoutType })}>
                                <option value="">Select workout type</option>
                                <option value="push">Push</option>
                                <option value="pull">Pull</option>
                                <option value="legs">Legs</option>
                            </SelectField>
                            <SelectField label="Exercise Type" value={String(exerciseForm.exercise_type)} onChange={(value) => setExerciseForm({ ...exerciseForm, exercise_type: Number(value) as ExerciseType })} required>
                                <option value="1">Body Weight</option>
                                <option value="2">Pin Loaded Machine</option>
                                <option value="3">Free Weight</option>
                            </SelectField>
                            <SelectField label="Reps" value={exerciseForm.reps} onChange={(value) => setExerciseForm({ ...exerciseForm, reps: value as ExerciseRepsRange })}>
                                {repsOptions.map((option) => (
                                    <option key={option || "empty"} value={option}>{option || "\u2014"}</option>
                                ))}
                            </SelectField>
                            <SelectField label="Rest" value={exerciseForm.rest} onChange={(value) => setExerciseForm({ ...exerciseForm, rest: value as "" | `${ExerciseRestPeriod}` })}>
                                {restOptions.map((option) => (
                                    <option key={option || "empty"} value={option}>{option ? `${option}s` : "\u2014"}</option>
                                ))}
                            </SelectField>
                            <div className="md:col-span-2">
                                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                                    <SelectField label="Primary Muscle" value={exerciseForm.primary_muscle} onChange={(value) => setExerciseForm({ ...exerciseForm, primary_muscle: value, secondary_muscles: exerciseForm.secondary_muscles.filter((muscle) => muscle !== value) })} required>
                                        <option value="">Select primary muscle</option>
                                        {muscles
                                            .filter((muscle) => String(muscle.muscle_group) === exerciseForm.muscle_group)
                                            .map((muscle) => <option key={muscle.id} value={muscle.id}>{muscle.name}</option>)}
                                    </SelectField>
                                    <button
                                        type="button"
                                        onClick={() => openMuscleItemModal("add")}
                                        disabled={!exerciseForm.muscle_group}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-indigo-200 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        Add Muscle
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="mb-2 text-xs font-bold uppercase text-zinc-500">Secondary Muscles</div>
                            <div className="grid gap-2 md:grid-cols-2">
                                {muscles.filter((muscle) => String(muscle.id) !== exerciseForm.primary_muscle).map((muscle) => {
                                    const muscleId = String(muscle.id);
                                    const checked = exerciseForm.secondary_muscles.includes(muscleId);
                                    const group = muscleGroupById.get(String(muscle.muscle_group));
                                    return (
                                        <CheckboxField
                                            key={muscle.id}
                                            label={`${muscle.name}${group ? ` (${group.name})` : ""}`}
                                            checked={checked}
                                            onChange={(isChecked) => setExerciseForm({
                                                ...exerciseForm,
                                                secondary_muscles: isChecked
                                                    ? [...exerciseForm.secondary_muscles, muscleId]
                                                    : exerciseForm.secondary_muscles.filter((selectedMuscle) => selectedMuscle !== muscleId),
                                            })}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-bold uppercase text-zinc-500">YouTube Media</div>
                            {exerciseForm.media_urls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(event) => setExerciseForm({
                                            ...exerciseForm,
                                            media_urls: exerciseForm.media_urls.map((mediaUrl, mediaIndex) => mediaIndex === index ? event.target.value : mediaUrl),
                                        })}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setExerciseForm({
                                            ...exerciseForm,
                                            media_urls: exerciseForm.media_urls.filter((_, mediaIndex) => mediaIndex !== index),
                                        })}
                                        disabled={exerciseForm.media_urls.length === 1}
                                        className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-600 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-red-300"
                                        title="Remove media URL"
                                    >
                                        <Trash2Icon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setExerciseForm({ ...exerciseForm, media_urls: [...exerciseForm.media_urls, ""] })}
                                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Add media URL
                            </button>
                        </div>
                        <TextArea label="Instructions" value={exerciseForm.instructions} onChange={(value) => setExerciseForm({ ...exerciseForm, instructions: value })} />
                        <div className="grid gap-3 md:grid-cols-2">
                            <CheckboxField label="Equipment required" checked={exerciseForm.equipment_required} onChange={(checked) => setExerciseForm({ ...exerciseForm, equipment_required: checked })} />
                            <CheckboxField label="Active exercise" checked={exerciseForm.is_active} onChange={(checked) => setExerciseForm({ ...exerciseForm, is_active: checked })} />
                        </div>
                        <ModalActions loading={exerciseMutation.isPending} submitLabel={exerciseModal.mode === "add" ? "Create Exercise" : "Save Changes"} onCancel={() => {
                            setExerciseModal(null);
                            setExerciseCreateTargetDayId(null);
                        }} />
                    </form>
                </ModalFrame>
            )}

            {muscleItemModal && (
                <ModalFrame title={muscleItemModal.mode === "add" ? "Create Muscle" : "Edit Muscle"} onClose={() => setMuscleItemModal(null)}>
                    <form onSubmit={submitMuscleItem} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <SelectField label="Muscle Group" value={muscleItemForm.muscle_group} onChange={(value) => setMuscleItemForm({ ...muscleItemForm, muscle_group: value })} required>
                            <option value="">Select muscle group</option>
                            {muscleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </SelectField>
                        <TextField label="Muscle Name" value={muscleItemForm.name} onChange={(value) => setMuscleItemForm({ ...muscleItemForm, name: value })} required />
                        <ModalActions loading={muscleItemMutation.isPending} submitLabel={muscleItemModal.mode === "add" ? "Create Muscle" : "Save Changes"} onCancel={() => setMuscleItemModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {assignmentModal && (
                <ModalFrame title="Edit Assignment" onClose={() => setAssignmentModal(null)}>
                    <form onSubmit={submitAssignment} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <div className="grid gap-4 md:grid-cols-2">
                            <SelectField label="Client" value={assignmentForm.client} onChange={(value) => setAssignmentForm({ ...assignmentForm, client: value })} required>
                                <option value="">Select client...</option>
                                {clients.map((client) => <option key={client.id} value={client.id}>{clientName(client)}</option>)}
                            </SelectField>
                            <SelectField label="Plan" value={assignmentForm.plan} onChange={(value) => setAssignmentForm({ ...assignmentForm, plan: value })} required>
                                <option value="">Select plan...</option>
                                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
                            </SelectField>
                            <TextField label="Start Date" type="date" value={assignmentForm.start_date} onChange={(value) => setAssignmentForm({ ...assignmentForm, start_date: value })} required />
                            <TextField label="End Date" type="date" value={assignmentForm.end_date} onChange={(value) => setAssignmentForm({ ...assignmentForm, end_date: value })} />
                            <SelectField label="Status" value={assignmentForm.status} onChange={(value) => setAssignmentForm({ ...assignmentForm, status: value as WorkoutAssignmentStatus })}>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </SelectField>
                        </div>
                        <TextArea label="Notes" value={assignmentForm.notes} onChange={(value) => setAssignmentForm({ ...assignmentForm, notes: value })} />
                        <ModalActions loading={assignmentMutation.isPending} submitLabel={createsAssignmentVersion ? "Save New Version" : "Save Changes"} onCancel={() => setAssignmentModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {planView && (
                <WorkoutPlanViewModal
                    title="View Workout Plan"
                    planLabel={planView.title}
                    statusLabel={planView.is_active ? "active" : "inactive"}
                    meta={[
                        { label: "Difficulty", value: planView.difficulty },
                        { label: "Goal", value: planView.goal || "-" },
                        { label: "Duration", value: `${planView.duration_weeks} weeks` },
                        { label: "Created By", value: planView.created_by_name || "-" },
                    ]}
                    notes={planView.description || ""}
                    days={planView.template_days || []}
                    emptyText="No workout days found for this plan."
                    onClose={() => setPlanView(null)}
                />
            )}

            {assignmentView && (
                <WorkoutPlanViewModal
                    title="View Workout Assignment"
                    planLabel={assignmentView.plan_title || planById.get(assignmentView.plan)?.title || assignmentView.plan}
                    statusLabel={assignmentView.status}
                    meta={[
                        { label: "Client", value: assignmentView.client_name || clientName(clientById.get(assignmentView.client)) },
                        { label: "Plan", value: assignmentView.plan_title || planById.get(assignmentView.plan)?.title || assignmentView.plan },
                        { label: "Status", value: assignmentView.status },
                        { label: "Dates", value: `${assignmentView.start_date} - ${assignmentView.end_date || "No end date"}` },
                    ]}
                    notes={assignmentView.notes || ""}
                    days={(assignmentView.workout_days?.length ? assignmentView.workout_days : planById.get(assignmentView.plan)?.template_days) || []}
                    emptyText="No workout days found for this assignment."
                    onDownload={() => handleDownloadAssignmentPdf(assignmentView)}
                    onSend={() => handleSendAssignmentPdf(assignmentView)}
                    pdfAction={pdfAction?.assignmentId === assignmentView.id ? pdfAction.action : null}
                    onClose={() => setAssignmentView(null)}
                />
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                            <Trash2Icon className="h-6 w-6 text-red-600 dark:text-red-300" />
                        </div>
                        <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-white">Delete {deleteTarget.type}?</h2>
                        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{deleteTarget.label} will be removed if the backend allows it.</p>
                        <ErrorText message={formError} />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                                Cancel
                            </button>
                            <button type="button" onClick={() => deleteMutation.mutate(deleteTarget)} disabled={deleteMutation.isPending} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                                {deleteMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function PlanTemplateEditor({
    days,
    exercises,
    muscleGroups,
    onAddDay,
    onRemoveDay,
    onUpdateDay,
    onAddRow,
    onRemoveRow,
    onUpdateRow,
    onMoveRow,
    onMoveDay,
    enableDayCardControls = false,
    onCreateExerciseRequest,
}: {
    days: PlanDayForm[];
    exercises: Exercise[];
    muscleGroups: MuscleGroup[];
    onAddDay: () => void;
    onRemoveDay: (dayId: string) => void;
    onUpdateDay: (dayId: string, updates: Partial<PlanDayForm>) => void;
    onAddRow: (dayId: string, row?: PlanExerciseRowForm) => void;
    onRemoveRow: (dayId: string, rowId: string) => void;
    onUpdateRow: (dayId: string, rowId: string, updates: Partial<PlanExerciseRowForm>) => void;
    onMoveRow: (dayId: string, draggedRowId: string, targetRowId: string) => void;
    onMoveDay?: (draggedDayId: string, targetDayId: string) => void;
    enableDayCardControls?: boolean;
    onCreateExerciseRequest?: (dayId: string) => void;
}) {
    const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);
    const muscleGroupById = useMemo(() => new Map(muscleGroups.map((group) => [String(group.id), group])), [muscleGroups]);
    const setsByMuscle = useMemo(() => {
        const totals = new Map<string, number>();

        days.forEach((day) => {
            if (day.day_type !== "training") {
                return;
            }

            day.exercises.forEach((row) => {
                const sets = Number(row.sets);
                if (!Number.isFinite(sets) || sets <= 0) {
                    return;
                }

                const selectedExercise = exerciseById.get(row.exercise);
                const muscleName = (
                    selectedExercise?.primary_muscle_name ||
                    selectedExercise?.muscle_group_name ||
                    muscleGroupById.get(row.muscle_group)?.name ||
                    ""
                ).trim();

                if (!muscleName) {
                    return;
                }

                totals.set(muscleName, (totals.get(muscleName) || 0) + sets);
            });
        });

        return Array.from(totals.entries()).map(([muscleName, totalSets]) => ({ muscleName, totalSets }));
    }, [days, exerciseById, muscleGroupById]);
    const hasSelectedExercise = useMemo(
        () => days.some((day) => day.day_type === "training" && day.exercises.some((row) => Boolean(row.exercise))),
        [days],
    );
    const [draggedRow, setDraggedRow] = useState<{ dayId: string; rowId: string } | null>(null);
    const [draggedDayId, setDraggedDayId] = useState<string | null>(null);
    const [collapsedDayIds, setCollapsedDayIds] = useState<string[]>([]);
    const [exercisePicker, setExercisePicker] = useState<{ dayId: string; search: string; muscleGroup: string } | null>(null);
    const pickerQuery = exercisePicker?.search.trim().toLowerCase() || "";
    const pickerExercises = useMemo(() => {
        if (!exercisePicker) return [];

        return exercises
            .filter((exercise) => exercise.is_active)
            .filter((exercise) => !exercisePicker.muscleGroup || String(exercise.muscle_group || "") === exercisePicker.muscleGroup)
            .filter((exercise) => {
                if (!pickerQuery) return true;
                return [
                    exercise.name,
                    exercise.muscle_group_name || "",
                    exercise.primary_muscle_name || "",
                    getTrainingLocationLabel(exercise.training_location),
                    getWorkoutTypeLabel(exercise.workout_type),
                    exercise.instructions || "",
                ].some((value) => value.toLowerCase().includes(pickerQuery));
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [exercisePicker, exercises, pickerQuery]);

    const openExercisePicker = (dayId: string) => {
        setExercisePicker({ dayId, search: "", muscleGroup: "" });
    };

    const addExerciseFromPicker = (exercise: Exercise) => {
        if (!exercisePicker) return;
        onAddRow(exercisePicker.dayId, createPlanExerciseRowFromExercise(exercise));
        setExercisePicker(null);
    };

    const createExerciseFromPicker = () => {
        if (!exercisePicker || !onCreateExerciseRequest) return;
        const { dayId } = exercisePicker;
        setExercisePicker(null);
        onCreateExerciseRequest(dayId);
    };

    const toggleDayCollapse = (dayId: string) => {
        setCollapsedDayIds((current) => (
            current.includes(dayId)
                ? current.filter((collapsedDayId) => collapsedDayId !== dayId)
                : [...current, dayId]
        ));
    };

    const handleDayTypeChange = (day: PlanDayForm, dayType: WorkoutDayType) => {
        onUpdateDay(day.id, {
            day_type: dayType,
            exercises: dayType === "training" ? day.exercises : [],
        });
    };

    const getDaySummary = (day: PlanDayForm) => {
        if (day.day_type === "active_recovery") {
            return "Active recovery";
        }

        if (day.day_type === "off") {
            return "Off day";
        }

        const selectedRows = day.exercises.filter((row) => Boolean(row.exercise));
        const exerciseCount = selectedRows.length;
        const setCount = selectedRows.reduce((total, row) => {
            const sets = Number(row.sets);
            return Number.isFinite(sets) && sets > 0 ? total + sets : total;
        }, 0);

        return `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"} · ${setCount} ${setCount === 1 ? "set" : "sets"}`;
    };

    return (
        <>
            {hasSelectedExercise && (
                <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">Sets By Muscle</h2>
                    {setsByMuscle.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {setsByMuscle.map(({ muscleName, totalSets }) => (
                                <span
                                    key={muscleName}
                                    className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-200"
                                >
                                    {muscleName} {totalSets}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">No sets added yet.</p>
                    )}
                </section>
            )}

            <section className="space-y-4 rounded-xl border border-sky-200  p-4 text-zinc-950 dark:border-sky-900/60">
            
            <div className="space-y-5">
                {days.map((day) => {
                    const isCollapsed = collapsedDayIds.includes(day.id);
                    const canMoveDays = enableDayCardControls && Boolean(onMoveDay);

                    return (
                    <div
                        key={day.id}
                        onDragOver={(event) => {
                            if (!canMoveDays || !draggedDayId) return;
                            event.preventDefault();
                        }}
                        onDrop={(event) => {
                            if (!canMoveDays || !draggedDayId) return;
                            event.preventDefault();
                            onMoveDay?.(draggedDayId, day.id);
                            setDraggedDayId(null);
                        }}
                        className={`overflow-hidden rounded-xl border border-zinc-300 bg-white text-zinc-950 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${draggedDayId === day.id ? "opacity-50" : ""}`}
                    >
                        <div className="border-b border-black  p-3 ">
                            <div className="grid gap-3 md:grid-cols-[auto_1fr_120px_180px_minmax(150px,auto)_auto] md:items-end">
                                {enableDayCardControls ? (
                                    <button
                                        type="button"
                                        draggable={canMoveDays}
                                        onDragStart={(event) => {
                                            if (!canMoveDays) return;
                                            event.dataTransfer.effectAllowed = "move";
                                            setDraggedDayId(day.id);
                                        }}
                                        onDragEnd={() => setDraggedDayId(null)}
                                        disabled={!canMoveDays || days.length === 1}
                                        className="inline-flex h-10 w-10 items-center justify-center self-end rounded-md text-zinc-500 transition hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-sky-950 dark:hover:text-sky-300"
                                        title="Drag day to reorder"
                                        aria-label="Drag day to reorder"
                                    >
                                        <GripVerticalIcon className="h-4 w-4" />
                                    </button>
                                ) : null}
                                <label className="block">
                                    
                                    <input
                                        value={day.name}
                                        onChange={(event) => onUpdateDay(day.id, { name: event.target.value })}
                                        className="w-full rounded-md border border-sky-300 bg-white px-3 py-2 text-center text-sm font-black uppercase text-zinc-950 outline-none focus:border-sky-600"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-black uppercase text-black">Day #</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={day.day_number}
                                        onChange={(event) => onUpdateDay(day.id, { day_number: event.target.value })}
                                        className="w-full rounded-md border border-sky-300 bg-white px-3 py-2 text-sm font-bold text-zinc-950 outline-none focus:border-sky-600"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-black uppercase text-black">Day Type</span>
                                    <select
                                        value={day.day_type}
                                        onChange={(event) => handleDayTypeChange(day, event.target.value as WorkoutDayType)}
                                        className="w-full rounded-md border border-sky-300 bg-white px-3 py-2 text-sm font-bold text-zinc-950 outline-none focus:border-sky-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                    >
                                        <option value="training">Training</option>
                                        <option value="active_recovery">Active Recovery</option>
                                        <option value="off">Off</option>
                                    </select>
                                </label>
                                {enableDayCardControls ? (
                                    <div className="self-end rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs font-black uppercase text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                                        {getDaySummary(day)}
                                    </div>
                                ) : null}
                                {enableDayCardControls ? (
                                    <div className="flex items-center justify-end gap-2 self-end">
                                        <button
                                            type="button"
                                            onClick={() => toggleDayCollapse(day.id)}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 transition hover:bg-sky-50 hover:text-sky-700 dark:text-zinc-300 dark:hover:bg-sky-950 dark:hover:text-sky-300"
                                            title={isCollapsed ? "Expand day" : "Collapse day"}
                                            aria-label={isCollapsed ? "Expand day" : "Collapse day"}
                                            aria-expanded={!isCollapsed}
                                        >
                                            {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveDay(day.id)}
                                            disabled={days.length === 1}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-black/20 text-white transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
                                            title="Remove day"
                                            aria-label="Remove day"
                                        >
                                            <Trash2Icon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                <button
                                    type="button"
                                    onClick={() => onRemoveDay(day.id)}
                                    disabled={days.length === 1}
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-black/20 px-3 py-2 text-sm font-bold text-white transition hover:bg-black/30"
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                    Remove
                                </button>
                                )}
                            </div>
                        </div>

                        {!isCollapsed && (
                        <>
                        {day.day_type !== "training" ? (
                            <div className="p-3">
                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                                    {day.day_type === "active_recovery"
                                        ? "Active recovery day. Add walking, mobility, stretching, or cardio notes."
                                        : "Off day. Add optional rest-day notes."}
                                </div>
                            </div>
                        ) : (
                        <div className="grid gap-3 p-3">
                            {day.exercises.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                                    No exercises added yet.
                                </div>
                            ) : day.exercises.map((row) => {
                                const selectedExercise = exerciseById.get(row.exercise);
                                const exerciseName = row.exercise_search || selectedExercise?.name || "Exercise";
                                const bodyPart = getExerciseBodyPart(selectedExercise) || row.body_part || "No body part";
                                const videoUrls = getExerciseVideoUrls(selectedExercise);
                                const videoListId = `video-options-${day.id}-${row.id}`;

                                return (
                                    <article
                                        key={row.id}
                                        draggable
                                         onDragStart={() => setDraggedRow({ dayId: day.id, rowId: row.id })}
                                         onDragEnd={() => setDraggedRow(null)}
                                         onDragOver={(event) => {
                                             event.preventDefault();
                                             event.stopPropagation();
                                         }}
                                         onDrop={(event) => {
                                             event.preventDefault();
                                             event.stopPropagation();
                                             if (draggedRow?.dayId === day.id) {
                                                 onMoveRow(day.id, draggedRow.rowId, row.id);
                                            }
                                            setDraggedRow(null);
                                        }}
                                        className={`rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900 ${draggedRow?.rowId === row.id ? "opacity-50" : ""}`}
                                    >
                                        <div className="mb-3 flex flex-col gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-black uppercase text-zinc-500">Exercise</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <span className="truncate text-sm font-black uppercase text-zinc-950 dark:text-white">{exerciseName}</span>
                                                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold uppercase text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                                                        {bodyPart}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    className="cursor-grab rounded-md p-2 text-zinc-500 transition hover:bg-sky-50 hover:text-sky-700 active:cursor-grabbing dark:hover:bg-sky-950 dark:hover:text-sky-300"
                                                    title="Drag to reorder"
                                                    aria-label="Drag to reorder workout row"
                                                >
                                                    <GripVerticalIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveRow(day.id, row.id)}
                                                    className="rounded-md p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                                    title="Remove row"
                                                >
                                                    <Trash2Icon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-black uppercase text-zinc-500">Sets</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={row.sets}
                                                    onChange={(event) => onUpdateRow(day.id, row.id, { sets: event.target.value })}
                                                    className="w-full rounded border border-zinc-300 px-2 py-2 text-center text-xs font-bold text-black outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                                />
                                            </label>

                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-black uppercase text-zinc-500">Rep Range</span>
                                                <select
                                                    value={row.reps}
                                                    onChange={(event) => onUpdateRow(day.id, row.id, { reps: event.target.value })}
                                                    className="w-full rounded border border-zinc-300 px-2 py-2 text-center text-xs font-bold text-black outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                                >
                                                    {repsOptions.map((option) => (
                                                        <option key={option || "empty"} value={option}>{option || "\u2014"}</option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-black uppercase text-zinc-500">Rest</span>
                                                <select
                                                    value={row.rest}
                                                    onChange={(event) => onUpdateRow(day.id, row.id, { rest: event.target.value })}
                                                    className="w-full rounded border border-zinc-300 px-2 py-2 text-center text-xs font-bold text-black outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                                    title="Rest in seconds"
                                                >
                                                    {restOptions.map((option) => (
                                                        <option key={option || "empty"} value={option}>{option ? `${option}s` : "\u2014"}</option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className="block sm:col-span-3 lg:col-span-3">
                                                <span className="mb-1 block text-[11px] font-black uppercase text-zinc-500">Video Link</span>
                                                <input
                                                    list={videoListId}
                                                    value={row.video_url}
                                                    onChange={(event) => onUpdateRow(day.id, row.id, { video_url: event.target.value })}
                                                    className="w-full rounded border border-zinc-300 px-2 py-2 text-xs font-bold text-blue-700 underline outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-sky-300"
                                                    placeholder=""
                                                />
                                                <datalist id={videoListId}>
                                                    {videoUrls.map((url) => <option key={url} value={url} />)}
                                                </datalist>
                                            </label>
                                        </div>

                                        <label className="mt-3 block">
                                            <span className="mb-1 block text-[11px] font-black uppercase text-zinc-500">Notes</span>
                                            <input
                                                value={row.notes}
                                                onChange={(event) => onUpdateRow(day.id, row.id, { notes: event.target.value })}
                                                className="w-full rounded border border-zinc-300 px-2 py-2 text-xs font-semibold text-black outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                                placeholder="Prefer using cuffs"
                                            />
                                        </label>
                                    </article>
                                );
                            })}
                        </div>
                        )}

                        <div className="flex flex-col gap-3 border-t border-zinc-200 p-3 dark:border-zinc-800 md:items-start md:justify-between">
                            <input
                                value={day.notes}
                                onChange={(event) => onUpdateDay(day.id, { notes: event.target.value })}
                                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                placeholder="Optional notes for this day"
                            />
                            {day.day_type === "training" && (
                                <button
                                    type="button"
                                    onClick={() => openExercisePicker(day.id)}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Exercise
                                </button>
                            )}
                        </div>
                        </>
                        )}
                    </div>
                    );
                })}
            </div>
            <button
                type="button"
                onClick={onAddDay}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-800"
            >
                <PlusIcon className="h-4 w-4" />
                Add Day
            </button>
            </section>

            {exercisePicker && (
                <ModalFrame title="Select Exercise" onClose={() => setExercisePicker(null)} maxWidth="max-w-5xl">
                    <div className="space-y-4 p-6">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                            <label className="block">
                                <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Search</span>
                                <div className="relative">
                                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="search"
                                        value={exercisePicker.search}
                                        onChange={(event) => setExercisePicker({ ...exercisePicker, search: event.target.value })}
                                        className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                        placeholder="Search exercises"
                                    />
                                </div>
                            </label>
                            <SelectField
                                label="Muscle"
                                value={exercisePicker.muscleGroup}
                                onChange={(value) => setExercisePicker({ ...exercisePicker, muscleGroup: value })}
                            >
                                <option value="">All muscles</option>
                                {muscleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </SelectField>
                        </div>

                        <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                            {pickerExercises.length === 0 ? (
                                <div className="px-4 py-10 text-center text-sm font-semibold text-zinc-500">No exercises found.</div>
                            ) : (
                                <div className="grid gap-3 p-3 md:grid-cols-2">
                                    {pickerExercises.map((exercise) => (
                                        <button
                                            key={exercise.id}
                                            type="button"
                                            onClick={() => addExerciseFromPicker(exercise)}
                                            className="rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-sky-800 dark:hover:bg-sky-950/50"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-bold text-zinc-900 dark:text-white">{exercise.name}</div>
                                                    <div className="mt-1 text-xs font-semibold uppercase text-zinc-500">
                                                        {getExerciseBodyPart(exercise) || "No muscle set"}
                                                    </div>
                                                </div>
                                                <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                                                    {getTrainingLocationLabel(exercise.training_location)}
                                                </Badge>
                                            </div>
                                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                                <span>Reps: {exercise.reps || "-"}</span>
                                                <span>Rest: {getRestLabel(exercise.rest)}</span>
                                                <span>{getWorkoutTypeLabel(exercise.workout_type)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                            {onCreateExerciseRequest ? (
                                <button
                                    type="button"
                                    onClick={createExerciseFromPicker}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Exercise
                                </button>
                            ) : <span />}
                            <button
                                type="button"
                                onClick={() => setExercisePicker(null)}
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </ModalFrame>
            )}
        </>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-semibold uppercase text-zinc-500">{label}</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-white">{value}</div>
        </div>
    );
}

function InfoTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-semibold uppercase text-zinc-500">{label}</div>
            <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{value}</div>
        </div>
    );
}

function PlansTab({
    plans,
    onAdd,
    onView,
    onEdit,
    onDelete,
}: {
    plans: WorkoutPlan[];
    onAdd: () => void;
    onView: (plan: WorkoutPlan) => void;
    onEdit: (plan: WorkoutPlan) => void;
    onDelete: (plan: WorkoutPlan) => void;
}) {
    return (
        <Panel title="Workout Plans" actionLabel="New Plan" onAction={onAdd}>
            <DataTable emptyText="No workout plans found." columns={["Status", "Plan", "Difficulty", "Duration", "Actions"]}>
                {plans.map((plan) => (
                    <tr key={plan.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="px-6 py-4"><Badge className={plan.is_active ? statusClasses("active") : statusClasses("cancelled")}>{plan.is_active ? "Active" : "Inactive"}</Badge></td>
                        <td className="px-6 py-4">
                            <div className="font-semibold text-zinc-900 dark:text-white">{plan.title}</div>
                            <div className="text-xs text-zinc-500">{plan.goal || "No goal set"}</div>
                        </td>
                        <td className="px-6 py-4 capitalize">{plan.difficulty}</td>
                        <td className="px-6 py-4">{plan.duration_weeks} weeks</td>
                        <td className="px-6 py-4 text-right"><RowActions onView={() => onView(plan)} onEdit={() => onEdit(plan)} onDelete={() => onDelete(plan)} /></td>
                    </tr>
                ))}
            </DataTable>
        </Panel>
    );
}

function LibraryTab({
    exercises,
    muscleGroupById,
    muscleById,
    onAddExercise,
    onEditExercise,
    onDeleteExercise,
}: {
    exercises: Exercise[];
    muscleGroupById: Map<string, MuscleGroup>;
    muscleById: Map<string, Muscle>;
    onAddExercise: () => void;
    onEditExercise: (exercise: Exercise) => void;
    onDeleteExercise: (exercise: Exercise) => void;
}) {
    return (
        <Panel title="Exercises" actionLabel="New Exercise" onAction={onAddExercise}>
            <DataTable emptyText="No exercises found." columns={["Status", "Exercise", "Location", "Workout Type", "Exercise Type", "Reps", "Rest", "Muscle Group", "Primary Muscle", "Secondary", "Media", "Equipment", "Actions"]}>
                {exercises.map((exercise) => {
                    const primaryMuscle = exercise.primary_muscle_name || muscleById.get(String(exercise.primary_muscle || ""))?.name || "No muscle";
                    const secondaryMuscles = (exercise.muscles || [])
                        .filter((muscle) => !muscle.is_primary)
                        .map((muscle) => muscle.muscle_name || muscleById.get(String(muscle.muscle))?.name || String(muscle.muscle));
                    const mediaCount = (exercise.media || []).filter((media) => media.youtube_url).length;
                    return (
                        <tr key={exercise.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                            <td className="px-6 py-4"><Badge className={exercise.is_active ? statusClasses("active") : statusClasses("cancelled")}>{exercise.is_active ? "Active" : "Inactive"}</Badge></td>
                            <td className="px-6 py-4">
                                <div className="font-semibold text-zinc-900 dark:text-white">{exercise.name}</div>
                                <div className="max-w-md truncate text-xs text-zinc-500">{exercise.instructions || "No instructions"}</div>
                            </td>
                            <td className="px-6 py-4">{getTrainingLocationLabel(exercise.training_location)}</td>
                            <td className="px-6 py-4">{getWorkoutTypeLabel(exercise.workout_type)}</td>
                            <td className="px-6 py-4">{getWorkoutExerciseTypeLabel(exercise.exercise_type)}</td>
                            <td className="px-6 py-4">{exercise.reps || "-"}</td>
                            <td className="px-6 py-4">{getRestLabel(exercise.rest)}</td>
                            <td className="px-6 py-4">{exercise.muscle_group_name || muscleGroupById.get(String(exercise.muscle_group || ""))?.name || "No group"}</td>
                            <td className="px-6 py-4">{primaryMuscle}</td>
                            <td className="px-6 py-4"><div className="max-w-48 truncate text-xs text-zinc-500">{secondaryMuscles.length ? secondaryMuscles.join(", ") : "No secondary muscles"}</div></td>
                            <td className="px-6 py-4">{mediaCount ? `${mediaCount} URL${mediaCount === 1 ? "" : "s"}` : "No media"}</td>
                            <td className="px-6 py-4">{exercise.equipment_required ? "Required" : "Optional"}</td>
                            <td className="px-6 py-4 text-right"><RowActions onEdit={() => onEditExercise(exercise)} onDelete={() => onDeleteExercise(exercise)} /></td>
                        </tr>
                    );
                })}
            </DataTable>
        </Panel>
    );
}

function MusclesTab({
    muscles,
    muscleGroupById,
    onAddMuscle,
    onEditMuscle,
    onDeleteMuscle,
}: {
    muscles: Muscle[];
    muscleGroupById: Map<string, MuscleGroup>;
    onAddMuscle: () => void;
    onEditMuscle: (muscle: Muscle) => void;
    onDeleteMuscle: (muscle: Muscle) => void;
}) {
    return (
        <Panel title="Muscles" actionLabel="New Muscle" onAction={onAddMuscle}>
            <DataTable emptyText="No muscles found." columns={["Muscle", "Muscle Group", "Actions"]}>
                {muscles.map((muscle) => (
                    <tr key={muscle.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{muscle.name}</td>
                        <td className="px-6 py-4">{muscle.muscle_group_name || muscleGroupById.get(String(muscle.muscle_group))?.name || "No group"}</td>
                        <td className="px-6 py-4 text-right"><RowActions onEdit={() => onEditMuscle(muscle)} onDelete={() => onDeleteMuscle(muscle)} /></td>
                    </tr>
                ))}
            </DataTable>
        </Panel>
    );
}

function MuscleGroupsTab({
    muscleGroups,
    muscles,
    onAddMuscle,
    onAddExerciseForMuscle,
    onEditMuscle,
    onDeleteMuscle,
}: {
    muscleGroups: MuscleGroup[];
    muscles: Muscle[];
    onAddMuscle: () => void;
    onAddExerciseForMuscle: (muscle: MuscleGroup) => void;
    onEditMuscle: (muscle: MuscleGroup) => void;
    onDeleteMuscle: (muscle: MuscleGroup) => void;
}) {
    return (
        <Panel title="Muscle Groups" actionLabel="New Group" onAction={onAddMuscle}>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {muscleGroups.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-zinc-400">No muscle groups found.</div>
                ) : muscleGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between gap-3 px-6 py-4">
                        <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">{group.name}</div>
                            <div className="text-xs text-zinc-400">
                                {muscles.filter((muscle) => String(muscle.muscle_group) === String(group.id)).length} muscles
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onAddExerciseForMuscle(group)}
                                className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-indigo-300"
                                title="Create exercise for this group"
                            >
                                <PlusIcon className="h-4 w-4" />
                            </button>
                            <RowActions onEdit={() => onEditMuscle(group)} onDelete={() => onDeleteMuscle(group)} />
                        </div>
                    </div>
                ))}
            </div>
        </Panel>
    );
}

function AssignmentsTab({
    assignments,
    planById,
    clientById,
    onView,
    onEdit,
    onDelete,
    onDownload,
    onSend,
    pdfAction,
}: {
    assignments: WorkoutPlanAssignment[];
    clients: ClientData[];
    planById: Map<string, WorkoutPlan>;
    clientById: Map<string, ClientData>;
    onView: (assignment: WorkoutPlanAssignment) => void;
    onEdit: (assignment: WorkoutPlanAssignment) => void;
    onDelete: (assignment: WorkoutPlanAssignment) => void;
    onDownload: (assignment: WorkoutPlanAssignment) => void;
    onSend: (assignment: WorkoutPlanAssignment) => void;
    pdfAction: { assignmentId: string; action: "download" | "send" } | null;
}) {
    const sortedAssignments = [...assignments].sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return b.start_date.localeCompare(a.start_date);
    });

    return (
        <Panel title="Client Plan Assignments">
            <DataTable emptyText="No workout assignments found." columns={["Status", "Client", "Plan", "Snapshot", "Dates", "Actions"]}>
                {sortedAssignments.map((assignment) => {
                    const snapshotDays = assignment.workout_days?.length || 0;
                    const snapshotExercises = assignment.workout_days?.reduce((total, day) => total + (day.exercises?.length || 0), 0) || 0;
                    return (
                        <tr key={assignment.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                            <td className="px-6 py-4"><Badge className={statusClasses(assignment.status)}>{assignment.status}</Badge></td>
                            <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{assignment.client_name || clientName(clientById.get(assignment.client))}</td>
                            <td className="px-6 py-4">{assignment.plan_title || planById.get(assignment.plan)?.title || assignment.plan}</td>
                            <td className="px-6 py-4 text-xs text-zinc-500">{snapshotDays} days / {snapshotExercises} exercises</td>
                            <td className="px-6 py-4">
                                <div>{assignment.start_date}</div>
                                <div className="text-xs text-zinc-500">{assignment.end_date || "No end date"}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <RowActions
                                    onView={() => onView(assignment)}
                                    onEdit={() => onEdit(assignment)}
                                    onDelete={() => onDelete(assignment)}
                                    onDownload={() => onDownload(assignment)}
                                    onSend={() => onSend(assignment)}
                                    downloading={pdfAction?.assignmentId === assignment.id && pdfAction.action === "download"}
                                    sending={pdfAction?.assignmentId === assignment.id && pdfAction.action === "send"}
                                />
                            </td>
                        </tr>
                    );
                })}
            </DataTable>
        </Panel>
    );
}

export function WorkoutPlanViewModal({
    title,
    planLabel,
    statusLabel,
    meta,
    notes,
    days,
    emptyText,
    onDownload,
    onSend,
    pdfAction,
    onClose,
}: {
    title: string;
    planLabel: string;
    statusLabel: string;
    meta: Array<{ label: string; value: string }>;
    notes: string;
    days: WorkoutDay[];
    emptyText: string;
    onDownload?: () => void;
    onSend?: () => void;
    pdfAction?: "download" | "send" | null;
    onClose: () => void;
}) {
    const sortedDays = [...days]
        .sort((a, b) => a.day_number - b.day_number);

    return (
        <ModalFrame title={title} onClose={onClose} maxWidth="max-w-5xl">
            <div className="space-y-5 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{planLabel}</h3>
                        <Badge className={statusClasses(statusLabel)}>{statusLabel}</Badge>
                    </div>
                    {(onDownload || onSend) && (
                        <div className="flex flex-wrap justify-end gap-2">
                            {onDownload && (
                                <button
                                    type="button"
                                    onClick={onDownload}
                                    disabled={pdfAction !== null}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                    {pdfAction === "download" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
                                    Download
                                </button>
                            )}
                            {onSend && (
                                <button
                                    type="button"
                                    onClick={onSend}
                                    disabled={pdfAction !== null}
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {pdfAction === "send" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                                    Send
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                    {meta.map((item) => <InfoTile key={item.label} label={item.label} value={item.value} />)}
                </div>
                {notes && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                        {notes}
                    </div>
                )}
                <div className="space-y-4">
                    {sortedDays.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
                            {emptyText}
                        </div>
                    ) : sortedDays.map((day) => (
                        <section key={day.id} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <div className="flex flex-col gap-1 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-zinc-900 dark:text-white">Day {day.day_number}: {day.name}</h3>
                                        <Badge className={dayTypeClasses(day.day_type)}>{getWorkoutDayTypeLabel(day.day_type)}</Badge>
                                    </div>
                                    {day.notes && <p className="mt-1 text-sm text-zinc-500">{day.notes}</p>}
                                </div>
                                <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {day.day_type === "training" ? `${day.exercises?.length || 0} exercises` : getWorkoutDayTypeLabel(day.day_type)}
                                </Badge>
                            </div>
                            <DataTable emptyText="No exercises found for this day." columns={["Order", "Exercise", "Body Part", "Type", "Weight", "Sets", "Reps", "Rest", "Video", "Notes"]}>
                                {day.day_type !== "training" ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-8 text-center text-sm text-zinc-500">
                                            {day.day_type === "active_recovery"
                                                ? day.notes || "Active recovery day. Add walking, mobility, stretching, or cardio notes."
                                                : day.notes || "Off day."}
                                        </td>
                                    </tr>
                                ) : [...(day.exercises || [])]
                                    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                                    .map((exercise) => {
                                        const videoUrl = exercise.video_url || exercise.exercise_video_urls?.[0] || "";
                                        return (
                                            <tr key={exercise.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                                                <td className="px-6 py-4">{exercise.sequence}</td>
                                                <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{exercise.exercise_name || exercise.exercise}</td>
                                                <td className="px-6 py-4">{exercise.body_part || "-"}</td>
                                                <td className="px-6 py-4">{getWorkoutExerciseTypeLabel(exercise.exercise_type)}</td>
                                                <td className="px-6 py-4">{exercise.weight ?? "-"}</td>
                                                <td className="px-6 py-4">{exercise.sets}</td>
                                                <td className="px-6 py-4">{exercise.reps}</td>
                                                <td className="px-6 py-4">{exercise.rest}s</td>
                                                <td className="px-6 py-4">
                                                    {videoUrl ? (
                                                        <a className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300" href={videoUrl} target="_blank" rel="noreferrer">Open</a>
                                                    ) : "-"}
                                                </td>
                                                <td className="px-6 py-4"><div className="max-w-64 truncate">{exercise.notes || "-"}</div></td>
                                            </tr>
                                        );
                                    })}
                            </DataTable>
                        </section>
                    ))}
                </div>
            </div>
        </ModalFrame>
    );
}

function Panel({ title, actionLabel, onAction, children }: { title: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {
    return (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
                <h2 className="font-bold text-zinc-900 dark:text-white">{title}</h2>
                {actionLabel && onAction && (
                    <button type="button" onClick={onAction} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                        <PlusIcon className="h-4 w-4" />
                        {actionLabel}
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}

function DataTable({ columns, emptyText, children }: { columns: string[]; emptyText: string; children: React.ReactNode }) {
    return (
        <ResponsiveTableFromRows
            columns={columns}
            emptyText={emptyText}
            rowClassName="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
        >
            {children}
        </ResponsiveTableFromRows>
    );
}

function RowActions({
    onView,
    onEdit,
    onDelete,
    onDownload,
    onSend,
    downloading,
    sending,
}: {
    onView?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDownload?: () => void;
    onSend?: () => void;
    downloading?: boolean;
    sending?: boolean;
}) {
    return (
        <div className="flex items-center justify-end gap-2">
            {onView && (
                <button type="button" onClick={onView} className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-sky-600 dark:hover:bg-zinc-800 dark:hover:text-sky-300" title="View">
                    <EyeIcon className="h-4 w-4" />
                </button>
            )}
            {onDownload && (
                <button type="button" onClick={onDownload} disabled={downloading || sending} className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-600 disabled:opacity-60 dark:hover:bg-zinc-800 dark:hover:text-emerald-300" title="Download PDF">
                    {downloading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
                </button>
            )}
            {onSend && (
                <button type="button" onClick={onSend} disabled={downloading || sending} className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-indigo-600 disabled:opacity-60 dark:hover:bg-zinc-800 dark:hover:text-indigo-300" title="Send PDF">
                    {sending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                </button>
            )}
            <button type="button" onClick={onEdit} className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-indigo-300" title="Edit">
                <EditIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={onDelete} className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-300" title="Delete">
                <Trash2Icon className="h-4 w-4" />
            </button>
        </div>
    );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}>{children}</span>;
}

export function ErrorText({ message }: { message: string }) {
    if (!message) return null;
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{message}</div>;
}

export function TextField({ label, value, onChange, type = "text", required, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</span>
            <input
                type={type}
                required={required}
                min={min}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
        </label>
    );
}

export function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={4}
                className="w-full resize-y rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
        </label>
    );
}

export function SelectField({ label, value, onChange, required, children }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</span>
            <select
                required={required}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
                {children}
            </select>
        </label>
    );
}

export function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
            {label}
        </label>
    );
}

export function ModalActions({ loading, submitLabel, onCancel }: { loading: boolean; submitLabel: string; onCancel: () => void }) {
    return (
        <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                {submitLabel}
            </button>
        </div>
    );
}
