import { notFound } from "next/navigation";
import { DumbbellIcon, PlayCircleIcon } from "lucide-react";

import {
    getSharedWorkoutAssignment,
    type SharedWorkoutDayType,
    type SharedWorkoutExercise,
    type SharedWorkoutSetMethod,
} from "@/services/workout.service";

interface SharedWorkoutPlanPageProps {
    params: Promise<{ token: string }>;
}

function exerciseTypeLabel(type: 1 | 2 | 3): string {
    if (type === 1) return "Body Weight";
    if (type === 2) return "Pin Loaded";
    return "Free Weight";
}

function setMethodLabel(method?: SharedWorkoutSetMethod, supersetGroup?: string | null): string {
    if (method === "superset") {
        return supersetGroup ? `Superset ${supersetGroup}` : "Superset";
    }
    if (method === "drop_set") return "Drop Set";
    return "";
}

type WorkoutExerciseBlock =
    | { kind: "single"; exercise: SharedWorkoutExercise }
    | { kind: "superset"; group: string; exercises: SharedWorkoutExercise[] };

function groupWorkoutExercises(exercises: SharedWorkoutExercise[]): WorkoutExerciseBlock[] {
    return exercises.reduce<WorkoutExerciseBlock[]>((blocks, exercise) => {
        if (exercise.set_method !== "superset") {
            blocks.push({ kind: "single", exercise });
            return blocks;
        }

        const group = (exercise.superset_group || "").trim() || String(exercise.sequence);
        const previousBlock = blocks[blocks.length - 1];
        if (previousBlock?.kind === "superset" && previousBlock.group === group) {
            previousBlock.exercises.push(exercise);
        } else {
            blocks.push({ kind: "superset", group, exercises: [exercise] });
        }
        return blocks;
    }, []);
}

function dayTypeLabel(dayType?: SharedWorkoutDayType): string {
    if (dayType === "active_recovery") return "Active Recovery";
    if (dayType === "off") return "Off Day";
    return "Training";
}

function dayTypeClassName(dayType?: SharedWorkoutDayType): string {
    if (dayType === "active_recovery") return "bg-emerald-50 text-emerald-700";
    if (dayType === "off") return "bg-zinc-200 text-zinc-700";
    return "bg-orange-50 text-orange-700";
}

export default async function SharedWorkoutPlanPage({ params }: SharedWorkoutPlanPageProps) {
    const { token } = await params;
    const assignment = await getSharedWorkoutAssignment(token);

    if (!assignment) {
        notFound();
    }

    const days = [...(assignment.workout_days || [])].sort((a, b) => a.day_number - b.day_number);

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8 md:py-10">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase text-orange-700">
                                <DumbbellIcon className="h-3.5 w-3.5" />
                                Workout Plan
                            </div>
                            <h1 className="text-2xl font-bold md:text-3xl">{assignment.plan_title}</h1>
                            <p className="mt-2 text-sm text-zinc-500">
                                {assignment.client_name || "Client"} - {assignment.start_date} to {assignment.end_date || "No end date"}
                            </p>
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold capitalize text-emerald-700">
                            {assignment.status}
                        </span>
                    </div>
                    {assignment.notes && (
                        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                            {assignment.notes}
                        </p>
                    )}
                </header>

                {days.length === 0 ? (
                    <section className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-12 text-center text-sm text-zinc-500">
                        No workout days are available for this plan.
                    </section>
                ) : days.map((day) => {
                    const exercises = [...(day.exercises || [])].sort((a, b) => a.sequence - b.sequence);
                    const dayType = day.day_type || "training";

                    return (
                        <section key={day.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                            <div className="border-b border-zinc-200 bg-zinc-100 px-5 py-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-bold">Day {day.day_number}: {day.name}</h2>
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${dayTypeClassName(dayType)}`}>
                                                {dayTypeLabel(dayType)}
                                            </span>
                                        </div>
                                        {day.notes && <p className="mt-1 text-sm text-zinc-500">{day.notes}</p>}
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-500">
                                        {dayType === "training" ? `${exercises.length} exercises` : dayTypeLabel(dayType)}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                {dayType !== "training" ? (
                                    <div className="px-5 py-8 text-center text-sm font-semibold text-zinc-500">
                                        {dayType === "active_recovery"
                                            ? day.notes || "Active recovery day. Keep the intensity light."
                                            : day.notes || "Off day. Full rest."}
                                    </div>
                                ) : exercises.length === 0 ? (
                                    <div className="px-5 py-8 text-center text-sm text-zinc-500">No exercises for this day.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {groupWorkoutExercises(exercises).map((block) => {
                                            if (block.kind === "superset") {
                                                return (
                                                    <div key={`superset-${block.group}-${block.exercises[0]?.id}`} className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm">
                                                        <div className="border-l-4 border-orange-500 px-4 py-3">
                                                            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                                                                Superset {block.group}
                                                            </div>
                                                            <div className="divide-y divide-zinc-200">
                                                                {block.exercises.map((exercise, index) => {
                                                                    const videoUrl = exercise.video_url || exercise.exercise_video_urls?.[0] || "";
                                                                    const itemLabel = block.group.length <= 3 ? `${block.group}${index + 1}` : `#${exercise.sequence}`;

                                                                    return (
                                                                        <div key={exercise.id} className="py-3 first:pt-0 last:pb-0">
                                                                            <div className="flex flex-wrap items-baseline gap-2">
                                                                                <span className="text-sm font-black text-orange-600">{itemLabel}</span>
                                                                                <h3 className="font-bold">{exercise.exercise_name || "Exercise"}</h3>
                                                                                <span className="text-xs font-medium text-zinc-500">{exercise.body_part || "Body part not set"}</span>
                                                                            </div>
                                                                            <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-zinc-500">
                                                                                <span>{exercise.sets} sets</span>
                                                                                <span>x {exercise.reps} reps</span>
                                                                                <span>Rest {exercise.rest}s</span>
                                                                                <span>{exerciseTypeLabel(exercise.exercise_type)}</span>
                                                                                {exercise.weight !== null && <span>{exercise.weight} kg</span>}
                                                                            </div>
                                                                            {exercise.notes && <p className="mt-2 text-sm text-zinc-600">{exercise.notes}</p>}
                                                                            {videoUrl && (
                                                                                <a
                                                                                    href={videoUrl}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-orange-600 px-3 py-1.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
                                                                                >
                                                                                    <PlayCircleIcon className="h-4 w-4" />
                                                                                    Video
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const exercise = block.exercise;
                                            const videoUrl = exercise.video_url || exercise.exercise_video_urls?.[0] || "";
                                            const methodLabel = setMethodLabel(exercise.set_method, exercise.superset_group);

                                            return (
                                                <article key={exercise.id} className="grid gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-500">#{exercise.sequence}</span>
                                                            <h3 className="font-bold">{exercise.exercise_name || "Exercise"}</h3>
                                                            {methodLabel && (
                                                                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                                                                    {methodLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-zinc-500">
                                                            <span>{exercise.body_part || "Body part not set"}</span>
                                                            <span>{exerciseTypeLabel(exercise.exercise_type)}</span>
                                                            <span>{exercise.sets} sets</span>
                                                            <span>{exercise.reps} reps</span>
                                                            <span>{exercise.rest}s rest</span>
                                                            {exercise.weight !== null && <span>{exercise.weight} kg</span>}
                                                        </div>
                                                        {exercise.notes && <p className="mt-2 text-sm text-zinc-600">{exercise.notes}</p>}
                                                    </div>
                                                    {videoUrl && (
                                                        <a
                                                            href={videoUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-600 px-4 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
                                                        >
                                                            <PlayCircleIcon className="h-4 w-4" />
                                                            Video
                                                        </a>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
        </main>
    );
}
