"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircleIcon,
    EditIcon,
    Loader2Icon,
    MailIcon,
    MessageCircleIcon,
    PlusIcon,
    SearchIcon,
    SendIcon,
    Trash2Icon,
    XCircleIcon,
    XIcon,
} from "lucide-react";

import { getClients } from "@/services/client.service";
import {
    createMessageTemplate,
    deleteMessageTemplate,
    getEmailLogs,
    getMessageTemplates,
    getWhatsAppLogs,
    testMessageTemplate,
    updateMessageTemplate,
} from "@/services/communication.service";
import type { ClientData } from "@/types/client.type";
import type {
    MessageCategory,
    MessageChannel,
    MessageTemplate,
    MessageTemplatePayload,
} from "@/types/communication.type";

type PageTab = "templates" | "test" | "logs";
type ModalMode = "create" | "edit";
type LogChannelFilter = "all" | "email" | "whatsapp";
type LogStatusFilter = "all" | "sent" | "pending" | "failed" | "success";

type TemplateForm = {
    name: string;
    channel: MessageChannel;
    category: MessageCategory;
    subject: string;
    body: string;
    variables: string;
    is_active: boolean;
};

const categoryOptions: Array<{ value: MessageCategory; label: string }> = [
    { value: "welcome", label: "Welcome" },
    { value: "renewal_reminder", label: "Renewal Reminder" },
    { value: "payment_receipt", label: "Payment Receipt" },
    { value: "plan_assigned", label: "Plan Assigned" },
    { value: "birthday", label: "Birthday" },
    { value: "followup", label: "Follow-Up" },
    { value: "promo", label: "Promotion" },
    { value: "custom", label: "Custom" },
];

const emptyTemplateForm: TemplateForm = {
    name: "",
    channel: "email",
    category: "custom",
    subject: "",
    body: "",
    variables: "client_name, client_email",
    is_active: true,
};

function getClientName(client: ClientData) {
    return `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim() || client.user.email;
}

function formatDate(value: string | null) {
    if (!value) return "Not sent";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function templateToForm(template: MessageTemplate): TemplateForm {
    return {
        name: template.name,
        channel: template.channel,
        category: template.category,
        subject: template.subject || "",
        body: template.body,
        variables: template.variables.join(", "),
        is_active: template.is_active,
    };
}

function formToPayload(form: TemplateForm): MessageTemplatePayload {
    return {
        name: form.name.trim(),
        channel: form.channel,
        category: form.category,
        subject: form.channel === "email" ? form.subject.trim() : "",
        body: form.body.trim(),
        variables: form.variables.split(",").map((item) => item.trim()).filter(Boolean),
        is_active: form.is_active,
    };
}

function getErrorMessage(error: unknown, fallback: string) {
    const data = (error as { response?: { data?: { message?: string; detail?: string; error?: string } } }).response?.data;
    return data?.message || data?.detail || data?.error || fallback;
}

export default function CommunicationsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<PageTab>("templates");
    const [search, setSearch] = useState("");
    const [logChannelFilter, setLogChannelFilter] = useState<LogChannelFilter>("all");
    const [logStatusFilter, setLogStatusFilter] = useState<LogStatusFilter>("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);
    const [form, setForm] = useState<TemplateForm>(emptyTemplateForm);
    const [formError, setFormError] = useState("");
    const [testTemplateId, setTestTemplateId] = useState("");
    const [testClientId, setTestClientId] = useState("");
    const [testContext, setTestContext] = useState("{\n  \"client_name\": \"Demo Client\"\n}");
    const [testResult, setTestResult] = useState("");

    const { data: templates = [], isLoading: templatesLoading } = useQuery({
        queryKey: ["engagement-message-templates"],
        queryFn: () => getMessageTemplates(),
    });
    const { data: clients = [] } = useQuery({ queryKey: ["engagement-clients"], queryFn: getClients });
    const { data: emailLogs = [], isLoading: emailLogsLoading } = useQuery({
        queryKey: ["engagement-email-logs"],
        queryFn: getEmailLogs,
    });
    const { data: whatsappLogs = [], isLoading: whatsappLogsLoading } = useQuery({
        queryKey: ["engagement-whatsapp-logs"],
        queryFn: getWhatsAppLogs,
    });

    const refreshTemplates = () => queryClient.invalidateQueries({ queryKey: ["engagement-message-templates"] });
    const refreshLogs = () => {
        queryClient.invalidateQueries({ queryKey: ["engagement-email-logs"] });
        queryClient.invalidateQueries({ queryKey: ["engagement-whatsapp-logs"] });
    };

    const createMutation = useMutation({
        mutationFn: createMessageTemplate,
        onSuccess: () => {
            refreshTemplates();
            closeModal();
        },
        onError: (error: unknown) => setFormError(getErrorMessage(error, "Could not create template.")),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: MessageTemplatePayload }) => updateMessageTemplate(id, payload),
        onSuccess: () => {
            refreshTemplates();
            closeModal();
        },
        onError: (error: unknown) => setFormError(getErrorMessage(error, "Could not update template.")),
    });
    const deleteMutation = useMutation({
        mutationFn: deleteMessageTemplate,
        onSuccess: () => {
            refreshTemplates();
            setTemplateToDelete(null);
        },
    });
    const testMutation = useMutation({
        mutationFn: ({ id, context }: { id: string; context: Record<string, unknown> }) =>
            testMessageTemplate(id, { recipient_id: testClientId, context_data: context }),
        onSuccess: (result) => {
            setTestResult(result.message);
            refreshLogs();
        },
        onError: (error: unknown) => {
            setTestResult(getErrorMessage(error, "Test send failed."));
            refreshLogs();
        },
    });

    const filteredTemplates = useMemo(() => {
        const query = search.trim().toLowerCase();
        return templates.filter((template) => {
            if (!query) return true;
            return [template.name, template.channel, template.category, template.subject || "", template.body]
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [search, templates]);

    const combinedLogs = useMemo(() => {
        const emailItems = emailLogs.map((log) => ({
            id: log.id,
            channel: "email" as const,
            recipient: log.recipient_email,
            subject: log.subject,
            template: log.template_name || "None",
            status: log.status,
            error: log.error_message,
            sentAt: log.sent_at,
            createdAt: log.created_at,
        }));
        const whatsappItems = whatsappLogs.map((log) => ({
            id: log.id,
            channel: "whatsapp" as const,
            recipient: log.recipient_phone,
            subject: log.message_id || "WhatsApp template",
            template: log.template || "Unified template",
            status: log.status,
            error: log.error_message,
            sentAt: log.sent_at,
            createdAt: log.sent_at,
        }));
        return [...emailItems, ...whatsappItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [emailLogs, whatsappLogs]);

    const filteredLogs = useMemo(() => {
        const query = search.trim().toLowerCase();
        return combinedLogs.filter((log) => {
            const channelMatches = logChannelFilter === "all" || log.channel === logChannelFilter;
            const statusMatches = logStatusFilter === "all" || log.status === logStatusFilter;
            const searchMatches = !query || [log.recipient, log.subject, log.template, log.status]
                .some((value) => value.toLowerCase().includes(query));
            return channelMatches && statusMatches && searchMatches;
        });
    }, [combinedLogs, logChannelFilter, logStatusFilter, search]);

    const openCreateModal = () => {
        setModalMode("create");
        setSelectedTemplate(null);
        setForm(emptyTemplateForm);
        setFormError("");
        setModalOpen(true);
    };

    const openEditModal = (template: MessageTemplate) => {
        setModalMode("edit");
        setSelectedTemplate(template);
        setForm(templateToForm(template));
        setFormError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedTemplate(null);
        setForm(emptyTemplateForm);
        setFormError("");
    };

    const submitTemplate = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = formToPayload(form);
        if (!payload.name || !payload.body) {
            setFormError("Template name and body are required.");
            return;
        }
        if (payload.channel === "email" && !payload.subject) {
            setFormError("Email templates need a subject.");
            return;
        }
        if (modalMode === "edit" && selectedTemplate) {
            updateMutation.mutate({ id: selectedTemplate.id, payload });
            return;
        }
        createMutation.mutate(payload);
    };

    const submitTest = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTestResult("");
        if (!testTemplateId || !testClientId) {
            setTestResult("Select a template and client first.");
            return;
        }
        try {
            testMutation.mutate({ id: testTemplateId, context: JSON.parse(testContext) as Record<string, unknown> });
        } catch {
            setTestResult("Context must be valid JSON.");
        }
    };

    const stats = {
        templates: templates.length,
        active: templates.filter((template) => template.is_active).length,
        logs: combinedLogs.length,
        failed: combinedLogs.filter((log) => log.status === "failed").length,
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <MessageCircleIcon className="h-7 w-7 text-indigo-500" />
                        Communications
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Create templates, test sends, and review email or WhatsApp delivery.</p>
                </div>
                <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
                    <PlusIcon className="h-4 w-4" />
                    New Template
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "Templates", value: stats.templates },
                    { label: "Active", value: stats.active },
                    { label: "Log Entries", value: stats.logs },
                    { label: "Failed", value: stats.failed },
                ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="text-xs font-bold uppercase text-zinc-500">{item.label}</div>
                        <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{item.value}</div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
                    {[
                        { value: "templates", label: "Templates" },
                        { value: "test", label: "Test Send" },
                        { value: "logs", label: "Logs" },
                    ].map((tab) => (
                        <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value as PageTab)} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === tab.value ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white" : "text-zinc-500"}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search engagement..." className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white" />
                </div>
            </div>

            {activeTab === "templates" && (
                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <tr>
                                <th className="px-6 py-4">Template</th>
                                <th className="px-6 py-4">Channel</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Variables</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {templatesLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">Loading templates...</td></tr>
                            ) : filteredTemplates.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">No templates found.</td></tr>
                            ) : filteredTemplates.map((template) => (
                                <tr key={template.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                    <td className="min-w-80 px-6 py-4">
                                        <div className="font-semibold text-zinc-900 dark:text-white">{template.name}</div>
                                        <div className="mt-1 line-clamp-2 text-xs text-zinc-500">{template.subject || template.body}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                            {template.channel === "email" ? <MailIcon className="h-3.5 w-3.5" /> : <MessageCircleIcon className="h-3.5 w-3.5" />}
                                            {template.channel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{template.category}</td>
                                    <td className="max-w-64 px-6 py-4 text-xs text-zinc-500">{template.variables.join(", ") || "None"}</td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${template.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                                            {template.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button type="button" onClick={() => openEditModal(template)} className="p-2 text-zinc-500 hover:text-indigo-600" title="Edit template"><EditIcon className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => setTemplateToDelete(template)} className="p-2 text-zinc-500 hover:text-red-600" title="Delete template"><Trash2Icon className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === "test" && (
                <form onSubmit={submitTest} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="grid gap-4 md:grid-cols-2">
                        <SelectField label="Template" value={testTemplateId} onChange={setTestTemplateId} required>
                            <option value="">Select template...</option>
                            {templates.filter((template) => template.is_active && (template.channel === "email" || template.channel === "whatsapp")).map((template) => (
                                <option key={template.id} value={template.id}>{template.name} ({template.channel})</option>
                            ))}
                        </SelectField>
                        <SelectField label="Client" value={testClientId} onChange={setTestClientId} required>
                            <option value="">Select client...</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>{getClientName(client)} ({client.user.email})</option>
                            ))}
                        </SelectField>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-zinc-500">Context JSON</label>
                        <textarea value={testContext} onChange={(event) => setTestContext(event.target.value)} rows={8} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
                    </div>
                    {testResult && <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{testResult}</p>}
                    <button type="submit" disabled={testMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                        {testMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                        Send Test
                    </button>
                </form>
            )}

            {activeTab === "logs" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {(["all", "email", "whatsapp"] as LogChannelFilter[]).map((value) => (
                            <FilterButton key={value} active={logChannelFilter === value} label={value} onClick={() => setLogChannelFilter(value)} />
                        ))}
                        {(["all", "sent", "success", "pending", "failed"] as LogStatusFilter[]).map((value) => (
                            <FilterButton key={value} active={logStatusFilter === value} label={value} onClick={() => setLogStatusFilter(value)} />
                        ))}
                    </div>
                    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                                <tr>
                                    <th className="px-6 py-4">Recipient</th>
                                    <th className="px-6 py-4">Channel</th>
                                    <th className="px-6 py-4">Message</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Sent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {emailLogsLoading || whatsappLogsLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-400">Loading logs...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-400">No logs found.</td></tr>
                                ) : filteredLogs.map((log) => (
                                    <tr key={`${log.channel}-${log.id}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{log.recipient}</td>
                                        <td className="px-6 py-4 uppercase text-zinc-500">{log.channel}</td>
                                        <td className="max-w-md px-6 py-4">
                                            <div className="truncate text-zinc-900 dark:text-white">{log.subject}</div>
                                            <div className="truncate text-xs text-zinc-500">{log.template}</div>
                                            {log.error && <div className="mt-1 truncate text-xs text-red-500">{log.error}</div>}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge value={log.status} /></td>
                                        <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(log.sentAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{modalMode === "edit" ? "Edit Template" : "Create Template"}</h2>
                            <button type="button" onClick={closeModal} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"><XIcon className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={submitTemplate} className="space-y-4 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <TextField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
                                <SelectField label="Channel" value={form.channel} onChange={(value) => setForm({ ...form, channel: value as MessageChannel })}>
                                    <option value="email">Email</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </SelectField>
                                <SelectField label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value as MessageCategory })}>
                                    {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </SelectField>
                                <TextField label="Variables" value={form.variables} onChange={(value) => setForm({ ...form, variables: value })} />
                            </div>
                            {form.channel === "email" && <TextField label="Subject" value={form.subject} onChange={(value) => setForm({ ...form, subject: value })} required />}
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-zinc-500">Body</label>
                                <textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows={8} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
                            </div>
                            <label className="inline-flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" />
                                Active template
                            </label>
                            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
                            <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                                <button type="button" onClick={closeModal} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                    {modalMode === "edit" ? "Save Changes" : "Create Template"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {templateToDelete && (
                <ConfirmDialog
                    title="Delete template"
                    message={`Delete ${templateToDelete.name}? Logs will remain for audit history.`}
                    submitting={deleteMutation.isPending}
                    onCancel={() => setTemplateToDelete(null)}
                    onConfirm={() => deleteMutation.mutate(templateToDelete.id)}
                />
            )}
        </div>
    );
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-bold uppercase text-zinc-500">{label}</label>
            <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
        </div>
    );
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

function StatusBadge({ value }: { value: string }) {
    const success = value === "sent" || value === "success";
    const pending = value === "pending";
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${success ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : pending ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"}`}>
            {success ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <XCircleIcon className="h-3.5 w-3.5" />}
            {value}
        </span>
    );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${active ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
            {label.replace("_", " ")}
        </button>
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
