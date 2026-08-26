"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, CheckCircle2Icon, CircleDashedIcon, Edit3Icon, Loader2Icon, UtensilsIcon, XCircleIcon } from "lucide-react";

import {
    getMyCurrentDietPlan,
    saveMyMealLog,
    type CurrentDietPlanTracking,
    type MealAdherenceLog,
    type MealAdherenceStatus,
} from "@/services/diet-plan.service";

const statusOptions: Array<{ value: MealAdherenceStatus; label: string; icon: typeof CheckCircle2Icon; className: string }> = [
    { value: "completed", label: "Completed", icon: CheckCircle2Icon, className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { value: "modified", label: "Modified", icon: Edit3Icon, className: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" },
    { value: "skipped", label: "Skipped", icon: XCircleIcon, className: "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" },
];

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function mealSlotLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function logByMealId(logs: MealAdherenceLog[]): Map<string, MealAdherenceLog> {
    return new Map(logs.map((log) => [String(log.planned_meal), log]));
}

function errorMessage(error: unknown): string {
    const apiError = error as { response?: { data?: { detail?: string; error?: string } }; message?: string };
    return apiError.response?.data?.detail || apiError.response?.data?.error || apiError.message || "Could not save meal tracking.";
}

export default function MyDietPlanPage() {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(todayIso());
    const [modifiedNotes, setModifiedNotes] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState("");

    const query = useQuery<CurrentDietPlanTracking>({
        queryKey: ["my-current-diet-plan", selectedDate],
        queryFn: () => getMyCurrentDietPlan(selectedDate),
    });

    const logsByMeal = useMemo(() => logByMealId(query.data?.logs || []), [query.data?.logs]);

    const mutation = useMutation({
        mutationFn: ({ mealId, status, notes }: { mealId: string; status: MealAdherenceStatus; notes?: string }) => {
            if (!query.data?.client) {
                throw new Error("Client profile was not found.");
            }
            return saveMyMealLog(query.data.client, {
                planned_meal: mealId,
                log_date: selectedDate,
                status,
                notes: status === "modified" ? notes || "" : "",
            });
        },
        onSuccess: async () => {
            setFormError("");
            await queryClient.invalidateQueries({ queryKey: ["my-current-diet-plan", selectedDate] });
        },
        onError: (error) => setFormError(errorMessage(error)),
    });

    const adherence = query.data?.adherence;

    return (
        <div className="space-y-6 p-4 pb-16 md:p-8">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <UtensilsIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">My Diet Plan</h1>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Track today&apos;s meals from your assigned plan.</p>
                    </div>
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        className="bg-transparent outline-none"
                    />
                </label>
            </div>

            {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {formError}
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Strict adherence" value={`${adherence?.strict_adherence_percent ?? 0}%`} />
                <StatTile label="Flexible adherence" value={`${adherence?.flexible_adherence_percent ?? 0}%`} />
                <StatTile label="Completed" value={String(adherence?.completed_count ?? 0)} />
                <StatTile label="Modified" value={String(adherence?.modified_count ?? 0)} />
            </div>

            {query.isLoading ? (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading diet plan...
                </div>
            ) : !query.data?.assignment ? (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950">
                    <CircleDashedIcon className="mx-auto h-8 w-8 text-zinc-400" />
                    <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-white">No active diet plan</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your coach has not assigned a diet plan for this date.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{query.data.assignment.plan_title}</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Day {query.data.day_number} checklist</p>
                    </div>
                    {query.data.meals.map((meal) => {
                        const log = logsByMeal.get(String(meal.id));
                        const pending = mutation.isPending && mutation.variables?.mealId === String(meal.id);
                        const noteValue = modifiedNotes[String(meal.id)] ?? log?.notes ?? "";

                        return (
                            <section key={meal.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{mealSlotLabel(meal.meal_slot)}</h3>
                                        {meal.notes && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{meal.notes}</p>}
                                    </div>
                                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                        {log ? mealSlotLabel(log.status) : "Not tracked"}
                                    </span>
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                    {statusOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            disabled={pending}
                                            onClick={() => mutation.mutate({ mealId: String(meal.id), status: option.value, notes: noteValue })}
                                            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition disabled:opacity-60 ${option.className} ${log?.status === option.value ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-950" : ""}`}
                                        >
                                            {pending && mutation.variables?.status === option.value ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <option.icon className="h-4 w-4" />}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                {(log?.status === "modified" || modifiedNotes[String(meal.id)] !== undefined) && (
                                    <textarea
                                        value={noteValue}
                                        onChange={(event) => setModifiedNotes((current) => ({ ...current, [String(meal.id)]: event.target.value }))}
                                        onBlur={() => {
                                            if (log?.status === "modified") {
                                                mutation.mutate({ mealId: String(meal.id), status: "modified", notes: noteValue });
                                            }
                                        }}
                                        rows={2}
                                        placeholder="What changed?"
                                        className="mt-3 w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                    />
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-bold uppercase text-zinc-500">{label}</div>
            <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
        </div>
    );
}
