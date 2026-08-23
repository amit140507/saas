import { notFound } from "next/navigation";
import { CalendarDaysIcon, SaladIcon } from "lucide-react";

import { getSharedDietAssignment } from "@/services/diet-plan.service";

interface SharedDietPlanPageProps {
    params: Promise<{ token: string }>;
}

function goalLabel(goal?: string | null): string {
    if (!goal) return "Goal not set";
    return goal.replace(/_/g, " ");
}

function adjustmentValue(value: unknown, fallback = "-"): string {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return fallback;
}

export default async function SharedDietPlanPage({ params }: SharedDietPlanPageProps) {
    const { token } = await params;
    const assignment = await getSharedDietAssignment(token);

    if (!assignment) {
        notFound();
    }

    const meals = [...(assignment.meals || [])].sort((a, b) => a.day_number - b.day_number);
    const adjustments = assignment.adjustments || {};

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8 md:py-10">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase text-orange-700">
                                <SaladIcon className="h-3.5 w-3.5" />
                                Diet Plan
                            </div>
                            <h1 className="text-2xl font-bold md:text-3xl">{assignment.plan_title}</h1>
                            <p className="mt-2 text-sm text-zinc-500">
                                {assignment.client_name || "Client"} - {assignment.start_date} to {assignment.end_date || "No end date"}
                            </p>
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                            {assignment.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoTile label="Calories" value={`${assignment.calories_target ?? "-"} kcal`} />
                        <InfoTile label="Protein" value={`${assignment.protein_target ?? "-"} g`} />
                        <InfoTile label="Carbs" value={`${assignment.carbs_target ?? "-"} g`} />
                        <InfoTile label="Fat" value={`${assignment.fat_target ?? "-"} g`} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <InfoTile label="Goal" value={goalLabel(assignment.goal)} />
                        <InfoTile label="Check-in" value={adjustmentValue(adjustments.checkInDate)} />
                        <InfoTile label="Cardio" value={`${adjustmentValue(adjustments.totalCardio, "0")} min`} />
                    </div>
                </header>

                {meals.length === 0 ? (
                    <section className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-12 text-center text-sm text-zinc-500">
                        No meals are available for this plan.
                    </section>
                ) : meals.map((meal, index) => {
                    const foods = meal.items || [];
                    const supplements = meal.supplements || [];

                    return (
                        <section key={meal.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                            <div className="border-b border-zinc-200 bg-zinc-100 px-5 py-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold">Meal {index + 1}: {meal.notes || meal.meal_slot.replace(/_/g, " ")}</h2>
                                        <p className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-500">
                                            <CalendarDaysIcon className="h-4 w-4" />
                                            Day {meal.day_number}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-500">{foods.length} foods</span>
                                </div>
                            </div>
                            <div className="grid gap-6 px-5 py-4 md:grid-cols-2">
                                <div>
                                    <h3 className="mb-3 text-xs font-bold uppercase text-zinc-500">Foods</h3>
                                    {foods.length === 0 ? (
                                        <p className="text-sm text-zinc-500">No foods for this meal.</p>
                                    ) : (
                                        <div className="divide-y divide-zinc-100">
                                            {foods.map((item) => (
                                                <div key={item.id} className="py-3">
                                                    <div className="font-bold">{item.food_item_name || item.food_item}</div>
                                                    <div className="mt-1 text-sm text-zinc-500">{item.quantity_g} g{item.notes ? ` - ${item.notes}` : ""}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="mb-3 text-xs font-bold uppercase text-zinc-500">Supplements</h3>
                                    {supplements.length === 0 ? (
                                        <p className="text-sm text-zinc-500">No supplements for this meal.</p>
                                    ) : (
                                        <div className="divide-y divide-zinc-100">
                                            {supplements.map((supplement) => (
                                                <div key={supplement.id} className="py-3">
                                                    <div className="font-bold">{supplement.name}</div>
                                                    <div className="mt-1 text-sm text-zinc-500">
                                                        {supplement.amount || "-"} {supplement.unit}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    );
                })}
            </div>
        </main>
    );
}

function InfoTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-bold uppercase text-zinc-500">{label}</div>
            <div className="mt-1 break-words text-sm font-semibold text-zinc-900">{value}</div>
        </div>
    );
}
