"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CalendarClockIcon,
    CheckCircleIcon,
    EditIcon,
    Loader2Icon,
    MessageCircleIcon,
    PlusIcon,
    SearchIcon,
    SendIcon,
    Trash2Icon,
    XIcon,
} from "lucide-react";

import { getClients } from "@/services/client.service";
import { getMessageTemplates, testMessageTemplate } from "@/services/communication.service";
import {
    createFollowup,
    deleteFollowup,
    getFollowups,
    getFollowupSuggestedTargets,
    updateFollowup,
} from "@/services/followup.service";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";
import { getStaffMembers } from "@/services/staff.service";
import type { ClientData } from "@/types/client.type";
import type { MessageTemplate } from "@/types/communication.type";
import type {
    Followup,
    FollowupPayload,
    FollowupPriority,
    FollowupStatus,
    FollowupSuggestedTarget,
    FollowupType,
} from "@/types/followup.type";

type ModalMode = "create" | "edit";
type StatusFilter = FollowupStatus | "all";

type FollowupForm = {
    client: string;
    assigned_to: string;
    followup_type: FollowupType;
    status: FollowupStatus;
    priority: FollowupPriority;
    scheduled_at: string;
    completed_at: string;
    notes: string;
    outcome: string;
};

const emptyForm: FollowupForm = {
    client: "",
    assigned_to: "",
    followup_type: "whatsapp",
    status: "pending",
    priority: "medium",
    scheduled_at: "",
    completed_at: "",
    notes: "",
    outcome: "",
};

function getClientName(client?: ClientData) {
    if (!client) return "Unknown client";
    return `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim() || client.user.email;
}

function formatDateTime(value: string | null) {
    if (!value) return "Not scheduled";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function toDateTimeLocal(value: string | null) {
    if (!value) return "";
    const date = new Date(value);
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
    return value ? new Date(value).toISOString() : null;
}

function followupToForm(followup: Followup): FollowupForm {
    return {
        client: followup.client,
        assigned_to: followup.assigned_to || "",
        followup_type: followup.followup_type,
        status: followup.status,
        priority: followup.priority,
        scheduled_at: toDateTimeLocal(followup.scheduled_at),
        completed_at: toDateTimeLocal(followup.completed_at),
        notes: followup.notes || "",
        outcome: followup.outcome || "",
    };
}

function formToPayload(form: FollowupForm): FollowupPayload {
    return {
        client: form.client,
        assigned_to: form.assigned_to || null,
        followup_type: form.followup_type,
        status: form.status,
        priority: form.priority,
        scheduled_at: fromDateTimeLocal(form.scheduled_at),
        completed_at: fromDateTimeLocal(form.completed_at),
        notes: form.notes,
        outcome: form.outcome,
        next_followup: null,
    };
}

function getErrorMessage(error: unknown, fallback: string) {
    const data = (error as { response?: { data?: { message?: string; detail?: string; error?: string } } }).response?.data;
    return data?.message || data?.detail || data?.error || fallback;
}

export default function FollowUpsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [selectedFollowup, setSelectedFollowup] = useState<Followup | null>(null);
    const [followupToDelete, setFollowupToDelete] = useState<Followup | null>(null);
    const [form, setForm] = useState<FollowupForm>(emptyForm);
    const [formError, setFormError] = useState("");
    const [sendTemplateId, setSendTemplateId] = useState("");
    const [sendTargetClientId, setSendTargetClientId] = useState("");
    const [sendResult, setSendResult] = useState("");

    const { data: followups = [], isLoading: followupsLoading } = useQuery({
        queryKey: ["engagement-followups"],
        queryFn: getFollowups,
    });
    const { data: suggestedTargets = [], isLoading: targetsLoading } = useQuery({
        queryKey: ["engagement-followup-targets"],
        queryFn: getFollowupSuggestedTargets,
    });
    const { data: clients = [] } = useQuery({ queryKey: ["engagement-followup-clients"], queryFn: getClients });
    const { data: staff = [] } = useQuery({ queryKey: ["engagement-followup-staff"], queryFn: getStaffMembers });
    const { data: templates = [] } = useQuery({
        queryKey: ["engagement-followup-message-templates"],
        queryFn: () => getMessageTemplates(),
    });

    const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
    const sendTemplates = useMemo(() => templates.filter((template) => template.is_active && (template.channel === "email" || template.channel === "whatsapp")), [templates]);

    const refreshFollowups = () => {
        queryClient.invalidateQueries({ queryKey: ["engagement-followups"] });
        queryClient.invalidateQueries({ queryKey: ["engagement-followup-targets"] });
    };

    const createMutation = useMutation({
        mutationFn: createFollowup,
        onSuccess: () => {
            refreshFollowups();
            closeModal();
        },
        onError: (error: unknown) => setFormError(getErrorMessage(error, "Could not create follow-up.")),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: FollowupPayload }) => updateFollowup(id, payload),
        onSuccess: () => {
            refreshFollowups();
            closeModal();
        },
        onError: (error: unknown) => setFormError(getErrorMessage(error, "Could not update follow-up.")),
    });
    const deleteMutation = useMutation({
        mutationFn: deleteFollowup,
        onSuccess: () => {
            refreshFollowups();
            setFollowupToDelete(null);
        },
    });
    const sendMutation = useMutation({
        mutationFn: ({ template, clientId }: { template: MessageTemplate; clientId: string }) =>
            testMessageTemplate(template.id, {
                recipient_id: clientId,
                context_data: buildTargetContext(clientById.get(clientId), suggestedTargets.find((target) => target.client === clientId)),
            }),
        onSuccess: (result) => setSendResult(result.message),
        onError: (error: unknown) => setSendResult(getErrorMessage(error, "Follow-up send failed.")),
    });

    const filteredFollowups = useMemo(() => {
        const query = search.trim().toLowerCase();
        return followups.filter((followup) => {
            const matchesStatus = statusFilter === "all" || followup.status === statusFilter;
            const matchesSearch = !query || [
                followup.client_name,
                followup.client_email,
                followup.client_phone || "",
                followup.followup_type,
                followup.priority,
                followup.notes || "",
                followup.outcome || "",
            ].some((value) => value.toLowerCase().includes(query));
            return matchesStatus && matchesSearch;
        });
    }, [followups, search, statusFilter]);

    const stats = {
        pending: followups.filter((followup) => followup.status === "pending").length,
        completed: followups.filter((followup) => followup.status === "completed").length,
        missed: followups.filter((followup) => followup.status === "missed" || followup.status === "rescheduled").length,
        expiring: suggestedTargets.filter((target) => target.reason === "expiring_soon").length,
    };

    const openCreateModal = (clientId?: string) => {
        setModalMode("create");
        setSelectedFollowup(null);
        setForm({ ...emptyForm, client: clientId || "" });
        setFormError("");
        setModalOpen(true);
    };

    const openEditModal = (followup: Followup) => {
        setModalMode("edit");
        setSelectedFollowup(followup);
        setForm(followupToForm(followup));
        setFormError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedFollowup(null);
        setForm(emptyForm);
        setFormError("");
    };

    const submitFollowup = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = formToPayload(form);
        if (!payload.client) {
            setFormError("Client is required.");
            return;
        }
        if (modalMode === "edit" && selectedFollowup) {
            updateMutation.mutate({ id: selectedFollowup.id, payload });
            return;
        }
        createMutation.mutate(payload);
    };

    const submitSend = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSendResult("");
        const template = sendTemplates.find((item) => item.id === sendTemplateId);
        if (!template || !sendTargetClientId) {
            setSendResult("Select a template and target first.");
            return;
        }
        sendMutation.mutate({ template, clientId: sendTargetClientId });
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <CalendarClockIcon className="h-7 w-7 text-indigo-500" />
                        Follow-ups
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Track lead conversations and renewal nudges for active clients.</p>
                </div>
                <button type="button" onClick={() => openCreateModal()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
                    <PlusIcon className="h-4 w-4" />
                    New Follow-Up
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "Pending", value: stats.pending },
                    { label: "Completed", value: stats.completed },
                    { label: "Missed/Rescheduled", value: stats.missed },
                    { label: "Expiring Soon", value: stats.expiring },
                ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="text-xs font-bold uppercase text-zinc-500">{item.label}</div>
                        <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{item.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {(["all", "pending", "completed", "missed", "rescheduled"] as StatusFilter[]).map((value) => (
                                <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${statusFilter === value ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
                                    {value}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-80">
                            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search follow-ups..." className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white" />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <ResponsiveTableFromRows
                            columns={["Client", "Type", "Schedule", "Status", "Priority", "Actions"]}
                            emptyText="No follow-ups found."
                            headerClassName="border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50"
                            bodyClassName="divide-zinc-200 dark:divide-zinc-800"
                        >
                                {followupsLoading ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">Loading follow-ups...</td></tr>
                                ) : filteredFollowups.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">No follow-ups found.</td></tr>
                                ) : filteredFollowups.map((followup) => (
                                    <tr key={followup.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                        <td className="min-w-64 px-6 py-4">
                                            <div className="font-semibold text-zinc-900 dark:text-white">{followup.client_name}</div>
                                            <div className="text-xs text-zinc-500">{followup.client_email}</div>
                                            {followup.notes && <div className="mt-1 line-clamp-1 text-xs text-zinc-500">{followup.notes}</div>}
                                        </td>
                                        <td className="px-6 py-4 capitalize text-zinc-700 dark:text-zinc-300">{followup.followup_type.replace("_", " ")}</td>
                                        <td className="px-6 py-4 text-xs text-zinc-500">{formatDateTime(followup.scheduled_at)}</td>
                                        <td className="px-6 py-4"><StatusBadge value={followup.status} /></td>
                                        <td className="px-6 py-4 capitalize text-zinc-700 dark:text-zinc-300">{followup.priority}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button type="button" onClick={() => openEditModal(followup)} className="p-2 text-zinc-500 hover:text-indigo-600" title="Edit follow-up"><EditIcon className="h-4 w-4" /></button>
                                            <button type="button" onClick={() => setFollowupToDelete(followup)} className="p-2 text-zinc-500 hover:text-red-600" title="Delete follow-up"><Trash2Icon className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                        </ResponsiveTableFromRows>
                    </div>
                </div>

                <aside className="space-y-5">
                    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                        <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-zinc-900 dark:text-white">
                            <MessageCircleIcon className="h-4 w-4 text-indigo-500" />
                            Send Follow-Up
                        </h2>
                        <form onSubmit={submitSend} className="mt-4 space-y-4">
                            <SelectField label="Template" value={sendTemplateId} onChange={setSendTemplateId} required>
                                <option value="">Select template...</option>
                                {sendTemplates.map((template) => (
                                    <option key={template.id} value={template.id}>{template.name} ({template.channel})</option>
                                ))}
                            </SelectField>
                            <SelectField label="Target Client" value={sendTargetClientId} onChange={setSendTargetClientId} required>
                                <option value="">Select client...</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{getClientName(client)} ({client.user.email})</option>
                                ))}
                            </SelectField>
                            {sendResult && <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{sendResult}</p>}
                            <button type="submit" disabled={sendMutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                                {sendMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                                Send Message
                            </button>
                        </form>
                    </section>

                    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                        <h2 className="text-sm font-bold uppercase text-zinc-900 dark:text-white">Suggested Targets</h2>
                        <div className="mt-4 space-y-3">
                            {targetsLoading ? (
                                <p className="text-sm text-zinc-500">Loading targets...</p>
                            ) : suggestedTargets.length === 0 ? (
                                <p className="text-sm text-zinc-500">No lead or renewal targets found.</p>
                            ) : suggestedTargets.map((target) => (
                                <TargetItem
                                    key={`${target.reason}-${target.client}-${target.membership || "lead"}`}
                                    target={target}
                                    onCreate={() => openCreateModal(target.client)}
                                    onSelectSend={() => setSendTargetClientId(target.client)}
                                />
                            ))}
                        </div>
                    </section>
                </aside>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{modalMode === "edit" ? "Edit Follow-Up" : "Create Follow-Up"}</h2>
                            <button type="button" onClick={closeModal} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"><XIcon className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={submitFollowup} className="space-y-4 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <SelectField label="Client" value={form.client} onChange={(value) => setForm({ ...form, client: value })} required>
                                    <option value="">Select client...</option>
                                    {clients.map((client) => <option key={client.id} value={client.id}>{getClientName(client)} ({client.user.email})</option>)}
                                </SelectField>
                                <SelectField label="Assigned To" value={form.assigned_to} onChange={(value) => setForm({ ...form, assigned_to: value })}>
                                    <option value="">Unassigned</option>
                                    {staff.map((member) => <option key={member.user_id} value={member.user_id}>{member.full_name} ({member.email})</option>)}
                                </SelectField>
                                <SelectField label="Type" value={form.followup_type} onChange={(value) => setForm({ ...form, followup_type: value as FollowupType })}>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="email">Email</option>
                                    <option value="call">Phone Call</option>
                                    <option value="in_person">In-Person</option>
                                    <option value="sms">SMS</option>
                                </SelectField>
                                <SelectField label="Priority" value={form.priority} onChange={(value) => setForm({ ...form, priority: value as FollowupPriority })}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </SelectField>
                                <SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as FollowupStatus })}>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="missed">Missed</option>
                                    <option value="rescheduled">Rescheduled</option>
                                </SelectField>
                                <TextField label="Scheduled At" type="datetime-local" value={form.scheduled_at} onChange={(value) => setForm({ ...form, scheduled_at: value })} />
                                <TextField label="Completed At" type="datetime-local" value={form.completed_at} onChange={(value) => setForm({ ...form, completed_at: value })} />
                            </div>
                            <TextAreaField label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
                            <TextAreaField label="Outcome" value={form.outcome} onChange={(value) => setForm({ ...form, outcome: value })} />
                            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
                            <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                                <button type="button" onClick={closeModal} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                    {modalMode === "edit" ? "Save Changes" : "Create Follow-Up"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {followupToDelete && (
                <ConfirmDialog
                    title="Delete follow-up"
                    message={`Delete the follow-up for ${followupToDelete.client_name}?`}
                    submitting={deleteMutation.isPending}
                    onCancel={() => setFollowupToDelete(null)}
                    onConfirm={() => deleteMutation.mutate(followupToDelete.id)}
                />
            )}
        </div>
    );
}

function buildTargetContext(client?: ClientData, target?: FollowupSuggestedTarget): Record<string, unknown> {
    return {
        client_name: client ? getClientName(client) : target?.client_name || "",
        client_email: client?.user.email || target?.client_email || "",
        client_phone: client?.phone || target?.client_phone || "",
        expiry_date: target?.end_date || "",
        package_name: target?.package_name || "",
        plan_name: target?.plan_name || "",
    };
}

function SelectField({ label, value, onChange, required, children }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</label>
            <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                {children}
            </select>
        </div>
    );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</label>
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
        </div>
    );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</label>
            <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
        </div>
    );
}

function StatusBadge({ value }: { value: FollowupStatus }) {
    const classes: Record<FollowupStatus, string> = {
        pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        missed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
        rescheduled: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${classes[value]}`}>
            {value === "completed" && <CheckCircleIcon className="h-3.5 w-3.5" />}
            {value}
        </span>
    );
}

function TargetItem({ target, onCreate, onSelectSend }: { target: FollowupSuggestedTarget; onCreate: () => void; onSelectSend: () => void }) {
    return (
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate font-semibold text-zinc-900 dark:text-white">{target.client_name}</div>
                    <div className="truncate text-xs text-zinc-500">{target.client_email || target.client_phone || "No contact"}</div>
                    <div className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {target.reason === "lead" ? "Lead follow-up" : `Ends ${target.end_date || ""}`}
                    </div>
                    {target.package_name && <div className="mt-1 truncate text-xs text-zinc-500">{target.package_name} - {target.plan_name}</div>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold uppercase ${target.reason === "lead" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"}`}>
                    {target.reason === "lead" ? "Lead" : "Renewal"}
                </span>
            </div>
            <div className="mt-3 flex gap-2">
                <button type="button" onClick={onCreate} className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
                    Schedule
                </button>
                <button type="button" onClick={onSelectSend} className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                    Select
                </button>
            </div>
        </div>
    );
}

function ConfirmDialog({ title, message, submitting, onCancel, onConfirm }: { title: string; message: string; submitting: boolean; onCancel: () => void; onConfirm: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                        {submitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
