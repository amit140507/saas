"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader2Icon, SearchIcon, Trash2Icon } from "lucide-react";

import { getClients } from "@/services/client.service";
import {
    createExercise,
    createWorkoutAssignment,
    createWorkoutPlan,
    getExercises,
    getMuscleGroups,
    getMuscles,
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
    WorkoutDifficulty,
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
    ModalActions,
    ModalFrame,
    PlanForm,
    PlanTemplateEditor,
    repsOptions,
    restOptions,
    SelectField,
    TextArea,
    TextField,
} from "../../_components/WorkoutManagementPage";

const emptyClients: ClientData[] = [];
const emptyExercises: Exercise[] = [];
const emptyMuscleGroups: MuscleGroup[] = [];
const emptyMuscles: Muscle[] = [];

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

export default function NewWorkoutPlanCreatePage() {
    const router = useRouter();
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
    const [exerciseCreateTargetDayId, setExerciseCreateTargetDayId] = useState<string | null>(null);
    const [exerciseForm, setExerciseForm] = useState<ExerciseForm>(emptyExerciseForm);

    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients });
    const muscleGroupsQuery = useQuery({ queryKey: ["workout-muscle-groups"], queryFn: getMuscleGroups });
    const musclesQuery = useQuery({ queryKey: ["workout-muscles"], queryFn: getMuscles });
    const exercisesQuery = useQuery({ queryKey: ["workout-exercises"], queryFn: getExercises });

    const clients = clientsQuery.data ?? emptyClients;
    const muscleGroups = muscleGroupsQuery.data ?? emptyMuscleGroups;
    const muscles = musclesQuery.data ?? emptyMuscles;
    const exercises = exercisesQuery.data ?? emptyExercises;
    const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);
    const muscleGroupById = useMemo(() => new Map(muscleGroups.map((group) => [String(group.id), group])), [muscleGroups]);
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    const selectedClientLabel = selectedClient ? getClientLabel(selectedClient) : "";
    const isSearchingClients = isClientSearchOpen && clientSearch.trim().length > 0 && clientSearch !== selectedClientLabel;

    const filteredClients = useMemo(() => {
        const query = clientSearch.trim().toLowerCase();
        if (!query) {
            return emptyClients;
        }

        return clients.filter((client) => getClientSearchText(client).includes(query));
    }, [clientSearch, clients]);

    const createMutation = useMutation({
        mutationFn: async () => {
            const tenantPayload = tenantId ? { tenant: tenantId } : {};
            const { payload, error } = buildWorkoutPlanPayload(planForm, exerciseById, tenantPayload);

            if (!selectedClientId) {
                throw new Error("Client is required.");
            }
            if (!startDate) {
                throw new Error("Start date is required.");
            }
            if (!payload) {
                throw new Error(error);
            }

            const plan = await createWorkoutPlan(payload);
            await createWorkoutAssignment({
                ...tenantPayload,
                client: selectedClientId,
                plan: plan.id,
                start_date: startDate,
                end_date: endDate || null,
                status: "active",
                notes: assignmentNotes.trim(),
            });
            return plan;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["workout-plans"] }),
                queryClient.invalidateQueries({ queryKey: ["workout-assignments"] }),
            ]);
            router.push("/dashboard/workouts/planning");
        },
        onError: (error) => {
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

    const selectPlanExercise = (dayId: string, rowId: string, exerciseId: string) => {
        const selectedExercise = exerciseById.get(exerciseId);
        if (!selectedExercise) return;
        updatePlanExerciseRow(dayId, rowId, {
            ...createPlanExerciseRowFromExercise(selectedExercise),
            id: rowId,
        });
    };

    const selectPlanMuscleGroup = (dayId: string, rowId: string, muscleGroupId: string) => {
        updatePlanExerciseRow(dayId, rowId, {
            muscle_group: muscleGroupId,
            body_part: muscleGroupById.get(muscleGroupId)?.name || "",
            exercise: "",
            exercise_search: "",
            video_url: "",
        });
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
                if (day.id !== dayId || day.exercises.length === 1) return day;
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

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");
        createMutation.mutate();
    };

    const handleClientSearchChange = (value: string) => {
        setClientSearch(value);
        setIsClientSearchOpen(true);

        if (selectedClient && value !== selectedClientLabel) {
            setSelectedClientId("");
        }
    };

    const handleClientSelect = (client: ClientData) => {
        setSelectedClientId(client.id);
        setClientSearch(getClientLabel(client));
        setIsClientSearchOpen(false);
    };

    const isLoading = clientsQuery.isLoading || muscleGroupsQuery.isLoading || musclesQuery.isLoading || exercisesQuery.isLoading;
    const pageError = clientsQuery.error || muscleGroupsQuery.error || musclesQuery.error || exercisesQuery.error;

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
                    <p className="mt-1 text-sm text-zinc-500">Build a reusable template and assign it to a client.</p>
                </div>
            </div>

            {pageError && <ErrorText message={getErrorMessage(pageError)} />}

            {isLoading ? (
                <div className="flex min-h-80 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                    <Loader2Icon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <ErrorText message={formError} />

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
                                            placeholder="Search clients by name, email, or public ID"
                                            autoComplete="off"
                                        />
                                        {isSearchingClients && (
                                            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                                                {clientsQuery.isLoading ? (
                                                    <div className="px-3 py-2 text-sm text-zinc-500">Loading clients...</div>
                                                ) : filteredClients.length > 0 ? (
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
                                                                {client.user.email}{client.user.public_id ? ` - ${client.user.public_id}` : ""}
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
                        onSelectExercise={selectPlanExercise}
                        onSelectMuscleGroup={selectPlanMuscleGroup}
                        onMoveRow={movePlanExerciseRow}
                        onMoveDay={movePlanDay}
                        enableDayCardControls
                        onCreateExerciseRequest={openExerciseModalForPlanDay}
                    />

                    <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                        <Link
                            href="/dashboard/workouts/planning"
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {createMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                            Create Plan
                        </button>
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
        </div>
    );
}
