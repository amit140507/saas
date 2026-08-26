"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    CopyIcon,
    EyeIcon,
    Loader2Icon,
    MailIcon,
    MessageCircleIcon,
    SaveIcon,
    SearchIcon,
    SendIcon,
    Trash2Icon,
} from "lucide-react";

import { getClients } from "@/services/client.service";
import {
    createExercise,
    createWorkoutAssignment,
    createWorkoutPlan,
    getExercises,
    getMuscleGroups,
    getMuscles,
    getWorkoutPlans,
} from "@/services/workout.service";
import { useCurrentUserPermissions } from "@/lib/permissions";
import type { ClientData } from "@/types/client.type";
import type {
    Exercise,
    ExercisePayload,
    ExerciseRepsRange,
    ExerciseRestPeriod,
    ExerciseTrainingLocation,
    ExerciseType,
    Muscle,
    MuscleGroup,
    WorkoutDay,
    WorkoutDifficulty,
    WorkoutPlan,
    WorkoutPlanAssignment,
    WorkoutType,
} from "@/types/workout.type";
import {
    buildWorkoutPlanPayload,
    CheckboxField,
    clientName,
    createPlanDay,
    createPlanExerciseRow,
    createPlanExerciseRowFromExercise,
    emptyPlanForm,
    ErrorText,
    getErrorMessage,
    mapWorkoutDayToForm,
    ModalActions,
    ModalFrame,
    PlanForm,
    PlanTemplateEditor,
    repsOptions,
    restOptions,
    SelectField,
    TextArea,
    TextField,
    WorkoutPlanViewModal,
} from "../../_components/WorkoutManagementPage";

const emptyClients: ClientData[] = [];
const emptyExercises: Exercise[] = [];
const emptyMuscleGroups: MuscleGroup[] = [];
const emptyMuscles: Muscle[] = [];
const emptyPlans: WorkoutPlan[] = [];

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

function compactStrings(values: string[]): string[] {
    return values.map((value) => value.trim()).filter(Boolean);
}

function todayDateValue() {
    return new Date().toISOString().slice(0, 10);
}

function createInitialPlanForm(): PlanForm {
    return {
        ...emptyPlanForm,
        days: [createPlanDay()],
    };
}

function getClientSearchText(client: ClientData): string {
    return [
        clientName(client),
        client.user.email,
        client.user.public_id || "",
        client.phone || "",
    ].join(" ").toLowerCase();
}

function getClientLabel(client: ClientData): string {
    return `${clientName(client)} (${client.user.email})${client.user.public_id ? ` - ${client.user.public_id}` : ""}`;
}

function getShareBaseUrl(): string {
    const configuredUrl = process.env.NEXT_PUBLIC_USER_APP_URL?.trim().replace(/\/+$/, "");
    if (configuredUrl) {
        return configuredUrl;
    }

    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    return "";
}

function normalizeWhatsAppPhone(phone?: string | null): string {
    return (phone || "").replace(/\D/g, "");
}

function buildPreviewDays(planForm: PlanForm, exerciseById: Map<string, Exercise>): WorkoutDay[] {
    return planForm.days.map((day, dayIndex) => ({
        id: `preview-day-${day.id}`,
        plan: null,
        plan_assignment: null,
        name: day.name.trim() || `Day ${dayIndex + 1}`,
        day_number: Number(day.day_number) || dayIndex + 1,
        day_type: day.day_type,
        notes: day.notes.trim(),
        exercises: (day.day_type === "training" ? day.exercises : []).map((row, rowIndex) => {
            const exercise = exerciseById.get(row.exercise);
            return {
                id: `preview-row-${row.id}`,
                workout_day: `preview-day-${day.id}`,
                exercise: row.exercise,
                exercise_name: row.exercise_search || exercise?.name || row.exercise,
                exercise_video_urls: exercise?.media?.map((media) => media.youtube_url || "").filter(Boolean) || [],
                sequence: rowIndex + 1,
                body_part: row.body_part || exercise?.muscle_group_name || exercise?.primary_muscle_name || null,
                video_url: row.video_url.trim() || null,
                weight: null,
                sets: Number(row.sets) || 1,
                reps: row.reps.trim(),
                rest: Number(row.rest) || 0,
                set_method: row.set_method,
                superset_group: row.set_method === "superset" ? row.superset_group.trim() || null : null,
                notes: row.notes.trim(),
                exercise_type: exercise?.exercise_type || 3,
            };
        }),
    }));
}

export default function NewWorkoutPlanCreatePage() {
    const queryClient = useQueryClient();
    const { tenantId } = useCurrentUserPermissions();
    const [planForm, setPlanForm] = useState<PlanForm>(() => createInitialPlanForm());
    const [selectedClientId, setSelectedClientId] = useState("");
    const [clientSearch, setClientSearch] = useState("");
    const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
    const [startDate, setStartDate] = useState(todayDateValue);
    const [endDate, setEndDate] = useState("");
    const [assignmentNotes, setAssignmentNotes] = useState("");
    const [formError, setFormError] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [exerciseCreateTargetDayId, setExerciseCreateTargetDayId] = useState<string | null>(null);
    const [exerciseForm, setExerciseForm] = useState<ExerciseForm>(emptyExerciseForm);
    const [previewDays, setPreviewDays] = useState<WorkoutDay[] | null>(null);
    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [savedAssignment, setSavedAssignment] = useState<WorkoutPlanAssignment | null>(null);

    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients });
    const plansQuery = useQuery({ queryKey: ["workout-plans"], queryFn: getWorkoutPlans });
    const muscleGroupsQuery = useQuery({ queryKey: ["workout-muscle-groups"], queryFn: getMuscleGroups });
    const musclesQuery = useQuery({ queryKey: ["workout-muscles"], queryFn: getMuscles });
    const exercisesQuery = useQuery({ queryKey: ["workout-exercises"], queryFn: getExercises });

    const clients = clientsQuery.data ?? emptyClients;
    const plans = plansQuery.data ?? emptyPlans;
    const muscleGroups = muscleGroupsQuery.data ?? emptyMuscleGroups;
    const muscles = musclesQuery.data ?? emptyMuscles;
    const exercises = exercisesQuery.data ?? emptyExercises;
    const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);
    const muscleGroupById = useMemo(() => new Map(muscleGroups.map((group) => [String(group.id), group])), [muscleGroups]);
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    const selectedClientLabel = selectedClient ? getClientLabel(selectedClient) : "";
    const isSearchingClients = isClientSearchOpen && clientSearch.trim().length > 0 && clientSearch !== selectedClientLabel;
    const shareUrl = savedAssignment?.share_token ? `${getShareBaseUrl()}/workout-plan/${savedAssignment.share_token}` : "";
    const whatsappPhone = normalizeWhatsAppPhone(selectedClient?.phone);
    const shareMessage = shareUrl ? `Your workout plan is ready: ${shareUrl}` : "";

    const filteredClients = useMemo(() => {
        const query = clientSearch.trim().toLowerCase();
        if (!query) {
            return emptyClients;
        }

        return clients.filter((client) => getClientSearchText(client).includes(query));
    }, [clientSearch, clients]);

    const buildPlanPayloadOrThrow = () => {
        const tenantPayload = tenantId ? { tenant: tenantId } : {};
        const { payload, error } = buildWorkoutPlanPayload(planForm, exerciseById, tenantPayload);
        if (!payload) {
            throw new Error(error);
        }
        return { tenantPayload, payload };
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { tenantPayload, payload } = buildPlanPayloadOrThrow();

            if (!selectedClientId) {
                throw new Error("Client is required.");
            }
            if (!startDate) {
                throw new Error("Start date is required.");
            }

            const plan = await createWorkoutPlan(payload);
            const assignment = await createWorkoutAssignment({
                ...tenantPayload,
                client: selectedClientId,
                plan: plan.id,
                start_date: startDate,
                end_date: endDate || null,
                status: "active",
                notes: assignmentNotes.trim(),
            });
            return assignment;
        },
        onSuccess: async (assignment) => {
            setSavedAssignment(assignment);
            setActionMessage("Plan saved and assigned to the selected client.");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["workout-plans"] }),
                queryClient.invalidateQueries({ queryKey: ["workout-assignments"] }),
            ]);
        },
        onError: (error) => {
            setActionMessage("");
            setFormError(getErrorMessage(error));
        },
    });

    const templateMutation = useMutation({
        mutationFn: async () => {
            const { payload } = buildPlanPayloadOrThrow();
            return createWorkoutPlan(payload);
        },
        onSuccess: async () => {
            setActionMessage("Template saved. You can reuse it from Use Template.");
            await queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
        },
        onError: (error) => {
            setActionMessage("");
            setFormError(getErrorMessage(error));
        },
    });

    const exerciseMutation = useMutation({
        mutationFn: (payload: ExercisePayload) => createExercise(payload),
        onSuccess: async (exercise) => {
            await queryClient.invalidateQueries({ queryKey: ["workout-exercises"] });
            if (exerciseCreateTargetDayId) {
                addPlanExerciseRow(exerciseCreateTargetDayId, createPlanExerciseRowFromExercise(exercise));
            }
            setExerciseCreateTargetDayId(null);
            setExerciseForm(emptyExerciseForm);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const updatePlanDay = (dayId: string, updates: Partial<PlanForm["days"][number]>) => {
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

    const movePlanDay = (draggedDayId: string, targetDayId: string) => {
        if (draggedDayId === targetDayId) return;

        setPlanForm((current) => {
            const fromIndex = current.days.findIndex((day) => day.id === draggedDayId);
            const toIndex = current.days.findIndex((day) => day.id === targetDayId);
            if (fromIndex === -1 || toIndex === -1) return current;

            const nextDays = [...current.days];
            const [movedDay] = nextDays.splice(fromIndex, 1);
            const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
            nextDays.splice(insertIndex, 0, movedDay);

            return {
                ...current,
                days: nextDays,
            };
        });
    };

    const updatePlanExerciseRow = (dayId: string, rowId: string, updates: Partial<PlanForm["days"][number]["exercises"][number]>) => {
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

    const addPlanExerciseRow = (dayId: string, row = createPlanExerciseRow()) => {
        setPlanForm((current) => ({
            ...current,
            days: current.days.map((day) => (
                day.id === dayId
                    ? { ...day, exercises: [...day.exercises, row] }
                    : day
            )),
        }));
    };

    const openExerciseModalForPlanDay = (dayId: string) => {
        setFormError("");
        setExerciseForm(emptyExerciseForm);
        setExerciseCreateTargetDayId(dayId);
    };

    const closeExerciseModal = () => {
        setExerciseCreateTargetDayId(null);
        setExerciseForm(emptyExerciseForm);
    };

    const submitExercise = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");

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

        const tenantPayload = tenantId ? { tenant: tenantId } : {};
        const secondaryMuscles = exerciseForm.secondary_muscles.filter((muscle) => muscle !== exerciseForm.primary_muscle);
        const mediaUrls = compactStrings(exerciseForm.media_urls);

        exerciseMutation.mutate({
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
        });
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

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    const handlePreview = () => {
        setFormError("");
        setActionMessage("");
        try {
            buildPlanPayloadOrThrow();
            setPreviewDays(buildPreviewDays(planForm, exerciseById));
        } catch (error) {
            setFormError(getErrorMessage(error));
        }
    };

    const handleSave = () => {
        setFormError("");
        setActionMessage("");
        saveMutation.mutate();
    };

    const handleSaveTemplate = () => {
        setFormError("");
        setActionMessage("");
        templateMutation.mutate();
    };

    const handleClientSearchChange = (value: string) => {
        setClientSearch(value);
        setIsClientSearchOpen(true);

        if (selectedClient && value !== selectedClientLabel) {
            setSelectedClientId("");
            setSavedAssignment(null);
        }
    };

    const handleClientSelect = (client: ClientData) => {
        setSelectedClientId(client.id);
        setClientSearch(getClientLabel(client));
        setIsClientSearchOpen(false);
        setSavedAssignment(null);
    };

    const handleTemplateSelect = (template: WorkoutPlan) => {
        setPlanForm({
            title: template.title,
            difficulty: template.difficulty,
            goal: template.goal || "",
            duration_weeks: String(template.duration_weeks || 12),
            description: template.description || "",
            is_active: template.is_active,
            days: (template.template_days || []).length
                ? [...(template.template_days || [])]
                    .sort((a, b) => a.day_number - b.day_number)
                    .map((day) => mapWorkoutDayToForm(day, exerciseById))
                : [createPlanDay()],
        });
        setActionMessage(`Loaded template: ${template.title}`);
        setFormError("");
        setIsTemplatePickerOpen(false);
        setSavedAssignment(null);
    };

    const handleCopyShareLink = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setActionMessage("Share link copied.");
        } catch {
            setFormError("Could not copy the share link.");
        }
    };

    const isLoading = clientsQuery.isLoading || plansQuery.isLoading || muscleGroupsQuery.isLoading || musclesQuery.isLoading || exercisesQuery.isLoading;
    const pageError = clientsQuery.error || plansQuery.error || muscleGroupsQuery.error || musclesQuery.error || exercisesQuery.error;
    const isActionPending = saveMutation.isPending || templateMutation.isPending;
    const emailHref = selectedClient?.user.email && shareMessage
        ? `mailto:${selectedClient.user.email}?subject=${encodeURIComponent("Your workout plan")}&body=${encodeURIComponent(shareMessage)}`
        : "";
    const whatsappHref = whatsappPhone && shareMessage
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(shareMessage)}`
        : "";

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link
                        href="/dashboard/workouts/planning"
                        className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Workout Planning
                    </Link>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Create Workout Plan</h1>
                    <p className="mt-1 text-sm text-zinc-500">Build a reusable plan and assign it to a client.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsTemplatePickerOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    <SearchIcon className="h-4 w-4" />
                    Use Template
                </button>
            </div>

            {pageError && <ErrorText message={getErrorMessage(pageError)} />}

            {isLoading ? (
                <div className="flex min-h-80 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                    <Loader2Icon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <ErrorText message={formError} />
                    {actionMessage && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {actionMessage}
                        </div>
                    )}

                    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Plan Name" value={planForm.title} onChange={(value) => setPlanForm({ ...planForm, title: value })} required />
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
                    </section>

                    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="block">
                                    <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">Client</span>
                                    <div className="relative">
                                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                        <input
                                            type="search"
                                            value={clientSearch}
                                            onChange={(event) => handleClientSearchChange(event.target.value)}
                                            onFocus={() => setIsClientSearchOpen(true)}
                                            onBlur={() => setIsClientSearchOpen(false)}
                                            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-9 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                            placeholder="Search clients by name, email, phone, or public ID"
                                            autoComplete="off"
                                        />
                                        {isSearchingClients && (
                                            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                                                {filteredClients.length > 0 ? (
                                                    filteredClients.map((client) => (
                                                        <button
                                                            key={client.id}
                                                            type="button"
                                                            onMouseDown={(event) => {
                                                                event.preventDefault();
                                                                handleClientSelect(client);
                                                            }}
                                                            className="block w-full px-3 py-2 text-left text-sm transition hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                                                        >
                                                            <span className="block font-semibold text-zinc-900 dark:text-white">{clientName(client)}</span>
                                                            <span className="block text-xs text-zinc-500">
                                                                {client.user.email}{client.phone ? ` - ${client.phone}` : ""}{client.user.public_id ? ` - ${client.user.public_id}` : ""}
                                                            </span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-2 text-sm text-zinc-500">No clients found.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </label>
                                {selectedClient && (
                                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                                        Selected: {selectedClientLabel}
                                    </p>
                                )}
                            </div>
                            <TextField label="Start Date" type="date" value={startDate} onChange={setStartDate} required />
                            <TextField label="End Date" type="date" value={endDate} onChange={setEndDate} />
                        </div>
                        <TextArea label="Assignment Notes" value={assignmentNotes} onChange={setAssignmentNotes} />
                    </section>

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
                        onMoveDay={movePlanDay}
                        enableDayCardControls
                        onCreateExerciseRequest={openExerciseModalForPlanDay}
                    />

                    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
                        <Link
                            href="/dashboard/workouts/planning"
                            className="inline-flex justify-center rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </Link>
                        <div className="flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={handlePreview}
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <EyeIcon className="h-4 w-4" />
                                Preview
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTemplate}
                                disabled={isActionPending}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                            >
                                {templateMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                                Save as Template
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isActionPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {saveMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSendModalOpen(true)}
                                disabled={!savedAssignment || !shareUrl}
                                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
                            >
                                <SendIcon className="h-4 w-4" />
                                Send
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {exerciseCreateTargetDayId && (
                <ModalFrame title="Create Exercise" onClose={closeExerciseModal}>
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
                                    <option key={option || "empty"} value={option}>{option || "-"}</option>
                                ))}
                            </SelectField>
                            <SelectField label="Rest" value={exerciseForm.rest} onChange={(value) => setExerciseForm({ ...exerciseForm, rest: value as "" | `${ExerciseRestPeriod}` })}>
                                {restOptions.map((option) => (
                                    <option key={option || "empty"} value={option}>{option ? `${option}s` : "-"}</option>
                                ))}
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
                                Add media URL
                            </button>
                        </div>

                        <TextArea label="Instructions" value={exerciseForm.instructions} onChange={(value) => setExerciseForm({ ...exerciseForm, instructions: value })} />
                        <div className="grid gap-3 md:grid-cols-2">
                            <CheckboxField label="Equipment required" checked={exerciseForm.equipment_required} onChange={(checked) => setExerciseForm({ ...exerciseForm, equipment_required: checked })} />
                            <CheckboxField label="Active exercise" checked={exerciseForm.is_active} onChange={(checked) => setExerciseForm({ ...exerciseForm, is_active: checked })} />
                        </div>
                        <ModalActions loading={exerciseMutation.isPending} submitLabel="Create Exercise" onCancel={closeExerciseModal} />
                    </form>
                </ModalFrame>
            )}

            {previewDays && (
                <WorkoutPlanViewModal
                    title="Preview Workout Plan"
                    planLabel={planForm.title || "Untitled Plan"}
                    statusLabel={planForm.is_active ? "active" : "inactive"}
                    meta={[
                        { label: "Client", value: selectedClient ? clientName(selectedClient) : "Not selected" },
                        { label: "Difficulty", value: planForm.difficulty },
                        { label: "Goal", value: planForm.goal || "-" },
                        { label: "Duration", value: `${planForm.duration_weeks || "-"} weeks` },
                    ]}
                    notes={planForm.description || ""}
                    days={previewDays}
                    emptyText="No workout days found for this plan."
                    onClose={() => setPreviewDays(null)}
                />
            )}

            {isTemplatePickerOpen && (
                <ModalFrame title="Use Template" onClose={() => setIsTemplatePickerOpen(false)} maxWidth="max-w-3xl">
                    <div className="space-y-3 p-6">
                        {plans.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
                                No saved workout templates found.
                            </div>
                        ) : plans.map((plan) => (
                            <button
                                key={plan.id}
                                type="button"
                                onClick={() => handleTemplateSelect(plan)}
                                className="block w-full rounded-lg border border-zinc-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
                            >
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="font-bold text-zinc-900 dark:text-white">{plan.title}</div>
                                        <div className="mt-1 text-sm text-zinc-500">{plan.goal || "No goal set"}</div>
                                    </div>
                                    <div className="text-sm font-semibold capitalize text-zinc-500">
                                        {plan.difficulty} - {plan.duration_weeks} weeks
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </ModalFrame>
            )}

            {isSendModalOpen && savedAssignment && (
                <ModalFrame title="Send this plan" onClose={() => setIsSendModalOpen(false)}>
                    <div className="space-y-5 p-6">
                        <p className="text-sm text-zinc-500">Shares the last saved version. The client opens this link, no login needed.</p>
                        <div>
                            <div className="mb-1 text-xs font-bold uppercase text-zinc-500">Shareable link</div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    readOnly
                                    value={shareUrl}
                                    className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleCopyShareLink}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-600 px-5 py-3 text-sm font-bold text-orange-600 transition hover:bg-orange-50 dark:hover:bg-orange-500/10"
                                >
                                    <CopyIcon className="h-4 w-4" />
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <a
                                href={whatsappHref || undefined}
                                target="_blank"
                                rel="noreferrer"
                                aria-disabled={!whatsappHref}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition ${
                                    whatsappHref
                                        ? "bg-orange-600 text-white hover:bg-orange-700"
                                        : "pointer-events-none bg-zinc-200 text-zinc-400 dark:bg-zinc-800"
                                }`}
                            >
                                <MessageCircleIcon className="h-4 w-4" />
                                Send on WhatsApp
                            </a>
                            <a
                                href={emailHref || undefined}
                                aria-disabled={!emailHref}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-bold transition ${
                                    emailHref
                                        ? "border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                                        : "pointer-events-none border-zinc-200 text-zinc-400 dark:border-zinc-800"
                                }`}
                            >
                                <MailIcon className="h-4 w-4" />
                                Email a copy
                            </a>
                        </div>
                        <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setIsSendModalOpen(false)}
                                className="rounded-lg border border-orange-600 px-5 py-3 text-sm font-bold text-orange-600 transition hover:bg-orange-50 dark:hover:bg-orange-500/10"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </ModalFrame>
            )}
        </div>
    );
}
