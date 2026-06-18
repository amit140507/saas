"use client";

import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ActivityIcon,
    DumbbellIcon,
    EditIcon,
    LayersIcon,
    LibraryIcon,
    Loader2Icon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
    UsersIcon,
    XIcon,
} from "lucide-react";

import { getClients } from "@/services/client.service";
import {
    createExercise,
    createMuscleGroup,
    createWorkoutAssignment,
    createWorkoutPlan,
    createWorkoutSession,
    deleteExercise,
    deleteMuscleGroup,
    deleteWorkoutAssignment,
    deleteWorkoutPlan,
    deleteWorkoutSession,
    getExercises,
    getMuscleGroups,
    getMuscles,
    getWorkoutAssignments,
    getWorkoutPlans,
    getWorkoutSessions,
    updateExercise,
    updateMuscleGroup,
    updateWorkoutAssignment,
    updateWorkoutPlan,
    updateWorkoutSession,
} from "@/services/workout.service";
import { useCurrentUserPermissions } from "@/lib/permissions";
import type { ClientData } from "@/types/client.type";
import type {
    Exercise,
    ExercisePayload,
    Muscle,
    MuscleGroup,
    MuscleGroupPayload,
    WorkoutAssignmentStatus,
    WorkoutDifficulty,
    WorkoutPlan,
    WorkoutPlanAssignment,
    WorkoutPlanAssignmentPayload,
    WorkoutPlanPayload,
    WorkoutPlanType,
    WorkoutSession,
    WorkoutSessionPayload,
} from "@/types/workout.type";

export type WorkoutSection = "plans" | "library" | "muscleGroups" | "assignments" | "sessions";
type TabId = WorkoutSection;
type ModalMode = "add" | "edit";
type DeleteTarget =
    | { type: "plan"; id: string; label: string }
    | { type: "muscle"; id: string | number; label: string }
    | { type: "exercise"; id: string; label: string }
    | { type: "assignment"; id: string; label: string }
    | { type: "session"; id: string; label: string };

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

interface PlanForm {
    title: string;
    plan_type: WorkoutPlanType;
    difficulty: WorkoutDifficulty;
    goal: string;
    duration_weeks: string;
    description: string;
    is_active: boolean;
}

interface ExerciseForm {
    name: string;
    muscle_group: string;
    primary_muscle: string;
    secondary_muscles: string[];
    media_urls: string[];
    equipment_required: boolean;
    instructions: string;
    is_active: boolean;
}

interface MuscleForm {
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

interface SessionForm {
    client: string;
    plan_assignment: string;
    workout_day: string;
    session_date: string;
}

const tabs: Array<{ id: TabId; label: string; icon: typeof DumbbellIcon }> = [
    { id: "plans", label: "Plans", icon: DumbbellIcon },
    { id: "library", label: "Exercise Library", icon: LibraryIcon },
    { id: "muscleGroups", label: "Muscle Groups", icon: LayersIcon },
    { id: "assignments", label: "Assignments", icon: UsersIcon },
    { id: "sessions", label: "Session Logs", icon: ActivityIcon },
];

const emptyPlanForm: PlanForm = {
    title: "",
    plan_type: "workout",
    difficulty: "beginner",
    goal: "",
    duration_weeks: "12",
    description: "",
    is_active: true,
};

const emptyExerciseForm: ExerciseForm = {
    name: "",
    muscle_group: "",
    primary_muscle: "",
    secondary_muscles: [],
    media_urls: [""],
    equipment_required: false,
    instructions: "",
    is_active: true,
};

const emptyMuscleForm: MuscleForm = {
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

const emptySessionForm: SessionForm = {
    client: "",
    plan_assignment: "",
    workout_day: "",
    session_date: "",
};

const emptyPlans: WorkoutPlan[] = [];
const emptyMuscleGroups: MuscleGroup[] = [];
const emptyMuscles: Muscle[] = [];
const emptyExercises: Exercise[] = [];
const emptyAssignments: WorkoutPlanAssignment[] = [];
const emptySessions: WorkoutSession[] = [];
const emptyClients: ClientData[] = [];

function getErrorMessage(error: unknown): string {
    const apiError = error as ApiErrorShape;
    const data = apiError.response?.data;
    return data?.error || data?.detail || data?.non_field_errors?.join(" ") || apiError.message || "Something went wrong.";
}

function clientName(client?: ClientData): string {
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

function compactStrings(values: string[]): string[] {
    return values.map((value) => value.trim()).filter(Boolean);
}

function getTodayInputDate(): string {
    return new Date().toISOString().slice(0, 10);
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

function ModalFrame({
    title,
    children,
    onClose,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
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
    const { tenantId } = useCurrentUserPermissions();
    const visibleTabs = useMemo(() => tabs.filter((tab) => allowedTabs.includes(tab.id)), [allowedTabs]);
    const isPlanningPage = allowedTabs.some((tab) => tab === "plans" || tab === "library" || tab === "muscleGroups" || tab === "assignments");
    const isTrackingPage = allowedTabs.includes("sessions");
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
    const [assignmentModal, setAssignmentModal] = useState<{ mode: ModalMode; item: WorkoutPlanAssignment | null } | null>(null);
    const [sessionModal, setSessionModal] = useState<{ mode: ModalMode; item: WorkoutSession | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
    const [exerciseForm, setExerciseForm] = useState<ExerciseForm>(emptyExerciseForm);
    const [muscleForm, setMuscleForm] = useState<MuscleForm>(emptyMuscleForm);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm);
    const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);

    const plansQuery = useQuery({ queryKey: ["workout-plans"], queryFn: getWorkoutPlans, enabled: hasHydrated && (isPlanningPage || isTrackingPage) });
    const muscleGroupsQuery = useQuery({ queryKey: ["workout-muscle-groups"], queryFn: getMuscleGroups, enabled: hasHydrated && isPlanningPage });
    const musclesQuery = useQuery({ queryKey: ["workout-muscles"], queryFn: getMuscles, enabled: hasHydrated && isPlanningPage });
    const exercisesQuery = useQuery({ queryKey: ["workout-exercises"], queryFn: getExercises, enabled: hasHydrated && isPlanningPage });
    const assignmentsQuery = useQuery({ queryKey: ["workout-assignments"], queryFn: getWorkoutAssignments, enabled: hasHydrated });
    const sessionsQuery = useQuery({ queryKey: ["workout-sessions"], queryFn: getWorkoutSessions, enabled: hasHydrated && isTrackingPage });
    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients, enabled: hasHydrated });

    const plans = plansQuery.data ?? emptyPlans;
    const muscleGroups = muscleGroupsQuery.data ?? emptyMuscleGroups;
    const muscles = musclesQuery.data ?? emptyMuscles;
    const exercises = exercisesQuery.data ?? emptyExercises;
    const assignments = assignmentsQuery.data ?? emptyAssignments;
    const sessions = sessionsQuery.data ?? emptySessions;
    const clients = clientsQuery.data ?? emptyClients;

    const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
    const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
    const assignmentById = useMemo(() => new Map(assignments.map((assignment) => [assignment.id, assignment])), [assignments]);
    const muscleGroupById = useMemo(() => new Map(muscleGroups.map((group) => [String(group.id), group])), [muscleGroups]);
    const muscleById = useMemo(() => new Map(muscles.map((muscle) => [String(muscle.id), muscle])), [muscles]);

    const query = search.trim().toLowerCase();

    const filteredPlans = useMemo(() => {
        return plans.filter((plan) => {
            if (!query) return true;
            return [plan.title, plan.goal || "", plan.difficulty, plan.plan_type].some((value) => value.toLowerCase().includes(query));
        });
    }, [plans, query]);

    const filteredExercises = useMemo(() => {
        return exercises.filter((exercise) => {
            if (!query) return true;
            return [
                exercise.name,
                exercise.muscle_group_name || "",
                exercise.primary_muscle_name || "",
                exercise.instructions || "",
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [exercises, query]);

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

    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            if (!query) return true;
            const assignment = session.plan_assignment ? assignmentById.get(session.plan_assignment) : undefined;
            return [
                clientName(clientById.get(session.client)),
                session.session_date,
                assignment?.plan_title || "",
                assignment?.client_name || "",
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [assignmentById, clientById, query, sessions]);

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

    const invalidateSessions = async () => {
        await queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
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

    const exerciseMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string; payload: ExercisePayload }) => (
            mode === "add" ? createExercise(payload) : updateExercise(id || "", payload)
        ),
        onSuccess: async () => {
            await invalidateLibrary();
            setExerciseModal(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const assignmentMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string; payload: WorkoutPlanAssignmentPayload }) => (
            mode === "add" ? createWorkoutAssignment(payload) : updateWorkoutAssignment(id || "", payload)
        ),
        onSuccess: async () => {
            await invalidateAssignments();
            setAssignmentModal(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const sessionMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string; payload: WorkoutSessionPayload }) => (
            mode === "add" ? createWorkoutSession(payload) : updateWorkoutSession(id || "", payload)
        ),
        onSuccess: async () => {
            await invalidateSessions();
            setSessionModal(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const deleteMutation = useMutation({
        mutationFn: async (target: DeleteTarget) => {
            if (target.type === "plan") await deleteWorkoutPlan(target.id);
            if (target.type === "muscle") await deleteMuscleGroup(target.id);
            if (target.type === "exercise") await deleteExercise(target.id);
            if (target.type === "assignment") await deleteWorkoutAssignment(target.id);
            if (target.type === "session") await deleteWorkoutSession(target.id);
            return target.type;
        },
        onSuccess: async (type) => {
            if (type === "plan") await invalidatePlans();
            if (type === "muscle" || type === "exercise") await invalidateLibrary();
            if (type === "assignment") await invalidateAssignments();
            if (type === "session") await invalidateSessions();
            setDeleteTarget(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const openPlanModal = (mode: ModalMode, item: WorkoutPlan | null = null) => {
        setFormError("");
        setPlanForm(item ? {
            title: item.title,
            plan_type: item.plan_type,
            difficulty: item.difficulty,
            goal: item.goal || "",
            duration_weeks: String(item.duration_weeks || 12),
            description: item.description || "",
            is_active: item.is_active,
        } : emptyPlanForm);
        setPlanModal({ mode, item });
    };

    const openExerciseModal = (mode: ModalMode, item: Exercise | null = null, presetMuscleGroup = "") => {
        setFormError("");
        setExerciseForm(item ? {
            name: item.name,
            muscle_group: item.muscle_group ? String(item.muscle_group) : "",
            primary_muscle: item.primary_muscle ? String(item.primary_muscle) : "",
            secondary_muscles: (item.muscles || [])
                .filter((muscle) => !muscle.is_primary && String(muscle.muscle) !== String(item.primary_muscle || ""))
                .map((muscle) => String(muscle.muscle)),
            media_urls: (item.media || []).map((media) => media.youtube_url || "").filter(Boolean).concat(""),
            equipment_required: item.equipment_required,
            instructions: item.instructions || "",
            is_active: item.is_active,
        } : { ...emptyExerciseForm, muscle_group: presetMuscleGroup });
        setExerciseModal({ mode, item });
    };

    const openMuscleModal = (mode: ModalMode, item: MuscleGroup | null = null) => {
        setFormError("");
        setMuscleForm(item ? { name: item.name } : emptyMuscleForm);
        setMuscleModal({ mode, item });
    };

    const openAssignmentModal = (mode: ModalMode, item: WorkoutPlanAssignment | null = null) => {
        setFormError("");
        setAssignmentForm(item ? {
            client: item.client,
            plan: item.plan,
            start_date: item.start_date,
            end_date: item.end_date || "",
            status: item.status,
            notes: item.notes || "",
        } : emptyAssignmentForm);
        setAssignmentModal({ mode, item });
    };

    const openSessionModal = (mode: ModalMode, item: WorkoutSession | null = null) => {
        setFormError("");
        setSessionForm(item ? {
            client: item.client,
            plan_assignment: item.plan_assignment || "",
            workout_day: item.workout_day ? String(item.workout_day) : "",
            session_date: item.session_date,
        } : { ...emptySessionForm, session_date: getTodayInputDate() });
        setSessionModal({ mode, item });
    };

    const tenantPayload = tenantId ? { tenant: tenantId } : {};

    const submitPlan = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const durationWeeks = Number(planForm.duration_weeks);
        if (!planForm.title.trim()) {
            setFormError("Plan title is required.");
            return;
        }
        if (!Number.isInteger(durationWeeks) || durationWeeks < 1) {
            setFormError("Duration must be a whole number greater than zero.");
            return;
        }

        planMutation.mutate({
            mode: planModal?.mode || "add",
            id: planModal?.item?.id,
            payload: {
                ...tenantPayload,
                title: planForm.title.trim(),
                plan_type: planForm.plan_type,
                difficulty: planForm.difficulty,
                goal: planForm.goal.trim(),
                duration_weeks: durationWeeks,
                description: planForm.description.trim(),
                is_active: planForm.is_active,
            },
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

        const secondaryMuscles = exerciseForm.secondary_muscles.filter((muscle) => muscle !== exerciseForm.primary_muscle);
        const mediaUrls = compactStrings(exerciseForm.media_urls);

        exerciseMutation.mutate({
            mode: exerciseModal?.mode || "add",
            id: exerciseModal?.item?.id,
            payload: {
                ...tenantPayload,
                name: exerciseForm.name.trim(),
                primary_muscle: exerciseForm.primary_muscle,
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
        if (!assignmentForm.client || !assignmentForm.plan || !assignmentForm.start_date) {
            setFormError("Client, plan, and start date are required.");
            return;
        }

        assignmentMutation.mutate({
            mode: assignmentModal?.mode || "add",
            id: assignmentModal?.item?.id,
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

    const submitSession = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!sessionForm.client || !sessionForm.session_date) {
            setFormError("Client and session date are required.");
            return;
        }

        sessionMutation.mutate({
            mode: sessionModal?.mode || "add",
            id: sessionModal?.item?.id,
            payload: {
                ...tenantPayload,
                client: sessionForm.client,
                plan_assignment: sessionForm.plan_assignment || null,
                workout_day: sessionForm.workout_day || null,
                session_date: sessionForm.session_date,
            },
        });
    };

    const planningIsLoading = plansQuery.isLoading || muscleGroupsQuery.isLoading || musclesQuery.isLoading || exercisesQuery.isLoading || assignmentsQuery.isLoading || clientsQuery.isLoading;
    const trackingIsLoading = sessionsQuery.isLoading || assignmentsQuery.isLoading || clientsQuery.isLoading;
    const planningError = plansQuery.error || muscleGroupsQuery.error || musclesQuery.error || exercisesQuery.error || assignmentsQuery.error || clientsQuery.error;
    const trackingError = sessionsQuery.error || assignmentsQuery.error || clientsQuery.error;
    const isLoading = !hasHydrated || (isPlanningPage && planningIsLoading) || (isTrackingPage && trackingIsLoading);
    const pageError = (isPlanningPage ? planningError : null) || (isTrackingPage ? trackingError : null);

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
                    {/* {allowedTabs.includes("muscleGroups") && <Metric label="Muscle Groups" value={muscleGroups.length} />} */}
                    {allowedTabs.includes("assignments") && <Metric label="Assignments" value={assignments.length} />}
                    {allowedTabs.includes("sessions") && <Metric label="Sessions" value={sessions.length} />}
                </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
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
                        <PlansTab plans={filteredPlans} onAdd={() => openPlanModal("add")} onEdit={(plan) => openPlanModal("edit", plan)} onDelete={(plan) => setDeleteTarget({ type: "plan", id: plan.id, label: plan.title })} />
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
                    {activeTab === "muscleGroups" && (
                        <MuscleGroupsTab
                            muscleGroups={muscleGroups}
                            muscles={muscles}
                            onAddMuscle={() => openMuscleModal("add")}
                            onAddExerciseForMuscle={(muscleGroup) => openExerciseModal("add", null, String(muscleGroup.id))}
                            onEditMuscle={(muscle) => openMuscleModal("edit", muscle)}
                            onDeleteMuscle={(muscle) => setDeleteTarget({ type: "muscle", id: muscle.id, label: muscle.name })}
                        />
                    )}
                    {activeTab === "assignments" && (
                        <AssignmentsTab
                            assignments={filteredAssignments}
                            clients={clients}
                            planById={planById}
                            clientById={clientById}
                            onAdd={() => openAssignmentModal("add")}
                            onEdit={(assignment) => openAssignmentModal("edit", assignment)}
                            onDelete={(assignment) => setDeleteTarget({ type: "assignment", id: assignment.id, label: assignment.plan_title || planById.get(assignment.plan)?.title || "Assignment" })}
                        />
                    )}
                    {activeTab === "sessions" && (
                        <SessionsTab
                            sessions={filteredSessions}
                            clientById={clientById}
                            assignmentById={assignmentById}
                            onAdd={() => openSessionModal("add")}
                            onEdit={(session) => openSessionModal("edit", session)}
                            onDelete={(session) => setDeleteTarget({ type: "session", id: session.id, label: `${clientName(clientById.get(session.client))} on ${session.session_date}` })}
                        />
                    )}
                </>
            )}

            {planModal && (
                <ModalFrame title={planModal.mode === "add" ? "Create Workout Plan" : "Edit Workout Plan"} onClose={() => setPlanModal(null)}>
                    <form onSubmit={submitPlan} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Title" value={planForm.title} onChange={(value) => setPlanForm({ ...planForm, title: value })} required />
                            <TextField label="Goal" value={planForm.goal} onChange={(value) => setPlanForm({ ...planForm, goal: value })} />
                            <SelectField label="Plan Type" value={planForm.plan_type} onChange={(value) => setPlanForm({ ...planForm, plan_type: value as WorkoutPlanType })}>
                                <option value="workout">Workout</option>
                                <option value="diet">Diet</option>
                                <option value="hybrid">Hybrid</option>
                            </SelectField>
                            <SelectField label="Difficulty" value={planForm.difficulty} onChange={(value) => setPlanForm({ ...planForm, difficulty: value as WorkoutDifficulty })}>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </SelectField>
                            <TextField label="Duration Weeks" type="number" value={planForm.duration_weeks} onChange={(value) => setPlanForm({ ...planForm, duration_weeks: value })} min="1" required />
                        </div>
                        <TextArea label="Description" value={planForm.description} onChange={(value) => setPlanForm({ ...planForm, description: value })} />
                        <CheckboxField label="Active plan" checked={planForm.is_active} onChange={(checked) => setPlanForm({ ...planForm, is_active: checked })} />
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
                <ModalFrame title={exerciseModal.mode === "add" ? "Create Exercise" : "Edit Exercise"} onClose={() => setExerciseModal(null)}>
                    <form onSubmit={submitExercise} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Name" value={exerciseForm.name} onChange={(value) => setExerciseForm({ ...exerciseForm, name: value })} required />
                            <SelectField label="Muscle Group" value={exerciseForm.muscle_group} onChange={(value) => setExerciseForm({ ...exerciseForm, muscle_group: value, primary_muscle: "", secondary_muscles: [] })} required>
                                <option value="">Select muscle group</option>
                                {muscleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </SelectField>
                            <SelectField label="Primary Muscle" value={exerciseForm.primary_muscle} onChange={(value) => setExerciseForm({ ...exerciseForm, primary_muscle: value, secondary_muscles: exerciseForm.secondary_muscles.filter((muscle) => muscle !== value) })} required>
                                <option value="">Select primary muscle</option>
                                {muscles
                                    .filter((muscle) => String(muscle.muscle_group) === exerciseForm.muscle_group)
                                    .map((muscle) => <option key={muscle.id} value={muscle.id}>{muscle.name}</option>)}
                            </SelectField>
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
                        <ModalActions loading={exerciseMutation.isPending} submitLabel={exerciseModal.mode === "add" ? "Create Exercise" : "Save Changes"} onCancel={() => setExerciseModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {assignmentModal && (
                <ModalFrame title={assignmentModal.mode === "add" ? "Assign Workout Plan" : "Edit Assignment"} onClose={() => setAssignmentModal(null)}>
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
                        <ModalActions loading={assignmentMutation.isPending} submitLabel={assignmentModal.mode === "add" ? "Assign Plan" : "Save Changes"} onCancel={() => setAssignmentModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {sessionModal && (
                <ModalFrame title={sessionModal.mode === "add" ? "Create Session" : "Edit Session"} onClose={() => setSessionModal(null)}>
                    <form onSubmit={submitSession} className="space-y-4 p-6">
                        <ErrorText message={formError} />
                        <div className="grid gap-4 md:grid-cols-2">
                            <SelectField label="Client" value={sessionForm.client} onChange={(value) => setSessionForm({ ...sessionForm, client: value })} required>
                                <option value="">Select client...</option>
                                {clients.map((client) => <option key={client.id} value={client.id}>{clientName(client)}</option>)}
                            </SelectField>
                            <SelectField label="Assignment" value={sessionForm.plan_assignment} onChange={(value) => setSessionForm({ ...sessionForm, plan_assignment: value })}>
                                <option value="">No assignment</option>
                                {assignments.map((assignment) => (
                                    <option key={assignment.id} value={assignment.id}>
                                        {assignment.plan_title || planById.get(assignment.plan)?.title || "Plan"} - {assignment.client_name || clientName(clientById.get(assignment.client))}
                                    </option>
                                ))}
                            </SelectField>
                            <TextField label="Workout Day ID" value={sessionForm.workout_day} onChange={(value) => setSessionForm({ ...sessionForm, workout_day: value })} />
                            <TextField label="Session Date" type="date" value={sessionForm.session_date} onChange={(value) => setSessionForm({ ...sessionForm, session_date: value })} required />
                        </div>
                        <ModalActions loading={sessionMutation.isPending} submitLabel={sessionModal.mode === "add" ? "Create Session" : "Save Changes"} onCancel={() => setSessionModal(null)} />
                    </form>
                </ModalFrame>
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

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-semibold uppercase text-zinc-500">{label}</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-white">{value}</div>
        </div>
    );
}

function PlansTab({ plans, onAdd, onEdit, onDelete }: { plans: WorkoutPlan[]; onAdd: () => void; onEdit: (plan: WorkoutPlan) => void; onDelete: (plan: WorkoutPlan) => void }) {
    return (
        <Panel title="Workout Plans" actionLabel="New Plan" onAction={onAdd}>
            <DataTable emptyText="No workout plans found." columns={["Status", "Plan", "Type", "Difficulty", "Duration", "Actions"]}>
                {plans.map((plan) => (
                    <tr key={plan.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="px-6 py-4"><Badge className={plan.is_active ? statusClasses("active") : statusClasses("cancelled")}>{plan.is_active ? "Active" : "Inactive"}</Badge></td>
                        <td className="px-6 py-4">
                            <div className="font-semibold text-zinc-900 dark:text-white">{plan.title}</div>
                            <div className="text-xs text-zinc-500">{plan.goal || "No goal set"}</div>
                        </td>
                        <td className="px-6 py-4 capitalize">{plan.plan_type}</td>
                        <td className="px-6 py-4 capitalize">{plan.difficulty}</td>
                        <td className="px-6 py-4">{plan.duration_weeks} weeks</td>
                        <td className="px-6 py-4 text-right"><RowActions onEdit={() => onEdit(plan)} onDelete={() => onDelete(plan)} /></td>
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
            <DataTable emptyText="No exercises found." columns={["Status", "Exercise", "Muscle Group", "Primary Muscle", "Secondary", "Media", "Equipment", "Actions"]}>
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
    onAdd,
    onEdit,
    onDelete,
}: {
    assignments: WorkoutPlanAssignment[];
    clients: ClientData[];
    planById: Map<string, WorkoutPlan>;
    clientById: Map<string, ClientData>;
    onAdd: () => void;
    onEdit: (assignment: WorkoutPlanAssignment) => void;
    onDelete: (assignment: WorkoutPlanAssignment) => void;
}) {
    return (
        <Panel title="Client Plan Assignments" actionLabel="Assign Plan" onAction={onAdd}>
            <DataTable emptyText="No workout assignments found." columns={["Status", "Client", "Plan", "Dates", "Actions"]}>
                {assignments.map((assignment) => (
                    <tr key={assignment.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="px-6 py-4"><Badge className={statusClasses(assignment.status)}>{assignment.status}</Badge></td>
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{assignment.client_name || clientName(clientById.get(assignment.client))}</td>
                        <td className="px-6 py-4">{assignment.plan_title || planById.get(assignment.plan)?.title || assignment.plan}</td>
                        <td className="px-6 py-4">
                            <div>{assignment.start_date}</div>
                            <div className="text-xs text-zinc-500">{assignment.end_date || "No end date"}</div>
                        </td>
                        <td className="px-6 py-4 text-right"><RowActions onEdit={() => onEdit(assignment)} onDelete={() => onDelete(assignment)} /></td>
                    </tr>
                ))}
            </DataTable>
        </Panel>
    );
}

function SessionsTab({
    sessions,
    clientById,
    assignmentById,
    onAdd,
    onEdit,
    onDelete,
}: {
    sessions: WorkoutSession[];
    clientById: Map<string, ClientData>;
    assignmentById: Map<string, WorkoutPlanAssignment>;
    onAdd: () => void;
    onEdit: (session: WorkoutSession) => void;
    onDelete: (session: WorkoutSession) => void;
}) {
    return (
        <Panel title="Workout Session Logs" actionLabel="New Session" onAction={onAdd}>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {sessions.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-zinc-400">No workout sessions found.</div>
                ) : sessions.map((session) => {
                    const assignment = session.plan_assignment ? assignmentById.get(session.plan_assignment) : undefined;
                    return (
                        <div key={session.id} className="px-6 py-5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white">{clientName(clientById.get(session.client))}</h3>
                                        <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{session.session_date}</Badge>
                                    </div>
                                    <div className="mt-1 text-sm text-zinc-500">
                                        {assignment?.plan_title || "No assignment"} {session.workout_day ? `- Day ${session.workout_day}` : ""}
                                    </div>
                                </div>
                                <RowActions onEdit={() => onEdit(session)} onDelete={() => onDelete(session)} />
                            </div>
                            <div className="mt-4 space-y-3">
                                {(session.logs || []).length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400 dark:border-zinc-800">No exercise logs recorded for this session.</div>
                                ) : session.logs?.map((log) => (
                                    <div key={log.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="font-medium text-zinc-900 dark:text-white">{log.exercise_name || log.exercise}</div>
                                            <div className="text-xs text-zinc-500">
                                                Planned: {log.planned_sets || "-"} sets / {log.planned_reps || "-"} reps / {log.planned_weight || "-"} kg
                                            </div>
                                        </div>
                                        {log.notes && <p className="mt-2 text-sm text-zinc-500">{log.notes}</p>}
                                        {(log.sets || []).length > 0 && (
                                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                                                {log.sets?.map((set) => (
                                                    <div key={set.id} className="rounded-md bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                                                        Set {set.set_number}: {set.reps} reps, {set.weight} kg, {set.rest_sec}s rest {set.is_pr ? "(PR)" : ""}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

function Panel({ title, actionLabel, onAction, children }: { title: string; actionLabel: string; onAction: () => void; children: React.ReactNode }) {
    return (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
                <h2 className="font-bold text-zinc-900 dark:text-white">{title}</h2>
                <button type="button" onClick={onAction} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                    <PlusIcon className="h-4 w-4" />
                    {actionLabel}
                </button>
            </div>
            {children}
        </section>
    );
}

function DataTable({ columns, emptyText, children }: { columns: string[]; emptyText: string; children: React.ReactNode }) {
    const rows = Array.isArray(children) ? children.filter(Boolean) : children;
    const hasRows = Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                        {columns.map((column) => <th key={column} className={`px-6 py-4 ${column === "Actions" ? "text-right" : ""}`}>{column}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                    {hasRows ? rows : (
                        <tr><td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-400">{emptyText}</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="flex items-center justify-end gap-2">
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

function ErrorText({ message }: { message: string }) {
    if (!message) return null;
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{message}</div>;
}

function TextField({ label, value, onChange, type = "text", required, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string }) {
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

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
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

function SelectField({ label, value, onChange, required, children }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; children: React.ReactNode }) {
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

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
            {label}
        </label>
    );
}

function ModalActions({ loading, submitLabel, onCancel }: { loading: boolean; submitLabel: string; onCancel: () => void }) {
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
