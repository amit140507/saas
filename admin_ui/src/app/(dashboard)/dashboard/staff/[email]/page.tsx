"use client";

import type { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftIcon, BriefcaseBusinessIcon, CalendarIcon, CheckCircleIcon, EditIcon, ExternalLinkIcon, Loader2Icon, MailIcon, PhoneIcon, SaveIcon, ShieldCheckIcon, Trash2Icon, UserIcon, UsersIcon, XCircleIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { redirect, useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/page";
import { can, PERMISSIONS, useCurrentUserPermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getClients } from "@/services/client.service";
import { activateStaffMember, deactivateStaffMember, deleteStaffMember, getStaffMemberByEmail, updateStaffMember } from "@/services/staff.service";
import type { ClientData } from "@/types/client.type";
import type { StaffMember, StaffUpdatePayload } from "@/types/staff.type";

interface StaffDetailsFormState {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    bio: string;
    specialization: string;
    years_of_experience: string;
    dob: string;
    sex: NonNullable<StaffMember["sex"]>;
    date_of_joining: string;
}

type ApiErrorResponse = {
    detail?: string;
    error?: string;
    email?: string | string[];
    input_email?: string | string[];
    username?: string | string[];
    non_field_errors?: string[];
    user?: {
        email?: string | string[];
        username?: string | string[];
    };
};

function getParamValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value || "";
}

function decodeEmailParam(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function formatDate(value?: string | null) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
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

function splitFullName(fullName: string) {
    const [firstName = "", ...lastNameParts] = fullName.split(" ");

    return {
        firstName,
        lastName: lastNameParts.join(" "),
    };
}

function createStaffDetailsForm(staffMember: StaffMember): StaffDetailsFormState {
    const { firstName, lastName } = splitFullName(staffMember.full_name);

    return {
        first_name: firstName,
        last_name: lastName,
        email: staffMember.email || "",
        phone: staffMember.phone || "",
        bio: staffMember.bio || "",
        specialization: staffMember.specialization || "",
        years_of_experience:
            staffMember.years_of_experience == null ? "" : String(staffMember.years_of_experience),
        dob: staffMember.dob || "",
        sex: staffMember.sex || "",
        date_of_joining: staffMember.date_of_joining || "",
    };
}

function buildStaffUpdatePayload(form: StaffDetailsFormState, staffMember: StaffMember): StaffUpdatePayload {
    return {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        username: form.email,
        phone: form.phone,
        bio: form.bio,
        specialization: form.specialization,
        years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : null,
        dob: form.dob || null,
        sex: form.sex || null,
        date_of_joining: form.date_of_joining || null,
        role_names: staffMember.role_name ? [staffMember.role_name] : undefined,
    };
}

const getFirstError = (value?: string | string[]): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

function getMutationErrorMessage(error: unknown): string {
    const apiError = error as AxiosError<ApiErrorResponse>;
    const data = apiError.response?.data;

    return (
        getFirstError(data?.email) ||
        getFirstError(data?.input_email) ||
        getFirstError(data?.user?.email) ||
        getFirstError(data?.username) ||
        getFirstError(data?.user?.username) ||
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        apiError.message ||
        "Could not update staff details. Please check the fields and try again."
    );
}

function InfoItem({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
            <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
            </div>
        </div>
    );
}

function getClientName(client: ClientData) {
    return `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim() || client.user.email;
}

function getClientProfileHref(client: ClientData) {
    return `/dashboard/clients?search=${encodeURIComponent(client.user.email)}`;
}

function getStaffStatusVariant(status?: StaffMember["status"]) {
    return status === "inactive" ? "neutral" as const : "success" as const;
}

export default function StaffDetailsPage() {
    const queryClient = useQueryClient();
    const params = useParams();
    const router = useRouter();
    const email = decodeEmailParam(getParamValue(params.email));
    const { sessionStatus, userPermissions, permissionsLoading, hasRequiredPermission } =
        useCurrentUserPermissions(PERMISSIONS.STAFF_VIEW);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<StaffDetailsFormState | null>(null);
    const [formError, setFormError] = useState("");
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const { data: staffMember, isLoading, error } = useQuery({
        queryKey: ["staff-profile-by-email", email],
        enabled: hasRequiredPermission && Boolean(email),
        queryFn: () => getStaffMemberByEmail(email),
    });

    const {
        data: clients = [],
        isLoading: clientsLoading,
        error: clientsError,
    } = useQuery({
        queryKey: ["staff-assigned-clients", staffMember?.id],
        enabled: hasRequiredPermission && Boolean(staffMember?.id),
        queryFn: getClients,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: StaffUpdatePayload }) => updateStaffMember(id, payload),
        onSuccess: async (updatedStaffMember) => {
            setIsEditing(false);
            setFormError("");
            await queryClient.invalidateQueries({ queryKey: ["staff-profile-by-email"] });
            await queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
            router.replace(`/dashboard/staff/${encodeURIComponent(updatedStaffMember.email)}`);
        },
        onError: (mutationError: unknown) => setFormError(getMutationErrorMessage(mutationError)),
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, nextStatus }: { id: string; nextStatus: "active" | "inactive" }) => (
            nextStatus === "active" ? activateStaffMember(id) : deactivateStaffMember(id)
        ),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["staff-profile-by-email"] });
            await queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteStaffMember(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
            router.replace("/dashboard/staff");
        },
    });

    const handleStartEdit = () => {
        if (!staffMember) {
            return;
        }

        setForm(createStaffDetailsForm(staffMember));
        setFormError("");
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setForm(null);
        setFormError("");
        setIsEditing(false);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!staffMember || !form) {
            return;
        }

        setFormError("");
        updateMutation.mutate({
            id: staffMember.id,
            payload: buildStaffUpdatePayload(form, staffMember),
        });
    };

    const handleToggleStatus = () => {
        if (!staffMember) {
            return;
        }

        statusMutation.mutate({
            id: staffMember.id,
            nextStatus: staffMember.status === "inactive" ? "active" : "inactive",
        });
    };

    const handleDelete = () => {
        if (!staffMember) {
            return;
        }

        deleteMutation.mutate(staffMember.id);
    };

    if (sessionStatus === "loading" || permissionsLoading || (hasRequiredPermission && isLoading)) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!can(userPermissions, PERMISSIONS.STAFF_VIEW)) {
        redirect("/dashboard");
    }

    if (error) {
        return (
            <PageShell>
                <Card>
                    <CardContent className="py-10 text-center text-sm text-destructive">
                        Error loading staff details. Please try again.
                    </CardContent>
                </Card>
            </PageShell>
        );
    }

    if (!staffMember) {
        return (
            <PageShell>
                <PageHeader
                    title="Staff Details"
                    description="The requested staff member could not be found."
                    icon={ShieldCheckIcon}
                    actions={(
                        <Link href="/dashboard/staff" className={buttonVariants({ variant: "outline" })}>
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back to Staff
                        </Link>
                    )}
                />
                <Card>
                    <EmptyState
                        icon={UserIcon}
                        title="Staff member not found"
                        description="Check the email in the URL or return to the staff list."
                    />
                </Card>
            </PageShell>
        );
    }

    const initials = staffMember.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
    const assignedClients = clients.filter((client) => client.assigned_trainer === staffMember.id);

    return (
        <PageShell>
            <PageHeader
                title="Staff Details"
                description="View and update team member profile, role, and contact details."
                icon={ShieldCheckIcon}
                actions={(
                    <>
                        <Link href="/dashboard/staff" className={buttonVariants({ variant: "outline" })}>
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back to Staff
                        </Link>
                        {!isEditing && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleToggleStatus}
                                    disabled={statusMutation.isPending}
                                >
                                    {statusMutation.isPending ? (
                                        <Loader2Icon className="h-4 w-4 animate-spin" />
                                    ) : staffMember.status === "inactive" ? (
                                        <CheckCircleIcon className="h-4 w-4" />
                                    ) : (
                                        <XCircleIcon className="h-4 w-4" />
                                    )}
                                    {staffMember.status === "inactive" ? "Make Active" : "Make Inactive"}
                                </Button>
                                <Button onClick={handleStartEdit}>
                                    <EditIcon className="h-4 w-4" />
                                    Edit Details
                                </Button>
                                <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
                                    <Trash2Icon className="h-4 w-4" />
                                    Delete
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
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-semibold text-primary">
                                {initials || <UserIcon className="h-7 w-7" />}
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate text-2xl font-semibold text-foreground">{staffMember.full_name}</h2>
                                <p className="mt-1 truncate text-sm text-muted-foreground">{staffMember.email}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {staffMember.role_name && <Badge className="w-fit capitalize">{staffMember.role_name}</Badge>}
                            <Badge variant={getStaffStatusVariant(staffMember.status)} className="w-fit capitalize">
                                {staffMember.status || "active"}
                            </Badge>
                        </div>
                    </div>

                    {isEditing && form ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {formError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    {formError}
                                </div>
                            )}

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

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Specialization</span>
                                    <input
                                        type="text"
                                        value={form.specialization}
                                        onChange={(event) => setForm({ ...form, specialization: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Years of Experience</span>
                                    <input
                                        min="0"
                                        type="number"
                                        value={form.years_of_experience}
                                        onChange={(event) => setForm({ ...form, years_of_experience: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
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
                                    <span>Date of Birth</span>
                                    <input
                                        type="date"
                                        value={form.dob}
                                        onChange={(event) => setForm({ ...form, dob: event.target.value })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-foreground">
                                    <span>Sex</span>
                                    <select
                                        value={form.sex}
                                        onChange={(event) => setForm({ ...form, sex: event.target.value as StaffDetailsFormState["sex"] })}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                    >
                                        <option value="">Select sex</option>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </label>
                            </div>

                            <label className="block space-y-1.5 text-sm font-medium text-foreground">
                                <span>Bio</span>
                                <textarea
                                    rows={5}
                                    value={form.bio}
                                    onChange={(event) => setForm({ ...form, bio: event.target.value })}
                                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                                />
                            </label>

                            <div className="flex justify-end gap-3 border-t border-border pt-5">
                                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                                    <XIcon className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? (
                                        <Loader2Icon className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <SaveIcon className="h-4 w-4" />
                                    )}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <InfoItem icon={UserIcon} label="Staff ID" value={staffMember.public_id || "-"} />
                                <InfoItem icon={MailIcon} label="Email" value={staffMember.email || "-"} />
                                <InfoItem icon={PhoneIcon} label="Phone" value={staffMember.phone || "-"} />
                                <InfoItem icon={ShieldCheckIcon} label="Status" value={staffMember.status || "active"} />
                                <InfoItem icon={BriefcaseBusinessIcon} label="Specialization" value={staffMember.specialization || "-"} />
                                <InfoItem icon={CalendarIcon} label="Date of Joining" value={formatDate(staffMember.date_of_joining)} />
                                <InfoItem icon={CalendarIcon} label="Date of Birth" value={formatDate(staffMember.dob)} />
                                <InfoItem icon={UserIcon} label="Sex" value={getSexLabel(staffMember.sex)} />
                                <InfoItem
                                    icon={BriefcaseBusinessIcon}
                                    label="Experience"
                                    value={
                                        staffMember.years_of_experience == null
                                            ? "-"
                                            : `${staffMember.years_of_experience} year${staffMember.years_of_experience === 1 ? "" : "s"}`
                                    }
                                />
                                <InfoItem icon={UserIcon} label="Clients Assigned" value={staffMember.client_count ?? 0} />
                            </div>

                            <div className={cn("rounded-lg border border-border bg-background p-4", !staffMember.bio && "text-muted-foreground")}>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Bio</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{staffMember.bio || "No bio added yet."}</p>
                            </div>

                            <div className="rounded-lg border border-border bg-background">
                                <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                            <UsersIcon className="h-4 w-4 text-primary" />
                                            Assigned Clients
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Clients currently assigned to this staff member.
                                        </p>
                                    </div>
                                    <Badge variant="neutral">{assignedClients.length}</Badge>
                                </div>

                                {clientsLoading ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : clientsError ? (
                                    <div className="p-6 text-center text-sm text-destructive">
                                        Error loading assigned clients. Please try again.
                                    </div>
                                ) : assignedClients.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        No clients assigned yet.
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden overflow-x-auto md:block">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                                                        <th className="px-4 py-3">Public ID</th>
                                                        <th className="px-4 py-3">Name</th>
                                                        <th className="px-4 py-3">Email</th>
                                                        <th className="px-4 py-3 text-right">Profile</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {assignedClients.map((client) => (
                                                        <tr key={client.id} className="transition-colors hover:bg-muted/30">
                                                            <td className="px-4 py-3 font-mono text-muted-foreground">
                                                                {client.user.public_id || "-"}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-foreground">
                                                                {getClientName(client)}
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                {client.user.email}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <Link
                                                                    href={getClientProfileHref(client)}
                                                                    className={buttonVariants({ variant: "outline", size: "sm" })}
                                                                >
                                                                    <ExternalLinkIcon className="h-4 w-4" />
                                                                    View Profile
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="grid gap-3 p-4 md:hidden">
                                            {assignedClients.map((client) => (
                                                <div key={client.id} className="rounded-lg border border-border p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-foreground">{getClientName(client)}</p>
                                                            <p className="mt-1 truncate text-sm text-muted-foreground">{client.user.email}</p>
                                                        </div>
                                                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                                            {client.user.public_id || "-"}
                                                        </span>
                                                    </div>
                                                    <Link
                                                        href={getClientProfileHref(client)}
                                                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}
                                                    >
                                                        <ExternalLinkIcon className="h-4 w-4" />
                                                        View Profile
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                                <Trash2Icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Delete Staff Member?</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Are you sure you want to remove <span className="font-semibold text-foreground">{staffMember.full_name}</span>? This action cannot be undone.
                            </p>
                            <div className="mt-6 flex w-full gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsDeleteConfirmOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={deleteMutation.isPending}
                                    onClick={handleDelete}
                                >
                                    {deleteMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
}
