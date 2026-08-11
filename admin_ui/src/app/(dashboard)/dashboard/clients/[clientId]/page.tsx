"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeftIcon,
    EyeIcon,
    Loader2Icon,
    MailIcon,
    PhoneIcon,
    ReceiptTextIcon,
    SaveIcon,
    ShieldOffIcon,
    Trash2Icon,
    UserIcon,
    UserRoundCheckIcon,
    UsersIcon,
    XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { activateClient, deactivateClient, getClient, updateClient } from "@/services/client.service";
import { getOrdersByClient } from "@/services/order.service";
import { getStaffMembers } from "@/services/staff.service";
import { getMembershipsByClient } from "@/services/subscription.service";
import type { ClientData, ClientPayload } from "@/types/client.type";
import type { Order } from "@/types/order.type";
import type { StaffMember } from "@/types/staff.type";

type ClientFormState = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    status: string;
    goal: string;
    dob: string;
    sex: NonNullable<ClientData["sex"]>;
    date_of_joining: string;
    referral_source: string;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

function formatDate(value?: string | null) {
    if (!value) {
        return "-";
    }

    return dateFormatter.format(new Date(value));
}

function formatDateTime(value?: string | null) {
    if (!value) {
        return "-";
    }

    return dateTimeFormatter.format(new Date(value));
}

function toCurrency(value?: string | null) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

function getClientName(client?: ClientData | null) {
    if (!client) {
        return "Client";
    }

    return `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim() || client.user.email || "Unnamed client";
}

function getInitials(client?: ClientData | null) {
    return getClientName(client)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function getSexLabel(value?: string | null) {
    if (value === "M") {
        return "Male";
    }

    if (value === "F") {
        return "Female";
    }

    if (value === "O") {
        return "Other";
    }

    return "-";
}

function getStatusVariant(status?: string | null) {
    if (status === "active") {
        return "success" as const;
    }

    if (status === "lead") {
        return "warning" as const;
    }

    return "neutral" as const;
}

function createClientForm(client: ClientData): ClientFormState {
    return {
        first_name: client.user.first_name || "",
        last_name: client.user.last_name || "",
        email: client.user.email || "",
        phone: client.phone || "",
        status: client.status || "active",
        goal: client.goal || "",
        dob: client.dob || "",
        sex: client.sex || "",
        date_of_joining: client.date_of_joining || "",
        referral_source: client.referral_source || "",
    };
}

function buildClientPayload(client: ClientData, overrides: Partial<ClientPayload> = {}): ClientPayload {
    return {
        user: {
            first_name: client.user.first_name || "",
            last_name: client.user.last_name || "",
            email: client.user.email || "",
        },
        assigned_trainer: client.assigned_trainer || null,
        phone: client.phone || "",
        status: client.status || "active",
        goal: client.goal || "",
        dob: client.dob || null,
        sex: client.sex || null,
        date_of_joining: client.date_of_joining || null,
        referral_source: client.referral_source || "",
        ...overrides,
    };
}

function buildClientPayloadFromForm(client: ClientData, form: ClientFormState): ClientPayload {
    return buildClientPayload(client, {
        user: {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
        },
        phone: form.phone,
        status: form.status,
        goal: form.goal || null,
        dob: form.dob || null,
        sex: form.sex || null,
        date_of_joining: form.date_of_joining || null,
        referral_source: form.referral_source || "",
    });
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
            <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
        </div>
    );
}

function SectionTitle({ icon: Icon, title, description }: {
    icon: typeof UserIcon;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

export default function ClientDetailsPage() {
    const params = useParams<{ clientId: string }>();
    const clientId = params.clientId;
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<ClientFormState | null>(null);
    const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const clientQuery = useQuery({
        queryKey: ["client-detail", clientId],
        queryFn: () => getClient(clientId),
        enabled: Boolean(clientId),
    });

    const staffQuery = useQuery({
        queryKey: ["client-detail-staff"],
        queryFn: getStaffMembers,
    });

    const ordersQuery = useQuery({
        queryKey: ["client-orders", clientId],
        queryFn: () => getOrdersByClient(clientId),
        enabled: Boolean(clientId),
    });

    const membershipsQuery = useQuery({
        queryKey: ["client-memberships", clientId],
        queryFn: () => getMembershipsByClient(clientId),
        enabled: Boolean(clientId),
    });

    const client = clientQuery.data;
    const staffMembers = useMemo(() => staffQuery.data || [], [staffQuery.data]);
    const assignedTrainer = useMemo(
        () => staffMembers.find((member) => member.id === client?.assigned_trainer) || null,
        [client?.assigned_trainer, staffMembers],
    );

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ClientPayload }) => updateClient(id, payload),
        onSuccess: async () => {
            setIsEditing(false);
            setForm(null);
            setSelectedTrainerId(null);
            await queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
            await queryClient.invalidateQueries({ queryKey: ["clients-management"] });
        },
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, nextStatus }: { id: string; nextStatus: "active" | "inactive" }) => (
            nextStatus === "active" ? activateClient(id) : deactivateClient(id)
        ),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
            await queryClient.invalidateQueries({ queryKey: ["clients-management"] });
        },
    });

    const handleStartEdit = () => {
        if (!client) {
            return;
        }

        setForm(createClientForm(client));
        setIsEditing(true);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!client || !form) {
            return;
        }

        updateMutation.mutate({ id: client.id, payload: buildClientPayloadFromForm(client, form) });
    };

    const handleTrainerChange = () => {
        if (!client) {
            return;
        }

        updateMutation.mutate({
            id: client.id,
            payload: buildClientPayload(client, { assigned_trainer: selectedTrainerId || null }),
        });
    };

    const handleToggleStatus = () => {
        if (!client) {
            return;
        }

        statusMutation.mutate({
            id: client.id,
            nextStatus: client.status === "inactive" ? "active" : "inactive",
        });
    };

    const handleSoftDelete = () => {
        if (!client) {
            return;
        }

        statusMutation.mutate({ id: client.id, nextStatus: "inactive" });
    };

    if (clientQuery.isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (clientQuery.error || !client) {
        return (
            <PageShell>
                <PageHeader
                    title="Client Details"
                    description="The requested client could not be loaded."
                    icon={UsersIcon}
                    actions={(
                        <Link href="/dashboard/clients" className={buttonVariants({ variant: "outline" })}>
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back to Clients
                        </Link>
                    )}
                />
                <Card>
                    <CardContent className="py-10 text-center text-sm text-destructive">
                        Error loading client details. Please try again.
                    </CardContent>
                </Card>
            </PageShell>
        );
    }

    const orders = ordersQuery.data || [];
    const memberships = membershipsQuery.data || [];
    const trainerSelectValue = selectedTrainerId ?? client.assigned_trainer ?? "";
    const isSavingTrainer = updateMutation.isPending && !isEditing;

    return (
        <PageShell>
            <PageHeader
                title={getClientName(client)}
                description="Manage profile, trainer assignment, orders, and subscriptions."
                icon={UsersIcon}
                actions={(
                    <>
                        <Link href="/dashboard/clients" className={buttonVariants({ variant: "outline" })}>
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back
                        </Link>
                        {!isEditing && (
                            <>
                                <Button variant="outline" onClick={handleStartEdit}>
                                    <UserIcon className="h-4 w-4" />
                                    Edit Details
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleToggleStatus}
                                    disabled={statusMutation.isPending}
                                >
                                    {statusMutation.isPending ? (
                                        <Loader2Icon className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ShieldOffIcon className="h-4 w-4" />
                                    )}
                                    {client.status === "inactive" ? "Make Active" : "Make Inactive"}
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleSoftDelete}
                                    disabled={statusMutation.isPending || client.status === "inactive"}
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                    Soft Delete
                                </Button>
                            </>
                        )}
                    </>
                )}
            />

            <Card>
                <CardContent className="space-y-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            {client.profile_picture ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={client.profile_picture}
                                    alt={getClientName(client)}
                                    className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover"
                                />
                            ) : (
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl font-semibold text-primary">
                                    {getInitials(client) || <UserIcon className="h-8 w-8" />}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="truncate text-2xl font-semibold text-foreground">{getClientName(client)}</h1>
                                    <Badge variant={getStatusVariant(client.status)} className="capitalize">
                                        {client.status || "active"}
                                    </Badge>
                                </div>
                                <p className="mt-1 truncate text-sm text-muted-foreground">{client.user.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-6">
                        <SectionTitle
                            icon={UserIcon}
                            title="Profile"
                            description="Identity, contact, and membership profile information from the client record."
                        />
                    </div>

                    {isEditing && form ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>First Name</span>
                                    <input
                                        required
                                        type="text"
                                        value={form.first_name}
                                        onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Last Name</span>
                                    <input
                                        required
                                        type="text"
                                        value={form.last_name}
                                        onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Email</span>
                                    <input
                                        required
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Phone</span>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Status</span>
                                    <select
                                        value={form.status}
                                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    >
                                        <option value="active">Active</option>
                                        <option value="lead">Lead</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Sex</span>
                                    <select
                                        value={form.sex}
                                        onChange={(event) => setForm({ ...form, sex: event.target.value as ClientFormState["sex"] })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    >
                                        <option value="">Select sex</option>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Date of Birth</span>
                                    <input
                                        type="date"
                                        value={form.dob}
                                        onChange={(event) => setForm({ ...form, dob: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Date of Joining</span>
                                    <input
                                        type="date"
                                        value={form.date_of_joining}
                                        onChange={(event) => setForm({ ...form, date_of_joining: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Referral Source</span>
                                    <input
                                        type="text"
                                        value={form.referral_source}
                                        onChange={(event) => setForm({ ...form, referral_source: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                            </div>
                            <label className="block space-y-1.5 text-sm font-medium text-foreground">
                                <span>Goal</span>
                                <input
                                    type="text"
                                    value={form.goal}
                                    onChange={(event) => setForm({ ...form, goal: event.target.value })}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                />
                            </label>
                            <div className="flex justify-end gap-3 border-t border-border pt-5">
                                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setForm(null); }}>
                                    <XIcon className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <InfoItem label="Client ID" value={client.id} />
                            <InfoItem label="Public ID" value={client.user.public_id || "-"} />
                            <InfoItem label="User ID" value={client.user.id || "-"} />
                            <InfoItem label="Email" value={<span className="inline-flex items-center gap-2"><MailIcon className="h-4 w-4 text-muted-foreground" />{client.user.email || "-"}</span>} />
                            <InfoItem label="Phone Number" value={<span className="inline-flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-muted-foreground" />{client.phone || "-"}</span>} />
                            <InfoItem label="Sex" value={getSexLabel(client.sex)} />
                            <InfoItem label="Date of Birth" value={formatDate(client.dob)} />
                            <InfoItem label="Date of Joining" value={formatDate(client.date_of_joining)} />
                            <InfoItem label="Goal" value={client.goal || "-"} />
                            <InfoItem label="Referral Source" value={client.referral_source || "-"} />
                            <InfoItem label="Joined At" value={formatDateTime(client.joined_at)} />
                            <InfoItem label="Activated At" value={formatDateTime(client.activated_at)} />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-5">
                    <SectionTitle
                        icon={UserRoundCheckIcon}
                        title="Assigned Trainer"
                        description="Review the current trainer and reassign the client when needed."
                    />
                    {staffQuery.isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : staffQuery.error ? (
                        <div className="rounded-lg border border-border p-6 text-center text-sm text-destructive">
                            Error loading trainers. Please try again.
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <InfoItem label="Trainer Name" value={assignedTrainer?.full_name || "No trainer assigned"} />
                                <InfoItem label="Email" value={assignedTrainer?.email || "-"} />
                                <InfoItem label="Phone" value={assignedTrainer?.phone || "-"} />
                                <InfoItem label="Specialization" value={assignedTrainer?.specialization || "-"} />
                            </div>
                            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end">
                                <label className="flex-1 space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Change Trainer</span>
                                    <select
                                        value={trainerSelectValue}
                                        onChange={(event) => setSelectedTrainerId(event.target.value)}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    >
                                        <option value="">Unassigned</option>
                                        {staffMembers.map((member: StaffMember) => (
                                            <option key={member.id} value={member.id}>
                                                {member.full_name || member.email}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <Button
                                    type="button"
                                    onClick={handleTrainerChange}
                                    disabled={isSavingTrainer || selectedTrainerId === null || trainerSelectValue === (client.assigned_trainer || "")}
                                >
                                    {isSavingTrainer ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                                    Save Trainer
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-5">
                    <SectionTitle
                        icon={ReceiptTextIcon}
                        title="Orders and Subscriptions"
                        description="Purchases, billing totals, and active or historical membership records for this client."
                    />

                    <div className="rounded-lg border border-border">
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-semibold text-foreground">Orders</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"} found</p>
                            </div>
                        </CardHeader>
                        {ordersQuery.isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : ordersQuery.error ? (
                            <div className="p-6 text-center text-sm text-destructive">Error loading orders.</div>
                        ) : orders.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">No orders found for this client.</div>
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                                                <th className="px-4 py-3">Order Number</th>
                                                <th className="px-4 py-3">Order Date</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Payment</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                                <th className="px-4 py-3 text-right">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {orders.map((order) => (
                                                <tr key={order.id} className="transition-colors hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-semibold text-foreground">{order.order_number}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(order.created_at)}</td>
                                                    <td className="px-4 py-3"><Badge variant={getStatusVariant(order.status)} className="capitalize">{order.status}</Badge></td>
                                                    <td className="px-4 py-3 capitalize text-muted-foreground">{order.payment_method.replaceAll("_", " ")}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-foreground">{toCurrency(order.total_amount)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                                                            <EyeIcon className="h-4 w-4" />
                                                            View Order Details
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="grid gap-3 p-4 md:hidden">
                                    {orders.map((order) => (
                                        <div key={order.id} className="rounded-lg border border-border p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-foreground">{order.order_number}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
                                                </div>
                                                <Badge variant={getStatusVariant(order.status)} className="capitalize">{order.status}</Badge>
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                                <InfoItem label="Payment" value={order.payment_method.replaceAll("_", " ")} />
                                                <InfoItem label="Total" value={toCurrency(order.total_amount)} />
                                            </div>
                                            <Button variant="outline" className="mt-4 w-full" onClick={() => setSelectedOrder(order)}>
                                                <EyeIcon className="h-4 w-4" />
                                                View Order Details
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="rounded-lg border border-border">
                        <CardHeader>
                            <h3 className="font-semibold text-foreground">Subscriptions</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{memberships.length} subscription{memberships.length === 1 ? "" : "s"} found</p>
                        </CardHeader>
                        {membershipsQuery.isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : membershipsQuery.error ? (
                            <div className="p-6 text-center text-sm text-destructive">Error loading subscriptions.</div>
                        ) : memberships.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">No subscriptions found for this client.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                                            <th className="px-4 py-3">Plan</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Start Date</th>
                                            <th className="px-4 py-3">End Date</th>
                                            <th className="px-4 py-3">Order</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {memberships.map((membership) => (
                                            <tr key={membership.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium text-foreground">{membership.plan_details?.name || membership.plan}</td>
                                                <td className="px-4 py-3"><Badge variant={getStatusVariant(membership.status)} className="capitalize">{membership.status}</Badge></td>
                                                <td className="px-4 py-3 text-muted-foreground">{formatDate(membership.start_date)}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{formatDate(membership.extended_end_date || membership.base_end_date)}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{membership.order || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Order {selectedOrder.order_number}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(selectedOrder.created_at)}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} title="Close">
                                <XIcon className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="max-h-[calc(90vh-5rem)] space-y-5 overflow-y-auto p-5">
                            <div className="grid gap-4 md:grid-cols-3">
                                <InfoItem label="Status" value={<Badge variant={getStatusVariant(selectedOrder.status)} className="capitalize">{selectedOrder.status}</Badge>} />
                                <InfoItem label="Payment Method" value={selectedOrder.payment_method.replaceAll("_", " ")} />
                                <InfoItem label="Item Count" value={selectedOrder.items.length} />
                                <InfoItem label="Subtotal" value={toCurrency(selectedOrder.subtotal)} />
                                <InfoItem label="Discount" value={toCurrency(selectedOrder.discount_amount)} />
                                <InfoItem label="Tax" value={toCurrency(selectedOrder.tax_amount)} />
                                <InfoItem label="Total" value={toCurrency(selectedOrder.total_amount)} />
                                <InfoItem label="Coupon" value={selectedOrder.coupon || "-"} />
                                <InfoItem label="Created By" value={selectedOrder.created_by || "-"} />
                            </div>
                            <div className="rounded-lg border border-border">
                                <div className="border-b border-border p-4">
                                    <h3 className="font-semibold text-foreground">Line Items</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                                                <th className="px-4 py-3">Product</th>
                                                <th className="px-4 py-3">Quantity</th>
                                                <th className="px-4 py-3 text-right">Unit Price</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {selectedOrder.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.product || "-"}</td>
                                                    <td className="px-4 py-3">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right">{toCurrency(item.unit_price)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-foreground">{toCurrency(item.total_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className={cn("rounded-lg border border-border bg-background p-4", !selectedOrder.notes && "text-muted-foreground")}>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selectedOrder.notes || "No notes added."}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
}
