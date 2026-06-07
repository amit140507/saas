"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    BadgeCheckIcon,
    CalendarIcon,
    EditIcon,
    LayersIcon,
    Loader2Icon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
    UserIcon,
    XIcon,
} from "lucide-react";

import { getClients } from "@/services/client.service";
import { getOrders } from "@/services/order.service";
import { getPackages } from "@/services/package.service";
import {
    createMembership,
    deleteMembership,
    getMemberships,
    updateMembership,
} from "@/services/subscription.service";
import type { ClientData } from "@/types/client.type";
import type { Order } from "@/types/order.type";
import type { Package } from "@/types/package.type";
import type {
    Membership,
    MembershipPayload,
    MembershipStatus,
} from "@/types/subscription.type";

type ModalMode = "create" | "edit";

type MembershipForm = {
    client: string;
    plan: string;
    order: string;
    start_date: string;
    status: MembershipStatus;
    notes: string;
};

const statusStyles: Record<MembershipStatus, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    expired: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    frozen: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

function today() {
    return new Date().toISOString().slice(0, 10);
}

function emptyMembershipForm(): MembershipForm {
    return {
        client: "",
        plan: "",
        order: "",
        start_date: today(),
        status: "active",
        notes: "",
    };
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getClientName(client?: ClientData) {
    if (!client) {
        return "Unknown client";
    }

    const fullName = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
    return fullName || client.user.email || "Unnamed client";
}

function flattenPlans(packages: Package[]) {
    return packages.flatMap((packageItem) =>
        packageItem.plans.map((plan) => ({
            ...plan,
            packageName: packageItem.name,
            packageActive: packageItem.is_active,
        }))
    );
}

function membershipToForm(membership: Membership): MembershipForm {
    return {
        client: membership.client,
        plan: membership.plan,
        order: membership.order || "",
        start_date: membership.start_date,
        status: membership.status,
        notes: membership.notes || "",
    };
}

function getErrorMessage(error: unknown, fallback: string) {
    const data = (error as { response?: { data?: { error?: string; detail?: string } } }).response?.data;
    return data?.error || data?.detail || fallback;
}

export default function SubscriptionsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [membershipModalOpen, setMembershipModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
    const [membershipToDelete, setMembershipToDelete] = useState<Membership | null>(null);
    const [membershipForm, setMembershipForm] = useState<MembershipForm>(emptyMembershipForm);
    const [formError, setFormError] = useState("");

    const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
        queryKey: ["admin-memberships"],
        queryFn: getMemberships,
    });

    const { data: clients = [] } = useQuery({
        queryKey: ["admin-subscription-clients"],
        queryFn: getClients,
    });

    const { data: packages = [] } = useQuery({
        queryKey: ["admin-subscription-packages"],
        queryFn: getPackages,
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["admin-subscription-orders"],
        queryFn: getOrders,
    });

    const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
    const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
    const plans = useMemo(() => flattenPlans(packages), [packages]);
    const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
    const activePlans = useMemo(() => {
        return plans.filter((plan) => (plan.packageActive && plan.is_active) || plan.id === membershipForm.plan);
    }, [membershipForm.plan, plans]);

    const filteredMemberships = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return memberships;
        }

        return memberships.filter((membership) => {
            const client = clientById.get(membership.client);
            const plan = planById.get(membership.plan);
            return (
                getClientName(client).toLowerCase().includes(query) ||
                (client?.user.email || "").toLowerCase().includes(query) ||
                (plan?.name || "").toLowerCase().includes(query) ||
                (plan?.packageName || "").toLowerCase().includes(query) ||
                membership.status.includes(query)
            );
        });
    }, [clientById, memberships, planById, search]);

    const refreshMemberships = () => queryClient.invalidateQueries({ queryKey: ["admin-memberships"] });

    const createMembershipMutation = useMutation({
        mutationFn: createMembership,
        onSuccess: () => {
            refreshMemberships();
            closeMembershipModal();
        },
        onError: (error: unknown) => setFormError(getErrorMessage(error, "Could not create membership.")),
    });

    const updateMembershipMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: MembershipPayload }) => updateMembership(id, payload),
        onSuccess: () => {
            refreshMemberships();
            closeMembershipModal();
        },
        onError: (error: unknown) => setFormError(getErrorMessage(error, "Could not update membership.")),
    });

    const deleteMembershipMutation = useMutation({
        mutationFn: deleteMembership,
        onSuccess: () => {
            refreshMemberships();
            setMembershipToDelete(null);
        },
    });

    const openCreateMembership = () => {
        setModalMode("create");
        setSelectedMembership(null);
        setMembershipForm(emptyMembershipForm());
        setFormError("");
        setMembershipModalOpen(true);
    };

    const openEditMembership = (membership: Membership) => {
        setModalMode("edit");
        setSelectedMembership(membership);
        setMembershipForm(membershipToForm(membership));
        setFormError("");
        setMembershipModalOpen(true);
    };

    const closeMembershipModal = () => {
        setMembershipModalOpen(false);
        setSelectedMembership(null);
        setMembershipForm(emptyMembershipForm());
        setFormError("");
    };

    const submitMembership = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");

        if (!membershipForm.client || !membershipForm.plan || !membershipForm.start_date) {
            setFormError("Client, plan, and start date are required.");
            return;
        }

        const payload: MembershipPayload = {
            client: membershipForm.client,
            plan: membershipForm.plan,
            order: membershipForm.order || null,
            start_date: membershipForm.start_date,
            status: membershipForm.status,
            notes: membershipForm.notes,
        };

        if (modalMode === "edit" && selectedMembership) {
            updateMembershipMutation.mutate({ id: selectedMembership.id, payload });
            return;
        }

        createMembershipMutation.mutate(payload);
    };

    const membershipSubmitting = createMembershipMutation.isPending || updateMembershipMutation.isPending;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <BadgeCheckIcon className="w-7 h-7 text-indigo-500" />
                        Subscriptions
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage tenant memberships.</p>
                </div>
                <button
                    onClick={openCreateMembership}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Membership
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                <div className="relative w-full md:w-80">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search subscriptions..."
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-zinc-900 dark:text-white text-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                            <tr>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4">Order</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {membershipsLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">Loading memberships...</td></tr>
                            ) : filteredMemberships.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">No memberships found.</td></tr>
                            ) : (
                                filteredMemberships.map((membership) => {
                                    const client = clientById.get(membership.client);
                                    const plan = planById.get(membership.plan);
                                    const order = membership.order ? orderById.get(membership.order) : undefined;
                                    return (
                                        <tr key={membership.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-zinc-900 dark:text-white">{getClientName(client)}</div>
                                                <div className="text-xs text-zinc-500">{client?.user.email || membership.client}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-zinc-900 dark:text-white">{plan?.packageName || "Package"}</div>
                                                <div className="text-xs text-zinc-500">{plan?.name || membership.plan}</div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                                                <div className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {formatDate(membership.start_date)}</div>
                                                <div className="text-xs text-zinc-500">Ends {formatDate(membership.extended_end_date)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                                {order?.order_number || membership.order || "No order"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusStyles[membership.status]}`}>
                                                    {membership.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex gap-2">
                                                    <button onClick={() => openEditMembership(membership)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium inline-flex items-center gap-1">
                                                        <EditIcon className="w-4 h-4" /> Edit
                                                    </button>
                                                    <button onClick={() => setMembershipToDelete(membership)} className="text-red-600 dark:text-red-400 hover:text-red-500 font-medium inline-flex items-center gap-1">
                                                        <Trash2Icon className="w-4 h-4" /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {membershipModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden">
                        <ModalHeader title={modalMode === "edit" ? "Edit Membership" : "Add Membership"} onClose={closeMembershipModal} />
                        <form onSubmit={submitMembership} className="p-5 space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <SelectField label="Client" icon={UserIcon} value={membershipForm.client} onChange={(value) => setMembershipForm({ ...membershipForm, client: value })} required>
                                    <option value="">Select client...</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>{getClientName(client)} ({client.user.email})</option>
                                    ))}
                                </SelectField>
                                <SelectField label="Plan" icon={LayersIcon} value={membershipForm.plan} onChange={(value) => setMembershipForm({ ...membershipForm, plan: value })} required>
                                    <option value="">Select plan...</option>
                                    {activePlans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>{plan.packageName} - {plan.name}</option>
                                    ))}
                                </SelectField>
                                <SelectField label="Order" value={membershipForm.order} onChange={(value) => setMembershipForm({ ...membershipForm, order: value })}>
                                    <option value="">No linked order</option>
                                    {orders.map((order: Order) => (
                                        <option key={order.id} value={order.id}>{order.order_number} - {order.total_amount}</option>
                                    ))}
                                </SelectField>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={membershipForm.start_date}
                                        onChange={(event) => setMembershipForm({ ...membershipForm, start_date: event.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <SelectField label="Status" value={membershipForm.status} onChange={(value) => setMembershipForm({ ...membershipForm, status: value as MembershipStatus })}>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="frozen">Frozen</option>
                                    <option value="expired">Expired</option>
                                    <option value="cancelled">Cancelled</option>
                                </SelectField>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Notes</label>
                                <textarea
                                    rows={3}
                                    value={membershipForm.notes}
                                    onChange={(event) => setMembershipForm({ ...membershipForm, notes: event.target.value })}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none resize-none text-zinc-900 dark:text-white"
                                />
                            </div>
                            <FormActions error={formError} submitting={membershipSubmitting} submitLabel={modalMode === "edit" ? "Save Changes" : "Create Membership"} onCancel={closeMembershipModal} />
                        </form>
                    </div>
                </div>
            )}

            {membershipToDelete && (
                <ConfirmDialog
                    title="Delete membership"
                    message={`This will delete the membership for ${getClientName(clientById.get(membershipToDelete.client))}.`}
                    onCancel={() => setMembershipToDelete(null)}
                    onConfirm={() => deleteMembershipMutation.mutate(membershipToDelete.id)}
                    submitting={deleteMembershipMutation.isPending}
                />
            )}

        </div>
    );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
            <button onClick={onClose} type="button" className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800">
                <XIcon className="w-5 h-5" />
            </button>
        </div>
    );
}

function SelectField({
    label,
    icon: Icon,
    value,
    onChange,
    required,
    children,
}: {
    label: string;
    icon?: typeof UserIcon;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                {Icon && <Icon className="w-3 h-3 inline mr-1" />}
                {label}
            </label>
            <select
                required={required}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
            >
                {children}
            </select>
        </div>
    );
}

function FormActions({
    error,
    submitting,
    submitLabel,
    onCancel,
}: {
    error: string;
    submitting: boolean;
    submitLabel: string;
    onCancel: () => void;
}) {
    return (
        <>
            {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
            <div className="pt-2 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={onCancel} className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                    Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {submitting && <Loader2Icon className="w-4 h-4 animate-spin" />}
                    {submitLabel}
                </button>
            </div>
        </>
    );
}

function ConfirmDialog({
    title,
    message,
    onCancel,
    onConfirm,
    submitting,
}: {
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    submitting: boolean;
}) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-lg w-full max-w-md p-5 shadow-2xl space-y-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} type="button" className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                        Cancel
                    </button>
                    <button onClick={onConfirm} type="button" disabled={submitting} className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                        {submitting && <Loader2Icon className="w-4 h-4 animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
