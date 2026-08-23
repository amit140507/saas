"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CalculatorIcon,
    CopyIcon,
    EditIcon,
    EyeIcon,
    FileTextIcon,
    GripVerticalIcon,
    Loader2Icon,
    MailIcon,
    MessageCircleIcon,
    PlusIcon,
    SaveIcon,
    SearchIcon,
    SendIcon,
    Trash2Icon,
    TrashIcon,
    UsersIcon,
    UtensilsIcon,
    XIcon,
} from "lucide-react";

import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";
import { supplementsDb } from "@/lib/foodDb";
import { useCurrentUserPermissions } from "@/lib/permissions";
import { getClients } from "@/services/client.service";
import {
    createDietPlan,
    createDietPlanAssignment,
    deleteDietPlan,
    deleteDietPlanAssignment,
    getDietPlanAssignments,
    getDietPlans,
    getFoodItems,
    updateDietPlan,
    updateDietPlanAssignment,
} from "@/services/diet-plan.service";
import type { ClientData } from "@/types/client.type";
import type {
    DietGoal,
    DietPlan,
    DietPlanAssignment,
    DietPlanAssignmentPayload,
    DietPlanPayload,
    FoodItem,
} from "@/types/diet-plan.type";

type TabId = "plans" | "assignments" | "pdf";
type ModalMode = "add" | "edit";
type DeleteTarget = { type: "plan"; id: string; label: string } | { type: "assignment"; id: string; label: string };
type FoodPickerState = { mealId: string; rowId?: string; search: string };

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
    goal: DietGoal;
    calories_target: string;
    protein_target: string;
    carbs_target: string;
    fat_target: string;
    is_active: boolean;
}

interface AssignmentForm {
    client: string;
    plan: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    adjustments: string;
}

interface PdfMealFood {
    internalId: string;
    id: string;
    name: string;
    amount: string;
    unit: string;
}

interface PdfSupplement {
    internalId: string;
    id: string;
    name: string;
    amount: string;
    unit: string;
}

interface PdfMeal {
    id: string;
    time: string;
    foods: PdfMealFood[];
    supplements: PdfSupplement[];
}

const tabs: Array<{ id: TabId; label: string; icon: typeof UtensilsIcon }> = [
    { id: "pdf", label: "Diet Plan Builder", icon: FileTextIcon },
    { id: "plans", label: "Plans", icon: UtensilsIcon },
    { id: "assignments", label: "Assignments", icon: UsersIcon },
];

const emptyPlanForm: PlanForm = {
    title: "",
    goal: "",
    calories_target: "",
    protein_target: "",
    carbs_target: "",
    fat_target: "",
    is_active: true,
};

const emptyAssignmentForm: AssignmentForm = {
    client: "",
    plan: "",
    start_date: "",
    end_date: "",
    is_active: true,
    adjustments: "{}",
};

const emptyPlans: DietPlan[] = [];
const emptyAssignments: DietPlanAssignment[] = [];
const emptyClients: ClientData[] = [];
const emptyFoodItems: FoodItem[] = [];

function createFormId(): string {
    return `form-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function optionalNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function foodMacroNumber(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function goalLabel(goal?: DietGoal | null): string {
    if (!goal) return "Not set";
    return goal.replace(/_/g, " ");
}

function statusClasses(active: boolean): string {
    return active
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function planToForm(plan: DietPlan): PlanForm {
    return {
        title: plan.title,
        goal: plan.goal || "",
        calories_target: plan.calories_target == null ? "" : String(plan.calories_target),
        protein_target: plan.protein_target == null ? "" : String(plan.protein_target),
        carbs_target: plan.carbs_target == null ? "" : String(plan.carbs_target),
        fat_target: plan.fat_target == null ? "" : String(plan.fat_target),
        is_active: plan.is_active,
    };
}

function assignmentToForm(assignment: DietPlanAssignment): AssignmentForm {
    return {
        client: assignment.client,
        plan: assignment.plan,
        start_date: assignment.start_date,
        end_date: assignment.end_date || "",
        is_active: assignment.is_active,
        adjustments: JSON.stringify(assignment.adjustments || {}, null, 2),
    };
}

function buildInitialPdfMeal(): PdfMeal {
    return { id: createFormId(), time: "Breakfast", foods: [], supplements: [] };
}

const mealSlotOptions = [
    { value: "breakfast", label: "Breakfast" },
    { value: "morning_snack", label: "Morning Snack" },
    { value: "lunch", label: "Lunch" },
    { value: "evening_snack", label: "Evening Snack" },
    { value: "dinner", label: "Dinner" },
    { value: "pre_workout", label: "Pre Workout" },
    { value: "post_workout", label: "Post Workout" },
] as const;

function getMealSlotLabel(value: string): string {
    return mealSlotOptions.find((option) => option.value === value)?.label || value;
}

function normalizeMealSlot(value: string, index: number): string {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const matched = mealSlotOptions.find((option) => option.value === normalized || option.label.toLowerCase().replace(/\s+/g, "_") === normalized);
    return matched?.value || mealSlotOptions[index % mealSlotOptions.length].value;
}

function getShareBaseUrl(): string {
    const configuredUrl = process.env.NEXT_PUBLIC_USER_APP_URL?.trim().replace(/\/+$/, "");
    if (configuredUrl) return configuredUrl;
    if (typeof window !== "undefined") return window.location.origin;
    return "";
}

function normalizeWhatsAppPhone(phone?: string | null): string {
    return (phone || "").replace(/\D/g, "");
}

function planToBuilderMeals(plan: DietPlan): PdfMeal[] {
    if (!plan.meals?.length) {
        return [buildInitialPdfMeal()];
    }

    return [...plan.meals]
        .sort((a, b) => a.day_number - b.day_number)
        .map((meal) => ({
            id: createFormId(),
            time: meal.notes || getMealSlotLabel(meal.meal_slot),
            foods: (meal.items || []).map((item) => ({
                internalId: createFormId(),
                id: item.food_item,
                name: item.food_item_name || "",
                amount: String(item.quantity_g || ""),
                unit: "g",
            })),
            supplements: (meal.supplements || []).map((supplement) => ({
                internalId: createFormId(),
                id: supplement.supplement_id || "",
                name: supplement.name,
                amount: supplement.amount == null ? "" : String(supplement.amount),
                unit: supplement.unit || "scoop",
            })),
        }));
}

function buildMealTemplates(meals: PdfMeal[]) {
    return meals.map((meal, index) => ({
        day_number: index + 1,
        meal_slot: normalizeMealSlot(meal.time, index),
        notes: meal.time.trim(),
        items: meal.foods
            .filter((food) => food.id && food.amount)
            .map((food) => ({
                food_item: food.id,
                quantity_g: food.amount,
                notes: "",
            })),
        supplements: meal.supplements
            .filter((supplement) => supplement.name || supplement.id)
            .map((supplement) => ({
                supplement_id: supplement.id,
                name: supplement.name || supplementsDb.find((item) => item.id === supplement.id)?.name || supplement.id,
                amount: supplement.amount || null,
                unit: supplement.unit,
            })),
    }));
}

function DietPlanManagementContent() {
    const queryClient = useQueryClient();
    const { tenantId } = useCurrentUserPermissions();
    const hasHydrated = useSyncExternalStore(subscribeHydrationStore, getClientHydrationSnapshot, getServerHydrationSnapshot);
    const [activeTab, setActiveTab] = useState<TabId>("pdf");
    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");
    const [planModal, setPlanModal] = useState<{ mode: ModalMode; item: DietPlan | null } | null>(null);
    const [assignmentModal, setAssignmentModal] = useState<{ mode: ModalMode; item: DietPlanAssignment | null } | null>(null);
    const [planView, setPlanView] = useState<DietPlan | null>(null);
    const [assignmentView, setAssignmentView] = useState<DietPlanAssignment | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm);

    const plansQuery = useQuery({ queryKey: ["diet-plans"], queryFn: getDietPlans, enabled: hasHydrated });
    const assignmentsQuery = useQuery({ queryKey: ["diet-plan-assignments"], queryFn: getDietPlanAssignments, enabled: hasHydrated });
    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients, enabled: hasHydrated });

    const plans = plansQuery.data ?? emptyPlans;
    const assignments = assignmentsQuery.data ?? emptyAssignments;
    const clients = clientsQuery.data ?? emptyClients;
    const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
    const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
    const query = search.trim().toLowerCase();

    const filteredPlans = useMemo(() => {
        return plans.filter((plan) => {
            if (!query) return true;
            return [plan.title, goalLabel(plan.goal), String(plan.calories_target || "")].some((value) => value.toLowerCase().includes(query));
        });
    }, [plans, query]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter((assignment) => {
            if (!query) return true;
            return [
                assignment.client_name || clientName(clientById.get(assignment.client)),
                assignment.plan_title || planById.get(assignment.plan)?.title || "",
                assignment.is_active ? "active" : "inactive",
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [assignments, clientById, planById, query]);

    const invalidatePlans = async () => {
        await queryClient.invalidateQueries({ queryKey: ["diet-plans"] });
    };

    const invalidateAssignments = async () => {
        await queryClient.invalidateQueries({ queryKey: ["diet-plan-assignments"] });
    };

    const planMutation = useMutation({
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string; payload: DietPlanPayload }) => (
            mode === "add" ? createDietPlan(payload) : updateDietPlan(id || "", payload)
        ),
        onSuccess: async () => {
            await invalidatePlans();
            setPlanModal(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const assignmentMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: DietPlanAssignmentPayload }) => (
            updateDietPlanAssignment(id, payload)
        ),
        onSuccess: async () => {
            await invalidateAssignments();
            setAssignmentModal(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const deleteMutation = useMutation({
        mutationFn: async (target: DeleteTarget) => {
            if (target.type === "plan") {
                await deleteDietPlan(target.id);
                return;
            }

            await deleteDietPlanAssignment(target.id);
        },
        onSuccess: async (_, target) => {
            if (target.type === "plan") {
                await invalidatePlans();
            } else {
                await invalidateAssignments();
            }
            setDeleteTarget(null);
        },
        onError: (error) => setFormError(getErrorMessage(error)),
    });

    const openPlanModal = (mode: ModalMode, item: DietPlan | null) => {
        setFormError("");
        setPlanForm(item ? planToForm(item) : emptyPlanForm);
        setPlanModal({ mode, item });
    };

    const openAssignmentModal = (item: DietPlanAssignment) => {
        setFormError("");
        setAssignmentForm(assignmentToForm(item));
        setAssignmentModal({ mode: "edit", item });
    };

    const submitPlan = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!planForm.title.trim()) {
            setFormError("Plan title is required.");
            return;
        }

        const payload: DietPlanPayload = {
            tenant: tenantId,
            title: planForm.title.trim(),
            goal: planForm.goal || null,
            calories_target: optionalNumber(planForm.calories_target),
            protein_target: optionalNumber(planForm.protein_target),
            carbs_target: optionalNumber(planForm.carbs_target),
            fat_target: optionalNumber(planForm.fat_target),
            is_active: planForm.is_active,
        };

        planMutation.mutate({ mode: planModal?.mode || "add", id: planModal?.item?.id, payload });
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

        let adjustments: Record<string, unknown>;
        try {
            adjustments = JSON.parse(assignmentForm.adjustments || "{}") as Record<string, unknown>;
        } catch {
            setFormError("Adjustments must be valid JSON.");
            return;
        }

        const payload: DietPlanAssignmentPayload = {
            tenant: tenantId,
            client: assignmentForm.client,
            plan: assignmentForm.plan,
            start_date: assignmentForm.start_date,
            end_date: assignmentForm.end_date || null,
            is_active: assignmentForm.is_active,
            adjustments,
        };

        assignmentMutation.mutate({ id: assignmentModal.item.id, payload });
    };

    return (
        <div className="space-y-6 p-4 pb-16 md:p-8">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Diet Plans</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Create plan records, assign them to clients, and build PDF diet plans.</p>
                </div>
                <div className="relative w-full lg:w-80">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search plans or assignments"
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            activeTab === tab.id
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "plans" && (
                <PlansTab
                    plans={filteredPlans}
                    loading={plansQuery.isLoading}
                    onAdd={() => openPlanModal("add", null)}
                    onView={(plan) => setPlanView(plan)}
                    onEdit={(plan) => openPlanModal("edit", plan)}
                    onDelete={(plan) => setDeleteTarget({ type: "plan", id: plan.id, label: plan.title })}
                />
            )}

            {activeTab === "assignments" && (
                <AssignmentsTab
                    assignments={filteredAssignments}
                    clients={clientById}
                    plans={planById}
                    loading={assignmentsQuery.isLoading || clientsQuery.isLoading || plansQuery.isLoading}
                    onView={(assignment) => setAssignmentView(assignment)}
                    onEdit={openAssignmentModal}
                    onDelete={(assignment) => setDeleteTarget({ type: "assignment", id: assignment.id, label: assignment.plan_title || planById.get(assignment.plan)?.title || assignment.id })}
                />
            )}

            {activeTab === "pdf" && <PdfBuilder />}

            {planModal && (
                <ModalFrame title={planModal.mode === "add" ? "Create Diet Plan" : "Edit Diet Plan"} onClose={() => setPlanModal(null)}>
                    <form onSubmit={submitPlan} className="space-y-5 p-6">
                        <ErrorText message={formError} />
                        <TextField label="Title" value={planForm.title} onChange={(value) => setPlanForm({ ...planForm, title: value })} required />
                        <SelectField label="Goal" value={planForm.goal} onChange={(value) => setPlanForm({ ...planForm, goal: value as DietGoal })}>
                            <option value="">Not set</option>
                            <option value="fat_loss">Fat Loss</option>
                            <option value="muscle_gain">Muscle Gain</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="other">Other</option>
                        </SelectField>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Calories Target" type="number" min="0" value={planForm.calories_target} onChange={(value) => setPlanForm({ ...planForm, calories_target: value })} />
                            <TextField label="Protein Target" type="number" min="0" value={planForm.protein_target} onChange={(value) => setPlanForm({ ...planForm, protein_target: value })} />
                            <TextField label="Carbs Target" type="number" min="0" value={planForm.carbs_target} onChange={(value) => setPlanForm({ ...planForm, carbs_target: value })} />
                            <TextField label="Fat Target" type="number" min="0" value={planForm.fat_target} onChange={(value) => setPlanForm({ ...planForm, fat_target: value })} />
                        </div>
                        <CheckboxField label="Active plan" checked={planForm.is_active} onChange={(checked) => setPlanForm({ ...planForm, is_active: checked })} />
                        <ModalActions loading={planMutation.isPending} submitLabel={planModal.mode === "add" ? "Create Plan" : "Save Plan"} onCancel={() => setPlanModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {assignmentModal && (
                <ModalFrame title="Edit Diet Assignment" onClose={() => setAssignmentModal(null)}>
                    <form onSubmit={submitAssignment} className="space-y-5 p-6">
                        <ErrorText message={formError} />
                        <SelectField label="Client" value={assignmentForm.client} onChange={(value) => setAssignmentForm({ ...assignmentForm, client: value })} required>
                            <option value="">Select client</option>
                            {clients.map((client) => <option key={client.id} value={client.id}>{clientName(client)}</option>)}
                        </SelectField>
                        <SelectField label="Plan" value={assignmentForm.plan} onChange={(value) => setAssignmentForm({ ...assignmentForm, plan: value })} required>
                            <option value="">Select plan</option>
                            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
                        </SelectField>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Start Date" type="date" value={assignmentForm.start_date} onChange={(value) => setAssignmentForm({ ...assignmentForm, start_date: value })} required />
                            <TextField label="End Date" type="date" value={assignmentForm.end_date} onChange={(value) => setAssignmentForm({ ...assignmentForm, end_date: value })} />
                        </div>
                        <TextArea label="Adjustments JSON" value={assignmentForm.adjustments} onChange={(value) => setAssignmentForm({ ...assignmentForm, adjustments: value })} />
                        <CheckboxField label="Active assignment" checked={assignmentForm.is_active} onChange={(checked) => setAssignmentForm({ ...assignmentForm, is_active: checked })} />
                        <ModalActions loading={assignmentMutation.isPending} submitLabel="Save Assignment" onCancel={() => setAssignmentModal(null)} />
                    </form>
                </ModalFrame>
            )}

            {planView && (
                <DietPlanViewModal
                    title="View Diet Plan"
                    heading={planView.title}
                    statusLabel={planView.is_active ? "Active" : "Inactive"}
                    meta={[
                        { label: "Goal", value: goalLabel(planView.goal) },
                        { label: "Calories", value: `${planView.calories_target ?? "-"} kcal` },
                        { label: "Protein", value: `${planView.protein_target ?? "-"} g` },
                        { label: "Carbs", value: `${planView.carbs_target ?? "-"} g` },
                        { label: "Fat", value: `${planView.fat_target ?? "-"} g` },
                        { label: "Meals", value: String(planView.meals?.length || 0) },
                    ]}
                    meals={planView.meals || []}
                    onClose={() => setPlanView(null)}
                />
            )}

            {assignmentView && (
                <DietAssignmentViewModal
                    assignment={assignmentView}
                    clientLabel={assignmentView.client_name || clientName(clientById.get(assignmentView.client))}
                    planLabel={assignmentView.plan_title || planById.get(assignmentView.plan)?.title || assignmentView.plan}
                    onClose={() => setAssignmentView(null)}
                />
            )}

            {deleteTarget && (
                <ModalFrame title="Confirm Delete" onClose={() => setDeleteTarget(null)} maxWidth="max-w-md">
                    <div className="space-y-5 p-6">
                        <ErrorText message={formError} />
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            Delete <span className="font-semibold text-zinc-900 dark:text-white">{deleteTarget.label}</span>? This calls the existing meal API delete endpoint.
                        </p>
                        <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate(deleteTarget)}
                                disabled={deleteMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleteMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </ModalFrame>
            )}
        </div>
    );
}

function PlansTab({
    plans,
    loading,
    onAdd,
    onView,
    onEdit,
    onDelete,
}: {
    plans: DietPlan[];
    loading: boolean;
    onAdd: () => void;
    onView: (plan: DietPlan) => void;
    onEdit: (plan: DietPlan) => void;
    onDelete: (plan: DietPlan) => void;
}) {
    return (
        <Panel title="Diet Plan Records" actionLabel="New Plan" onAction={onAdd}>
            <DataTable emptyText={loading ? "Loading diet plans..." : "No diet plans found."} columns={["Status", "Plan", "Goal", "Targets", "Meals", "Actions"]}>
                {plans.map((plan) => (
                    <tr key={plan.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="px-6 py-4"><Badge className={statusClasses(plan.is_active)}>{plan.is_active ? "Active" : "Inactive"}</Badge></td>
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{plan.title}</td>
                        <td className="px-6 py-4 capitalize">{goalLabel(plan.goal)}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500">
                            {plan.calories_target ?? "-"} kcal / P {plan.protein_target ?? "-"} / C {plan.carbs_target ?? "-"} / F {plan.fat_target ?? "-"}
                        </td>
                        <td className="px-6 py-4">{plan.meals?.length || 0}</td>
                        <td className="px-6 py-4"><RowActions onView={() => onView(plan)} onEdit={() => onEdit(plan)} onDelete={() => onDelete(plan)} /></td>
                    </tr>
                ))}
            </DataTable>
        </Panel>
    );
}

function AssignmentsTab({
    assignments,
    clients,
    plans,
    loading,
    onView,
    onEdit,
    onDelete,
}: {
    assignments: DietPlanAssignment[];
    clients: Map<string, ClientData>;
    plans: Map<string, DietPlan>;
    loading: boolean;
    onView: (assignment: DietPlanAssignment) => void;
    onEdit: (assignment: DietPlanAssignment) => void;
    onDelete: (assignment: DietPlanAssignment) => void;
}) {
    return (
        <Panel title="Diet Plan Assignments">
            <DataTable emptyText={loading ? "Loading assignments..." : "No diet assignments found."} columns={["Status", "Client", "Plan", "Dates", "Adjustments", "Actions"]}>
                {assignments.map((assignment) => (
                    <tr key={assignment.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="px-6 py-4"><Badge className={statusClasses(assignment.is_active)}>{assignment.is_active ? "Active" : "Inactive"}</Badge></td>
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{assignment.client_name || clientName(clients.get(assignment.client))}</td>
                        <td className="px-6 py-4">{assignment.plan_title || plans.get(assignment.plan)?.title || assignment.plan}</td>
                        <td className="px-6 py-4">{assignment.start_date} - {assignment.end_date || "No end date"}</td>
                        <td className="px-6 py-4"><div className="max-w-56 truncate text-xs text-zinc-500">{JSON.stringify(assignment.adjustments || {})}</div></td>
                        <td className="px-6 py-4"><RowActions onView={() => onView(assignment)} onEdit={() => onEdit(assignment)} onDelete={() => onDelete(assignment)} /></td>
                    </tr>
                ))}
            </DataTable>
        </Panel>
    );
}

function PdfBuilder() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const { tenantId } = useCurrentUserPermissions();
    const plansQuery = useQuery({ queryKey: ["diet-plans"], queryFn: getDietPlans });
    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients });
    const foodItemsQuery = useQuery({ queryKey: ["food-items"], queryFn: getFoodItems });

    const [details, setDetails] = useState({
        title: "",
        startDate: "",
        endDate: "",
        checkInDate: "",
        totalCardio: "",
    });
    const [macroTargets, setMacroTargets] = useState({
        calories: searchParams.get("calories") || "2020",
        protein: searchParams.get("protein") || "176",
        fat: searchParams.get("fat") || "80",
        carbs: searchParams.get("carbs") || "149",
        gain: searchParams.get("gain") || "0",
    });
    const [selectedClientId, setSelectedClientId] = useState("");
    const [clientSearch, setClientSearch] = useState("");
    const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
    const [meals, setMeals] = useState<PdfMeal[]>([buildInitialPdfMeal()]);
    const [foodPicker, setFoodPicker] = useState<FoodPickerState | null>(null);
    const [draggedMealId, setDraggedMealId] = useState<string | null>(null);
    const [navbarHeight, setNavbarHeight] = useState(64);
    const [builderError, setBuilderError] = useState("");
    const [builderMessage, setBuilderMessage] = useState("");
    const [savedAssignment, setSavedAssignment] = useState<DietPlanAssignment | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [sendModalOpen, setSendModalOpen] = useState(false);

    const plans = plansQuery.data ?? emptyPlans;
    const clients = clientsQuery.data ?? emptyClients;
    const foodItems = foodItemsQuery.data ?? emptyFoodItems;
    const foodItemById = useMemo(() => new Map(foodItems.map((foodItem) => [foodItem.id, foodItem])), [foodItems]);
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    const selectedClientLabel = selectedClient ? getClientLabel(selectedClient) : "";
    const isSearchingClients = isClientSearchOpen && clientSearch.trim().length > 0 && clientSearch !== selectedClientLabel;
    const targetCals = Number(macroTargets.calories) || 0;
    const targetPro = Number(macroTargets.protein) || 0;
    const targetFat = Number(macroTargets.fat) || 0;
    const targetCarb = Number(macroTargets.carbs) || 0;
    const targetGain = Number(macroTargets.gain) || 0;
    const shareUrl = savedAssignment?.share_token ? `${getShareBaseUrl()}/diet-plan/${savedAssignment.share_token}` : "";
    const whatsappPhone = normalizeWhatsAppPhone(selectedClient?.phone);
    const shareMessage = shareUrl ? `Your diet plan is ready: ${shareUrl}` : "";
    const whatsappHref = whatsappPhone && shareMessage ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(shareMessage)}` : "";
    const emailHref = selectedClient?.user.email && shareMessage
        ? `mailto:${selectedClient.user.email}?subject=${encodeURIComponent("Your diet plan")}&body=${encodeURIComponent(shareMessage)}`
        : "";

    const invalidateDietPlanData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["diet-plans"] }),
            queryClient.invalidateQueries({ queryKey: ["diet-plan-assignments"] }),
        ]);
    };

    const buildDietPlanPayload = (): DietPlanPayload => {
        if (!details.title.trim()) {
            throw new Error("Plan title is required.");
        }

        return {
            tenant: tenantId,
            title: details.title.trim(),
            goal: selectedClient?.goal === "fat_loss" || selectedClient?.goal === "muscle_gain" || selectedClient?.goal === "maintenance"
                ? selectedClient.goal
                : null,
            calories_target: targetCals || null,
            protein_target: targetPro || null,
            carbs_target: targetCarb || null,
            fat_target: targetFat || null,
            is_active: true,
            meal_templates: buildMealTemplates(meals),
        };
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedClientId) {
                throw new Error("Client is required.");
            }
            if (!details.startDate) {
                throw new Error("Period start is required.");
            }

            const plan = await createDietPlan(buildDietPlanPayload());
            return createDietPlanAssignment({
                tenant: tenantId,
                client: selectedClientId,
                plan: plan.id,
                start_date: details.startDate,
                end_date: details.endDate || null,
                is_active: true,
                adjustments: {
                    checkInDate: details.checkInDate,
                    totalCardio: details.totalCardio,
                    weightGain: targetGain,
                },
            });
        },
        onSuccess: async (assignment) => {
            setSavedAssignment(assignment);
            setBuilderMessage("Diet plan saved and assigned to the selected client.");
            await invalidateDietPlanData();
        },
        onError: (error) => {
            setBuilderMessage("");
            setBuilderError(getErrorMessage(error));
        },
    });

    const templateMutation = useMutation({
        mutationFn: async () => createDietPlan(buildDietPlanPayload()),
        onSuccess: async () => {
            setBuilderMessage("Diet template saved. You can reuse it from Use Template.");
            await queryClient.invalidateQueries({ queryKey: ["diet-plans"] });
        },
        onError: (error) => {
            setBuilderMessage("");
            setBuilderError(getErrorMessage(error));
        },
    });

    useEffect(() => {
        const navbar = document.querySelector<HTMLElement>("[data-dashboard-navbar]");
        if (!navbar) return;

        const updateNavbarHeight = () => {
            setNavbarHeight(navbar.getBoundingClientRect().height);
        };

        updateNavbarHeight();
        const resizeObserver = new ResizeObserver(updateNavbarHeight);
        resizeObserver.observe(navbar);
        window.addEventListener("resize", updateNavbarHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateNavbarHeight);
        };
    }, []);

    const filteredClients = useMemo(() => {
        const query = clientSearch.trim().toLowerCase();
        if (!query) {
            return emptyClients;
        }

        return clients.filter((client) => getClientSearchText(client).includes(query));
    }, [clientSearch, clients]);

    const handleClientSearchChange = (value: string) => {
        setClientSearch(value);
        setSelectedClientId("");
        setIsClientSearchOpen(true);
        setSavedAssignment(null);
    };

    const handleClientSelect = (client: ClientData) => {
        setSelectedClientId(client.id);
        setClientSearch(getClientLabel(client));
        setIsClientSearchOpen(false);
        setSavedAssignment(null);
    };

    const updateMacroTarget = (field: keyof typeof macroTargets, value: string) => {
        setMacroTargets((current) => ({ ...current, [field]: value }));
    };

    const consumed = useMemo(() => {
        let pro = 0;
        let fat = 0;
        let carb = 0;
        let cal = 0;

        meals.forEach((meal) => {
            meal.foods.forEach((food) => {
                const item = foodItemById.get(food.id);
                const amount = Number(food.amount);
                if (item && Number.isFinite(amount) && amount > 0) {
                    const multiplier = amount / 100;
                    pro += foodMacroNumber(item.protein_g) * multiplier;
                    fat += foodMacroNumber(item.fat_g) * multiplier;
                    carb += foodMacroNumber(item.carbs_g) * multiplier;
                    cal += foodMacroNumber(item.calories_per_100g) * multiplier;
                }
            });
        });

        return { cal, pro, fat, carb };
    }, [foodItemById, meals]);

    const macroSummaries = [
        { name: "Calories", field: "calories" as const, consumedValue: consumed.cal, targetValue: targetCals, tolerance: 50, unit: "kcal" },
        { name: "Protein", field: "protein" as const, consumedValue: consumed.pro, targetValue: targetPro, tolerance: 5, unit: "g" },
        { name: "Fat", field: "fat" as const, consumedValue: consumed.fat, targetValue: targetFat, tolerance: 5, unit: "g" },
        { name: "Carbs", field: "carbs" as const, consumedValue: consumed.carb, targetValue: targetCarb, tolerance: 10, unit: "g" },
    ];

    const updateMeal = (mealId: string, updater: (meal: PdfMeal) => PdfMeal) => {
        setMeals((items) => items.map((meal) => (meal.id === mealId ? updater(meal) : meal)));
    };

    const openAddFoodPicker = (mealId: string) => {
        setFoodPicker({ mealId, search: "" });
    };

    const openReplaceFoodPicker = (mealId: string, rowId: string) => {
        setFoodPicker({ mealId, rowId, search: "" });
    };

    const closeFoodPicker = () => {
        setFoodPicker(null);
    };

    const selectFoodItem = (foodItem: FoodItem) => {
        if (!foodPicker) return;

        updateMeal(foodPicker.mealId, (meal) => {
            const selectedFood = {
                id: foodItem.id,
                name: foodItem.name,
                unit: "g",
            };

            if (foodPicker.rowId) {
                return {
                    ...meal,
                    foods: meal.foods.map((food) => (
                        food.internalId === foodPicker.rowId
                            ? { ...food, ...selectedFood }
                            : food
                    )),
                };
            }

            return {
                ...meal,
                foods: [...meal.foods, { internalId: createFormId(), amount: "", ...selectedFood }],
            };
        });
        closeFoodPicker();
    };

    const moveMeal = (draggedId: string, targetId: string) => {
        if (draggedId === targetId) return;

        setMeals((items) => {
            const fromIndex = items.findIndex((meal) => meal.id === draggedId);
            const toIndex = items.findIndex((meal) => meal.id === targetId);
            if (fromIndex === -1 || toIndex === -1) return items;

            const nextMeals = [...items];
            const [movedMeal] = nextMeals.splice(fromIndex, 1);
            nextMeals.splice(toIndex, 0, movedMeal);
            return nextMeals;
        });
    };

    const addSupplement = (mealId: string) => {
        updateMeal(mealId, (meal) => ({
            ...meal,
            supplements: [...meal.supplements, { internalId: createFormId(), id: "", name: "", amount: "", unit: "scoop" }],
        }));
    };

    const handlePreview = () => {
        setBuilderError("");
        setBuilderMessage("");
        try {
            buildDietPlanPayload();
            setPreviewOpen(true);
        } catch (error) {
            setBuilderError(getErrorMessage(error));
        }
    };

    const handleSave = () => {
        setBuilderError("");
        setBuilderMessage("");
        saveMutation.mutate();
    };

    const handleSaveTemplate = () => {
        setBuilderError("");
        setBuilderMessage("");
        templateMutation.mutate();
    };

    const handleTemplateSelect = (plan: DietPlan) => {
        setDetails((current) => ({
            ...current,
            title: plan.title,
        }));
        setMacroTargets((current) => ({
            ...current,
            calories: plan.calories_target == null ? "" : String(plan.calories_target),
            protein: plan.protein_target == null ? "" : String(plan.protein_target),
            fat: plan.fat_target == null ? "" : String(plan.fat_target),
            carbs: plan.carbs_target == null ? "" : String(plan.carbs_target),
        }));
        setMeals(planToBuilderMeals(plan));
        setBuilderError("");
        setBuilderMessage(`Loaded template: ${plan.title}`);
        setTemplatePickerOpen(false);
        setSavedAssignment(null);
    };

    const handleCopyShareLink = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setBuilderMessage("Share link copied.");
        } catch {
            setBuilderError("Could not copy the share link.");
        }
    };

    return (
        <div className="space-y-6">
            <ErrorText message={builderError} />
            {builderMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {builderMessage}
                </div>
            )}
            <div
                className="sticky z-30 grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-4"
                style={{ top: navbarHeight }}
            >
                {macroSummaries.map((macro) => {
                    const status = getMacroStatus(macro.consumedValue, macro.targetValue, macro.tolerance, macro.unit);
                    const progressValue = macro.targetValue > 0 ? Math.min(Math.round((macro.consumedValue / macro.targetValue) * 100), 100) : 0;
                    return (
                        <div key={macro.name} className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className={`h-1 ${status.barClass}`} />
                            <div className="p-3">
                                <div className="mb-1 text-xs font-semibold uppercase text-zinc-500">{macro.name}</div>
                                <div className="flex items-baseline justify-center items-center gap-1 text-xl font-bold text-yellow-600 dark:text-yellow-400">
                                    <span>{Math.round(macro.consumedValue)} /</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={macroTargets[macro.field]}
                                        onChange={(event) => updateMacroTarget(macro.field, event.target.value)}
                                        aria-label={`${macro.name} target`}
                                        className="no-spinner w-20 border-0 bg-transparent p-0 text-center text-xl font-bold text-yellow-600 outline-none transition focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-400 dark:text-yellow-400 dark:focus:bg-yellow-500/10"
                                    />
                                    <span className="ml-1 text-xs font-normal text-zinc-400">{macro.unit}</span>
                                </div>
                                <div className={`mt-2 inline-flex min-w-28 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${status.badgeClass}`}>
                                    {status.label}: {status.value}
                                </div>
                                <div
                                    role="progressbar"
                                    aria-label={`${macro.name} target progress`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={progressValue}
                                    className="mt-3"
                                >
                                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400">
                                        <span>Progress</span>
                                        <span className={status.colorClass}>{progressValue}%</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 shadow-inner dark:bg-zinc-800">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${status.progressClass} shadow-sm transition-all duration-300`}
                                            style={{ width: `${progressValue}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex items-center gap-2">
                    <CalculatorIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                    <h2 className="font-bold text-zinc-900 dark:text-white">Diet Plan Builder Details</h2>
                    <button
                        type="button"
                        onClick={() => setTemplatePickerOpen(true)}
                        className="ml-auto inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <SearchIcon className="h-4 w-4" />
                        Use Template
                    </button>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
                        Gain/Loss %
                        <input
                            type="number"
                            min="0"
                            value={macroTargets.gain}
                            onChange={(event) => updateMacroTarget("gain", event.target.value)}
                            className="w-20 border-0 bg-transparent p-0 text-right text-xl font-bold text-yellow-600 outline-none transition focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-400 dark:text-yellow-400 dark:focus:bg-yellow-500/10"
                        />
                    </label>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <TextField label="Plan Title" value={details.title} onChange={(value) => setDetails({ ...details, title: value })} required />
                    <TextField label="Period Start" type="date" value={details.startDate} onChange={(value) => setDetails({ ...details, startDate: value })} />
                    <TextField label="Period End" type="date" value={details.endDate} onChange={(value) => setDetails({ ...details, endDate: value })} />
                    <TextField label="Check-in Date" type="date" value={details.checkInDate} onChange={(value) => setDetails({ ...details, checkInDate: value })} />
                    <TextField label="Total Cardio (min)" type="number" value={details.totalCardio} onChange={(value) => setDetails({ ...details, totalCardio: value })} />
                    <div className="lg:col-span-2">
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
                                                        {client.user.email}{client.user.public_id ? ` - ${client.user.public_id}` : ""}{client.phone ? ` - ${client.phone}` : ""}
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
                </div>
            </section>

            <div className="space-y-5">
                {meals.map((meal) => (
                    <section
                        key={meal.id}
                        onDragOver={(event) => {
                            if (!draggedMealId) return;
                            event.preventDefault();
                        }}
                        onDrop={(event) => {
                            if (!draggedMealId) return;
                            event.preventDefault();
                            moveMeal(draggedMealId, meal.id);
                            setDraggedMealId(null);
                        }}
                        className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${draggedMealId === meal.id ? "opacity-50" : ""}`}
                    >
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
                            <button
                                type="button"
                                draggable={meals.length > 1}
                                disabled={meals.length === 1}
                                onDragStart={(event) => {
                                    if (meals.length === 1) return;
                                    event.dataTransfer.effectAllowed = "move";
                                    setDraggedMealId(meal.id);
                                }}
                                onDragEnd={() => setDraggedMealId(null)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                                title="Drag meal to reorder"
                                aria-label="Drag meal to reorder"
                            >
                                <GripVerticalIcon className="h-4 w-4" />
                            </button>
                            <input
                                type="text"
                                value={meal.time}
                                onChange={(event) => updateMeal(meal.id, (item) => ({ ...item, time: event.target.value }))}
                                className="min-w-0 flex-1 bg-transparent text-lg font-bold text-zinc-900 outline-none dark:text-white"
                                placeholder="Meal Time"
                            />
                            <button type="button" onClick={() => setMeals((items) => items.filter((item) => item.id !== meal.id))} className="rounded-md p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10" title="Remove meal">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-5 grid gap-6">
                            <FoodRows
                                title="Foods"
                                emptyText="No foods added."
                                buttonLabel="Add Food"
                                accentClass="text-indigo-600 dark:text-indigo-300"
                                rows={meal.foods}
                                foodItemById={foodItemById}
                                onAdd={() => openAddFoodPicker(meal.id)}
                                onOpenPicker={(rowId) => openReplaceFoodPicker(meal.id, rowId)}
                                onUpdateAmount={(rowId, value) => {
                                    updateMeal(meal.id, (item) => ({
                                        ...item,
                                        foods: item.foods.map((food) => (food.internalId === rowId ? { ...food, amount: value } : food)),
                                    }));
                                }}
                                onRemove={(rowId) => updateMeal(meal.id, (item) => ({ ...item, foods: item.foods.filter((food) => food.internalId !== rowId) }))}
                            />
                            <MealRows
                                title="Supplements"
                                emptyText="No supplements added."
                                buttonLabel="Add Supplement"
                                accentClass="text-amber-600 dark:text-amber-300"
                                rows={meal.supplements}
                                options={supplementsDb}
                                onAdd={() => addSupplement(meal.id)}
                                onUpdate={(rowId, field, value) => {
                                    updateMeal(meal.id, (item) => ({
                                        ...item,
                                        supplements: item.supplements.map((supplement) => {
                                            if (supplement.internalId !== rowId) return supplement;
                                            const next = { ...supplement, [field]: value };
                                            if (field === "id") {
                                                const dbItem = supplementsDb.find((db) => db.id === value);
                                                if (dbItem) {
                                                    next.name = dbItem.name;
                                                    next.unit = dbItem.defaultUnit;
                                                }
                                            }
                                            return next;
                                        }),
                                    }));
                                }}
                                onRemove={(rowId) => updateMeal(meal.id, (item) => ({ ...item, supplements: item.supplements.filter((supplement) => supplement.internalId !== rowId) }))}
                            />
                        </div>
                    </section>
                ))}
            </div>

            <button
                type="button"
                onClick={() => setMeals((items) => [...items, { id: createFormId(), time: `Meal ${items.length + 1}`, foods: [], supplements: [] }])}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-3 font-semibold text-zinc-500 transition hover:border-indigo-500 hover:text-indigo-500 dark:border-zinc-700 dark:text-zinc-400"
            >
                <PlusIcon className="h-5 w-5" />
                Add Another Meal
            </button>

            <div className="flex flex-col justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800 sm:flex-row">
                <button
                    type="button"
                    onClick={handlePreview}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-6 py-2.5 font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                    <EyeIcon className="h-4 w-4" />
                    Preview
                </button>
                <button
                    type="button"
                    disabled={saveMutation.isPending || templateMutation.isPending}
                    onClick={handleSaveTemplate}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-300 px-6 py-2.5 font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                >
                    {templateMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                    Save as Template
                </button>
                <button
                    type="button"
                    disabled={saveMutation.isPending || templateMutation.isPending}
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                    {saveMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                    Save
                </button>
                <button
                    type="button"
                    disabled={!savedAssignment || !shareUrl}
                    onClick={() => setSendModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
                >
                    <SendIcon className="h-4 w-4" />
                    Send
                </button>
            </div>

            {foodPicker && (
                <FoodPickerModal
                    foodItems={foodItems}
                    isLoading={foodItemsQuery.isLoading}
                    isError={foodItemsQuery.isError}
                    search={foodPicker.search}
                    onSearchChange={(searchValue) => setFoodPicker((current) => (current ? { ...current, search: searchValue } : current))}
                    onSelect={selectFoodItem}
                    onClose={closeFoodPicker}
                />
            )}

            {templatePickerOpen && (
                <DietTemplatePickerModal
                    plans={plans}
                    isLoading={plansQuery.isLoading}
                    onSelect={handleTemplateSelect}
                    onClose={() => setTemplatePickerOpen(false)}
                />
            )}

            {previewOpen && (
                <DietBuilderPreviewModal
                    title={details.title || "Untitled Diet Plan"}
                    clientLabel={selectedClient ? clientName(selectedClient) : "Not selected"}
                    startDate={details.startDate || "-"}
                    endDate={details.endDate || "No end date"}
                    checkInDate={details.checkInDate || "-"}
                    totalCardio={details.totalCardio || "0"}
                    macros={{ calories: targetCals, protein: targetPro, carbs: targetCarb, fat: targetFat, gain: targetGain }}
                    meals={meals}
                    onClose={() => setPreviewOpen(false)}
                />
            )}

            {sendModalOpen && savedAssignment && (
                <DietSendModal
                    shareUrl={shareUrl}
                    whatsappHref={whatsappHref}
                    emailHref={emailHref}
                    onCopy={handleCopyShareLink}
                    onClose={() => setSendModalOpen(false)}
                />
            )}
        </div>
    );
}

function DietTemplatePickerModal({
    plans,
    isLoading,
    onSelect,
    onClose,
}: {
    plans: DietPlan[];
    isLoading: boolean;
    onSelect: (plan: DietPlan) => void;
    onClose: () => void;
}) {
    return (
        <ModalFrame title="Use Diet Template" onClose={onClose} maxWidth="max-w-3xl">
            <div className="space-y-3 p-6">
                {isLoading ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">Loading templates...</div>
                ) : plans.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">No saved diet templates found.</div>
                ) : plans.map((plan) => (
                    <button
                        key={plan.id}
                        type="button"
                        onClick={() => onSelect(plan)}
                        className="block w-full rounded-lg border border-zinc-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
                    >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="font-bold text-zinc-900 dark:text-white">{plan.title}</div>
                                <div className="mt-1 text-sm capitalize text-zinc-500">{goalLabel(plan.goal)}</div>
                            </div>
                            <div className="text-sm font-semibold text-zinc-500">
                                {plan.calories_target ?? "-"} kcal / {plan.meals?.length || 0} meals
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </ModalFrame>
    );
}

function DietBuilderPreviewModal({
    title,
    clientLabel,
    startDate,
    endDate,
    checkInDate,
    totalCardio,
    macros,
    meals,
    onClose,
}: {
    title: string;
    clientLabel: string;
    startDate: string;
    endDate: string;
    checkInDate: string;
    totalCardio: string;
    macros: { calories: number; protein: number; carbs: number; fat: number; gain: number };
    meals: PdfMeal[];
    onClose: () => void;
}) {
    return (
        <ModalFrame title="Preview Diet Plan" onClose={onClose} maxWidth="max-w-5xl">
            <div className="space-y-5 p-6">
                <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
                    <p className="mt-1 text-sm text-zinc-500">{clientLabel}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoTile label="Dates" value={`${startDate} - ${endDate}`} />
                    <InfoTile label="Check-in" value={checkInDate} />
                    <InfoTile label="Cardio" value={`${totalCardio} min`} />
                    <InfoTile label="Gain/Loss" value={`${macros.gain}%`} />
                    <InfoTile label="Calories" value={`${macros.calories} kcal`} />
                    <InfoTile label="Protein" value={`${macros.protein} g`} />
                    <InfoTile label="Carbs" value={`${macros.carbs} g`} />
                    <InfoTile label="Fat" value={`${macros.fat} g`} />
                </div>
                <div className="space-y-4">
                    {meals.map((meal, index) => (
                        <section key={meal.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                            <h4 className="font-bold text-zinc-900 dark:text-white">Meal {index + 1}: {meal.time || "Untitled meal"}</h4>
                            <div className="mt-3 grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="mb-2 text-xs font-bold uppercase text-zinc-500">Foods</div>
                                    {meal.foods.length === 0 ? (
                                        <p className="text-sm text-zinc-400">No foods added.</p>
                                    ) : meal.foods.map((food) => (
                                        <div key={food.internalId} className="text-sm text-zinc-700 dark:text-zinc-300">{food.name || "Food"} - {food.amount || "0"} {food.unit}</div>
                                    ))}
                                </div>
                                <div>
                                    <div className="mb-2 text-xs font-bold uppercase text-zinc-500">Supplements</div>
                                    {meal.supplements.length === 0 ? (
                                        <p className="text-sm text-zinc-400">No supplements added.</p>
                                    ) : meal.supplements.map((supplement) => (
                                        <div key={supplement.internalId} className="text-sm text-zinc-700 dark:text-zinc-300">{supplement.name || "Supplement"} - {supplement.amount || "0"} {supplement.unit}</div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </ModalFrame>
    );
}

function DietSendModal({
    shareUrl,
    whatsappHref,
    emailHref,
    onCopy,
    onClose,
}: {
    shareUrl: string;
    whatsappHref: string;
    emailHref: string;
    onCopy: () => void;
    onClose: () => void;
}) {
    return (
        <ModalFrame title="Send this plan" onClose={onClose}>
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
                            onClick={onCopy}
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
                            whatsappHref ? "bg-orange-600 text-white hover:bg-orange-700" : "pointer-events-none bg-zinc-200 text-zinc-400 dark:bg-zinc-800"
                        }`}
                    >
                        <MessageCircleIcon className="h-4 w-4" />
                        Send on WhatsApp
                    </a>
                    <a
                        href={emailHref || undefined}
                        aria-disabled={!emailHref}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-bold transition ${
                            emailHref ? "border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10" : "pointer-events-none border-zinc-200 text-zinc-400 dark:border-zinc-800"
                        }`}
                    >
                        <MailIcon className="h-4 w-4" />
                        Email a copy
                    </a>
                </div>
                <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
                    <button type="button" onClick={onClose} className="rounded-lg border border-orange-600 px-5 py-3 text-sm font-bold text-orange-600 transition hover:bg-orange-50 dark:hover:bg-orange-500/10">
                        Close
                    </button>
                </div>
            </div>
        </ModalFrame>
    );
}

function FoodRows({
    title,
    emptyText,
    buttonLabel,
    accentClass,
    rows,
    foodItemById,
    onAdd,
    onOpenPicker,
    onUpdateAmount,
    onRemove,
}: {
    title: string;
    emptyText: string;
    buttonLabel: string;
    accentClass: string;
    rows: PdfMealFood[];
    foodItemById: Map<string, FoodItem>;
    onAdd: () => void;
    onOpenPicker: (rowId: string) => void;
    onUpdateAmount: (rowId: string, value: string) => void;
    onRemove: (rowId: string) => void;
}) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{title}</h3>
            {rows.length === 0 && <p className="text-xs italic text-zinc-400">{emptyText}</p>}
            {rows.map((row) => {
                const foodItem = foodItemById.get(row.id);
                const amount = Number(row.amount);
                const multiplier = foodItem && Number.isFinite(amount) && amount > 0 ? amount / 100 : 0;
                const calories = foodItem ? foodMacroNumber(foodItem.calories_per_100g) * multiplier : 0;
                const protein = foodItem ? foodMacroNumber(foodItem.protein_g) * multiplier : 0;
                const carbs = foodItem ? foodMacroNumber(foodItem.carbs_g) * multiplier : 0;
                const fat = foodItem ? foodMacroNumber(foodItem.fat_g) * multiplier : 0;

                return (
                    <div key={row.internalId} className="grid grid-cols-[minmax(0,1fr)_5rem_4rem_minmax(8rem,auto)_2rem] items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onOpenPicker(row.internalId)}
                            className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-left text-sm text-zinc-900 outline-none transition hover:border-indigo-500 focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                            title="Select food"
                        >
                            <span className="block truncate">{row.name || "Select food..."}</span>
                        </button>
                        <input
                            type="number"
                            value={row.amount}
                            onChange={(event) => onUpdateAmount(row.internalId, event.target.value)}
                            placeholder="Amt"
                            className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                        />
                        <input type="text" value={row.unit} disabled className="bg-transparent text-center text-xs text-zinc-500 outline-none" />
                        <div className="truncate text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {Math.round(calories)} kcal · P{Math.round(protein)} C{Math.round(carbs)} F{Math.round(fat)}
                        </div>
                        <button type="button" onClick={() => onRemove(row.internalId)} className="rounded-md p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" title="Remove row">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
            <button type="button" onClick={onAdd} className={`inline-flex items-center gap-1 text-xs font-semibold ${accentClass}`}>
                <PlusIcon className="h-3 w-3" />
                {buttonLabel}
            </button>
        </div>
    );
}

function FoodPickerModal({
    foodItems,
    isLoading,
    isError,
    search,
    onSearchChange,
    onSelect,
    onClose,
}: {
    foodItems: FoodItem[];
    isLoading: boolean;
    isError: boolean;
    search: string;
    onSearchChange: (value: string) => void;
    onSelect: (foodItem: FoodItem) => void;
    onClose: () => void;
}) {
    const query = search.trim().toLowerCase();
    const filteredFoodItems = useMemo(() => {
        if (!query) return foodItems;

        return foodItems.filter((foodItem) => (
            foodItem.name.toLowerCase().includes(query) ||
            (foodItem.brand || "").toLowerCase().includes(query)
        ));
    }, [foodItems, query]);

    return (
        <ModalFrame title="Select Food" onClose={onClose} maxWidth="max-w-4xl">
            <div className="space-y-4 p-6">
                <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-9 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                        placeholder="Search foods by name or brand"
                        autoFocus
                    />
                </div>

                {isLoading ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm font-medium text-zinc-500 dark:border-zinc-800">
                        Loading foods...
                    </div>
                ) : isError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        Unable to load foods.
                    </div>
                ) : filteredFoodItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm font-medium text-zinc-500 dark:border-zinc-800">
                        {foodItems.length === 0 ? "No food items found." : "No matching foods."}
                    </div>
                ) : (
                    <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                        {filteredFoodItems.map((foodItem) => (
                            <button
                                key={foodItem.id}
                                type="button"
                                onClick={() => onSelect(foodItem)}
                                className="rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-500 hover:bg-indigo-50/40 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-indigo-950/20"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-zinc-900 dark:text-white">{foodItem.name}</div>
                                        <div className="mt-1 truncate text-xs text-zinc-500">{foodItem.brand || "No brand"}</div>
                                    </div>
                                    {foodItem.is_verified && (
                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                                            Verified
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                                    <FoodMacroTile label="Calories" value={`${foodMacroNumber(foodItem.calories_per_100g).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kcal`} />
                                    <FoodMacroTile label="Protein" value={`${foodMacroNumber(foodItem.protein_g).toLocaleString("en-IN", { maximumFractionDigits: 2 })}g`} />
                                    <FoodMacroTile label="Carbs" value={`${foodMacroNumber(foodItem.carbs_g).toLocaleString("en-IN", { maximumFractionDigits: 2 })}g`} />
                                    <FoodMacroTile label="Fat" value={`${foodMacroNumber(foodItem.fat_g).toLocaleString("en-IN", { maximumFractionDigits: 2 })}g`} />
                                    <FoodMacroTile label="Fiber" value={`${foodMacroNumber(foodItem.fiber_g).toLocaleString("en-IN", { maximumFractionDigits: 2 })}g`} />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </ModalFrame>
    );
}

function FoodMacroTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900">
            <div className="font-bold uppercase text-zinc-500">{label}</div>
            <div className="mt-0.5 font-semibold text-zinc-900 dark:text-white">{value}</div>
        </div>
    );
}

function MealRows({
    title,
    emptyText,
    buttonLabel,
    accentClass,
    rows,
    options,
    onAdd,
    onUpdate,
    onRemove,
}: {
    title: string;
    emptyText: string;
    buttonLabel: string;
    accentClass: string;
    rows: Array<PdfMealFood | PdfSupplement>;
    options: Array<{ id: string; name: string }>;
    onAdd: () => void;
    onUpdate: (rowId: string, field: "id" | "amount", value: string) => void;
    onRemove: (rowId: string) => void;
}) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{title}</h3>
            {rows.length === 0 && <p className="text-xs italic text-zinc-400">{emptyText}</p>}
            {rows.map((row) => (
                <div key={row.internalId} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_5rem_4rem_2rem]">
                    <select
                        value={row.id}
                        onChange={(event) => onUpdate(row.internalId, "id", event.target.value)}
                        className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    >
                        <option value="">Select...</option>
                        {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <input
                        type="number"
                        value={row.amount}
                        onChange={(event) => onUpdate(row.internalId, "amount", event.target.value)}
                        placeholder="Amt"
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                    <input type="text" value={row.unit} disabled className="bg-transparent text-center text-xs text-zinc-500 outline-none" />
                    <button type="button" onClick={() => onRemove(row.internalId)} className="rounded-md p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" title="Remove row">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={onAdd} className={`inline-flex items-center gap-1 text-xs font-semibold ${accentClass}`}>
                <PlusIcon className="h-3 w-3" />
                {buttonLabel}
            </button>
        </div>
    );
}

function getMacroStatus(consumedValue: number, targetValue: number, tolerance: number, unit: string) {
    const difference = targetValue - consumedValue;
    const roundedDifference = Math.abs(Math.round(difference));

    if (Math.abs(difference) <= tolerance) {
        return {
            label: "On target",
            value: roundedDifference === 0 ? `0 ${unit}` : `${roundedDifference} ${unit}`,
            colorClass: "text-emerald-600 dark:text-emerald-400",
            badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
            barClass: "bg-emerald-500",
            progressClass: "from-emerald-400 to-emerald-600 dark:from-emerald-300 dark:to-emerald-500",
        };
    }

    if (difference > 0) {
        return {
            label: "Remaining",
            value: `${roundedDifference} ${unit}`,
            colorClass: "text-yellow-600 dark:text-yellow-400",
            badgeClass: "bg-yellow-50 text-yellow-700 ring-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:ring-yellow-500/30",
            barClass: "bg-yellow-500",
            progressClass: "from-yellow-300 to-amber-500 dark:from-yellow-300 dark:to-amber-400",
        };
    }

    return {
        label: "Over",
        value: `${roundedDifference} ${unit}`,
        colorClass: "text-red-600 dark:text-red-400",
        badgeClass: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
        barClass: "bg-red-500",
        progressClass: "from-red-400 to-rose-600 dark:from-red-300 dark:to-rose-500",
    };
}

function DietPlanViewModal({
    title,
    heading,
    statusLabel,
    meta,
    meals,
    onClose,
}: {
    title: string;
    heading: string;
    statusLabel: string;
    meta: Array<{ label: string; value: string }>;
    meals: DietPlan["meals"];
    onClose: () => void;
}) {
    const sortedMeals = [...(meals || [])].sort((a, b) => a.day_number - b.day_number);

    return (
        <ModalFrame title={title} onClose={onClose} maxWidth="max-w-4xl">
            <div className="space-y-5 p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{heading}</h3>
                    <Badge className={statusClasses(statusLabel === "Active")}>{statusLabel}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {meta.map((item) => <InfoTile key={item.label} label={item.label} value={item.value} />)}
                </div>
                <div className="space-y-3">
                    {sortedMeals.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
                            No planned meals found for this plan.
                        </div>
                    ) : sortedMeals.map((meal) => (
                        <section key={meal.id} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <div className="flex flex-col gap-1 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h4 className="font-bold text-zinc-900 dark:text-white">Day {meal.day_number}: {meal.meal_slot}</h4>
                                    {meal.notes && <p className="mt-1 text-sm text-zinc-500">{meal.notes}</p>}
                                </div>
                                <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {meal.items?.length || 0} items
                                </Badge>
                            </div>
                            <DataTable emptyText="No food items found for this meal." columns={["Food", "Quantity", "Notes"]}>
                                {(meal.items || []).map((item) => (
                                    <tr key={item.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{item.food_item_name || item.food_item}</td>
                                        <td className="px-6 py-4">{item.quantity_g} g</td>
                                        <td className="px-6 py-4"><div className="max-w-80 truncate">{item.notes || "-"}</div></td>
                                    </tr>
                                ))}
                            </DataTable>
                        </section>
                    ))}
                </div>
            </div>
        </ModalFrame>
    );
}

function DietAssignmentViewModal({
    assignment,
    clientLabel,
    planLabel,
    onClose,
}: {
    assignment: DietPlanAssignment;
    clientLabel: string;
    planLabel: string;
    onClose: () => void;
}) {
    return (
        <ModalFrame title="View Diet Assignment" onClose={onClose} maxWidth="max-w-3xl">
            <div className="space-y-5 p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{planLabel}</h3>
                    <Badge className={statusClasses(assignment.is_active)}>{assignment.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Client" value={clientLabel} />
                    <InfoTile label="Plan" value={planLabel} />
                    <InfoTile label="Start Date" value={assignment.start_date} />
                    <InfoTile label="End Date" value={assignment.end_date || "No end date"} />
                </div>
                <div>
                    <h4 className="mb-2 text-xs font-bold uppercase text-zinc-500">Adjustments</h4>
                    <pre className="max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                        {JSON.stringify(assignment.adjustments || {}, null, 2)}
                    </pre>
                </div>
            </div>
        </ModalFrame>
    );
}

function InfoTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs font-bold uppercase text-zinc-500">{label}</div>
            <div className="mt-1 break-words text-sm font-semibold text-zinc-900 dark:text-white">{value}</div>
        </div>
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

function RowActions({ onView, onEdit, onDelete }: { onView?: () => void; onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="flex items-center justify-end gap-2">
            {onView && (
                <button type="button" onClick={onView} className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-sky-600 dark:hover:bg-zinc-800 dark:hover:text-sky-300" title="View">
                    <EyeIcon className="h-4 w-4" />
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

function ModalFrame({
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
                    <button type="button" onClick={onClose} className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white" title="Close">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="max-h-[calc(90vh-72px)] overflow-y-auto">{children}</div>
            </div>
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

export default function DietPlanManagementPage() {
    return (
        <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading diet plans...</div>}>
            <DietPlanManagementContent />
        </Suspense>
    );
}
