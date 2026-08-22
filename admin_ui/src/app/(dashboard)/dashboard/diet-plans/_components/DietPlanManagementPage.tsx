"use client";

import { FormEvent, Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CalculatorIcon,
    DownloadIcon,
    EditIcon,
    EyeIcon,
    FileTextIcon,
    Loader2Icon,
    PlusIcon,
    SearchIcon,
    SendIcon,
    Trash2Icon,
    TrashIcon,
    UsersIcon,
    UtensilsIcon,
    XIcon,
} from "lucide-react";
import type { AxiosError } from "axios";

import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";
import { foodDb, supplementsDb } from "@/lib/foodDb";
import { useCurrentUserPermissions } from "@/lib/permissions";
import { getClients } from "@/services/client.service";
import {
    createDietPlan,
    createDietPlanAssignment,
    deleteDietPlan,
    deleteDietPlanAssignment,
    downloadDietPlanPdf,
    generateDietPlanPdf,
    getDietPlanAssignments,
    getDietPlans,
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
} from "@/types/diet-plan.type";

type TabId = "plans" | "assignments" | "pdf";
type ModalMode = "add" | "edit";
type DeleteTarget = { type: "plan"; id: string; label: string } | { type: "assignment"; id: string; label: string };

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
        mutationFn: ({ mode, id, payload }: { mode: ModalMode; id?: string; payload: DietPlanAssignmentPayload }) => (
            mode === "add" ? createDietPlanAssignment(payload) : updateDietPlanAssignment(id || "", payload)
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

    const openAssignmentModal = (mode: ModalMode, item: DietPlanAssignment | null) => {
        setFormError("");
        setAssignmentForm(item ? assignmentToForm(item) : emptyAssignmentForm);
        setAssignmentModal({ mode, item });
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

        assignmentMutation.mutate({ mode: assignmentModal?.mode || "add", id: assignmentModal?.item?.id, payload });
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
                    onAdd={() => openAssignmentModal("add", null)}
                    onView={(assignment) => setAssignmentView(assignment)}
                    onEdit={(assignment) => openAssignmentModal("edit", assignment)}
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
                <ModalFrame title={assignmentModal.mode === "add" ? "Assign Diet Plan" : "Edit Diet Assignment"} onClose={() => setAssignmentModal(null)}>
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
                        <ModalActions loading={assignmentMutation.isPending} submitLabel={assignmentModal.mode === "add" ? "Create Assignment" : "Save Assignment"} onCancel={() => setAssignmentModal(null)} />
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
    onAdd,
    onView,
    onEdit,
    onDelete,
}: {
    assignments: DietPlanAssignment[];
    clients: Map<string, ClientData>;
    plans: Map<string, DietPlan>;
    loading: boolean;
    onAdd: () => void;
    onView: (assignment: DietPlanAssignment) => void;
    onEdit: (assignment: DietPlanAssignment) => void;
    onDelete: (assignment: DietPlanAssignment) => void;
}) {
    return (
        <Panel title="Diet Plan Assignments" actionLabel="New Assignment" onAction={onAdd}>
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
    const searchParams = useSearchParams();
    const clientsQuery = useQuery({ queryKey: ["clients-management"], queryFn: getClients });

    const [details, setDetails] = useState({
        startDate: "",
        endDate: "",
        checkInDate: "",
        totalCardio: "",
    });
    const [macroTargets, setMacroTargets] = useState({
        calories: searchParams.get("calories") || "",
        protein: searchParams.get("protein") || "",
        fat: searchParams.get("fat") || "",
        carbs: searchParams.get("carbs") || "",
        gain: searchParams.get("gain") || "",
    });
    const [selectedClientId, setSelectedClientId] = useState("");
    const [clientSearch, setClientSearch] = useState("");
    const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
    const [meals, setMeals] = useState<PdfMeal[]>([buildInitialPdfMeal()]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const clients = clientsQuery.data ?? emptyClients;
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    const selectedClientLabel = selectedClient ? getClientLabel(selectedClient) : "";
    const isSearchingClients = isClientSearchOpen && clientSearch.trim().length > 0 && clientSearch !== selectedClientLabel;
    const targetCals = Number(macroTargets.calories) || 0;
    const targetPro = Number(macroTargets.protein) || 0;
    const targetFat = Number(macroTargets.fat) || 0;
    const targetCarb = Number(macroTargets.carbs) || 0;
    const targetGain = Number(macroTargets.gain) || 0;

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
    };

    const handleClientSelect = (client: ClientData) => {
        setSelectedClientId(client.id);
        setClientSearch(getClientLabel(client));
        setIsClientSearchOpen(false);
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
                const item = foodDb.find((db) => db.id === food.id);
                if (item && food.amount) {
                    const multiplier = Number(food.amount) / 100;
                    pro += item.protein * multiplier;
                    fat += item.fat * multiplier;
                    carb += item.carbs * multiplier;
                    cal += item.calories * multiplier;
                }
            });
        });

        return { cal, pro, fat, carb };
    }, [meals]);

    const macroSummaries = [
        { name: "Calories", field: "calories" as const, consumedValue: consumed.cal, targetValue: targetCals, tolerance: 50, unit: "kcal" },
        { name: "Protein", field: "protein" as const, consumedValue: consumed.pro, targetValue: targetPro, tolerance: 5, unit: "g" },
        { name: "Fat", field: "fat" as const, consumedValue: consumed.fat, targetValue: targetFat, tolerance: 5, unit: "g" },
        { name: "Carbs", field: "carbs" as const, consumedValue: consumed.carb, targetValue: targetCarb, tolerance: 10, unit: "g" },
    ];

    const updateMeal = (mealId: string, updater: (meal: PdfMeal) => PdfMeal) => {
        setMeals((items) => items.map((meal) => (meal.id === mealId ? updater(meal) : meal)));
    };

    const addFood = (mealId: string) => {
        updateMeal(mealId, (meal) => ({
            ...meal,
            foods: [...meal.foods, { internalId: createFormId(), id: "", name: "", amount: "", unit: "g" }],
        }));
    };

    const addSupplement = (mealId: string) => {
        updateMeal(mealId, (meal) => ({
            ...meal,
            supplements: [...meal.supplements, { internalId: createFormId(), id: "", name: "", amount: "", unit: "scoop" }],
        }));
    };

    const buildPlanPayload = () => ({
        ...details,
        clientEmail: selectedClient?.user.email || "",
        clientPhone: selectedClient?.phone || "",
        calories: targetCals,
        protein: targetPro,
        fat: targetFat,
        carbs: targetCarb,
        weightGain: targetGain,
        meals: meals.map((meal) => ({
            time: meal.time,
            foods: meal.foods.map((food) => ({ name: food.name, amount: food.amount, unit: food.unit })),
            supplements: meal.supplements.map((supplement) => ({ name: supplement.name, amount: supplement.amount, unit: supplement.unit })),
        })),
    });

    const getPdfErrorMessage = (e: unknown) => {
        const error = e as AxiosError<{ error?: string }>;
        return error.response?.data?.error || "Please try again.";
    };

    const generatePlan = async () => {
        if (!selectedClient) {
            alert("Please select a client before generating and sending the plan.");
            return;
        }
        if (!selectedClient.user.email) {
            alert("Selected client does not have an email address.");
            return;
        }

        setLoading(true);
        try {
            await generateDietPlanPdf(buildPlanPayload());
            alert("Plan generated and sent successfully.");
        } catch (e: unknown) {
            alert(`Failed to generate plan. ${getPdfErrorMessage(e)}`);
        } finally {
            setLoading(false);
        }
    };

    const downloadPlan = async () => {
        setDownloading(true);
        try {
            await downloadDietPlanPdf(buildPlanPayload());
        } catch (e: unknown) {
            alert(`Failed to download plan. ${getPdfErrorMessage(e)}`);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-4">
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
                    <label className="ml-auto flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
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
                    <section key={meal.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
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

                        <div className="mt-5 grid gap-6 lg:grid-cols-2">
                            <MealRows
                                title="Foods"
                                emptyText="No foods added."
                                buttonLabel="Add Food"
                                accentClass="text-indigo-600 dark:text-indigo-300"
                                rows={meal.foods}
                                options={foodDb}
                                onAdd={() => addFood(meal.id)}
                                onUpdate={(rowId, field, value) => {
                                    updateMeal(meal.id, (item) => ({
                                        ...item,
                                        foods: item.foods.map((food) => {
                                            if (food.internalId !== rowId) return food;
                                            const next = { ...food, [field]: value };
                                            if (field === "id") {
                                                const dbItem = foodDb.find((db) => db.id === value);
                                                if (dbItem) {
                                                    next.name = dbItem.name;
                                                    next.unit = dbItem.defaultUnit;
                                                }
                                            }
                                            return next;
                                        }),
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
                    disabled={downloading || loading}
                    onClick={downloadPlan}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-6 py-2.5 font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                    {downloading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
                    {downloading ? "Downloading..." : "Download PDF"}
                </button>
                <button
                    type="button"
                    disabled={loading}
                    onClick={generatePlan}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                    {loading ? "Generating..." : "Generate PDF & Send"}
                </button>
            </div>
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
                <div key={row.internalId} className="grid grid-cols-[minmax(0,1fr)_5rem_4rem_2rem] items-center gap-2">
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
