"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityIcon, CalendarDaysIcon, CalendarIcon, Loader2Icon, SearchIcon, UtensilsIcon } from "lucide-react";

import { getClients } from "@/services/client.service";
import { getClientCurrentDietPlan, getClientMealAdherence } from "@/services/diet-plan.service";
import type { ClientData } from "@/types/client.type";
import type { MealAdherenceLog, MealAdherenceStatus } from "@/types/diet-plan.type";

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function currentIsoWeek(): string {
    const date = new Date();
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function clientName(client?: ClientData): string {
    if (!client) return "Select client";
    const fullName = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
    return fullName || client.user.email || client.id;
}

function statusLabel(value?: MealAdherenceStatus): string {
    if (!value) return "Not tracked";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClasses(value?: MealAdherenceStatus): string {
    if (value === "completed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
    if (value === "modified") return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
    if (value === "skipped") return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
}

function logByMealId(logs: MealAdherenceLog[]): Map<string, MealAdherenceLog> {
    return new Map(logs.map((log) => [String(log.planned_meal), log]));
}

export default function DietPlanTrackingPage() {
    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedDate, setSelectedDate] = useState(todayIso());
    const [selectedWeek, setSelectedWeek] = useState(currentIsoWeek());
    const [search, setSearch] = useState("");

    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients });
    const clients = useMemo(() => clientsQuery.data || [], [clientsQuery.data]);
    const activeClientId = selectedClientId || clients[0]?.id || "";

    const filteredClients = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return clients;
        return clients.filter((client) => [
            clientName(client),
            client.user.email,
            client.user.public_id || "",
        ].join(" ").toLowerCase().includes(query));
    }, [clients, search]);

    const selectedClient = clients.find((client) => client.id === activeClientId);

    const currentPlanQuery = useQuery({
        queryKey: ["client-current-diet-plan", activeClientId, selectedDate],
        queryFn: () => getClientCurrentDietPlan(activeClientId, selectedDate),
        enabled: Boolean(activeClientId),
    });

    const weeklyQuery = useQuery({
        queryKey: ["client-meal-adherence", activeClientId, selectedWeek],
        queryFn: () => getClientMealAdherence(activeClientId, selectedWeek),
        enabled: Boolean(activeClientId),
    });

    const logsByMeal = useMemo(() => logByMealId(currentPlanQuery.data?.logs || []), [currentPlanQuery.data?.logs]);

    return (
        <div className="space-y-6 p-4 pb-16 md:p-8">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <ActivityIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Diet Tracking</h1>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Review daily meal completion and weekly adherence.</p>
                    </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                        <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent outline-none" />
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        <CalendarDaysIcon className="h-4 w-4 text-zinc-400" />
                        <input type="week" value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)} className="bg-transparent outline-none" />
                    </label>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search clients"
                            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                        />
                    </div>
                    <div className="max-h-[36rem] overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                        {clientsQuery.isLoading ? (
                            <div className="flex items-center gap-2 p-4 text-sm text-zinc-500">
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Loading clients...
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="p-4 text-sm text-zinc-500">No clients found.</div>
                        ) : filteredClients.map((client) => (
                            <button
                                key={client.id}
                                type="button"
                                onClick={() => setSelectedClientId(client.id)}
                                className={`block w-full border-b border-zinc-100 px-4 py-3 text-left transition last:border-b-0 dark:border-zinc-800 ${activeClientId === client.id ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"}`}
                            >
                                <div className="font-semibold text-zinc-900 dark:text-white">{clientName(client)}</div>
                                <div className="mt-0.5 text-xs text-zinc-500">{client.user.email}</div>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatTile label="Weekly strict" value={`${weeklyQuery.data?.summary.strict_adherence_percent ?? 0}%`} />
                        <StatTile label="Weekly flexible" value={`${weeklyQuery.data?.summary.flexible_adherence_percent ?? 0}%`} />
                        <StatTile label="Completed" value={String(weeklyQuery.data?.summary.completed_count ?? 0)} />
                        <StatTile label="Modified" value={String(weeklyQuery.data?.summary.modified_count ?? 0)} />
                    </div>

                    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                            <h2 className="font-bold text-zinc-900 dark:text-white">{clientName(selectedClient)}</h2>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                {currentPlanQuery.data?.assignment?.plan_title || "No active plan for selected date"}
                            </p>
                        </div>
                        {currentPlanQuery.isLoading ? (
                            <div className="flex items-center gap-2 p-6 text-sm text-zinc-500">
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Loading tracking...
                            </div>
                        ) : !currentPlanQuery.data?.assignment ? (
                            <div className="p-8 text-center">
                                <UtensilsIcon className="mx-auto h-8 w-8 text-zinc-400" />
                                <div className="mt-3 font-bold text-zinc-900 dark:text-white">No assigned diet plan</div>
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose another client or date.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {currentPlanQuery.data.meals.map((meal) => {
                                    const log = logsByMeal.get(String(meal.id));
                                    return (
                                        <div key={meal.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_8rem_12rem] md:items-center">
                                            <div>
                                                <div className="font-semibold text-zinc-900 dark:text-white">{meal.meal_slot.replace(/_/g, " ")}</div>
                                                {meal.notes && <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{meal.notes}</div>}
                                            </div>
                                            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(log?.status)}`}>
                                                {statusLabel(log?.status)}
                                            </span>
                                            <div className="text-sm text-zinc-500 dark:text-zinc-400">{log?.notes || "-"}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                            <h2 className="font-bold text-zinc-900 dark:text-white">Weekly Breakdown</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                                    <tr>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Tracked</th>
                                        <th className="px-5 py-3">Completed</th>
                                        <th className="px-5 py-3">Modified</th>
                                        <th className="px-5 py-3">Skipped</th>
                                        <th className="px-5 py-3">Strict</th>
                                        <th className="px-5 py-3">Flexible</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(weeklyQuery.data?.days || []).map((day) => (
                                        <tr key={day.date}>
                                            <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{day.date}</td>
                                            <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{day.tracked_count}/{day.planned_count}</td>
                                            <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{day.completed_count}</td>
                                            <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{day.modified_count}</td>
                                            <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{day.skipped_count}</td>
                                            <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{day.strict_adherence_percent}%</td>
                                            <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{day.flexible_adherence_percent}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
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
