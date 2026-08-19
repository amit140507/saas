"use client";

import type { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { can, PERMISSIONS, useCurrentUserPermissions } from "@/lib/permissions";
import { ShieldCheckIcon, SearchIcon, PlusIcon, EditIcon, Trash2Icon, Loader2Icon, EyeIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/page";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";

interface StaffMember {
    id: string;
    user_id: string;
    public_id: string;
    username: string;
    full_name: string;
    email: string;
    role_name: string | null;
    status?: "active" | "inactive";
    phone: string;
    date_of_joining?: string;
    dob?: string | null;
    sex?: StaffSex | null;
    profile_picture?: string | null;
    bio: string;
    specialization: string;
    years_of_experience?: number | null;
}

type StaffListResponse = StaffMember[] | { results?: StaffMember[]; data?: StaffMember[] };

const STAFF_ENDPOINT = "staff/staff/";
const DEFAULT_ROLE_NAME = "trainer";

type StaffSex = "M" | "F" | "O" | "";

interface RoleOption {
    id: string;
    name: string;
    description?: string;
    is_system?: boolean;
    is_default?: boolean;
}

type RoleListResponse = RoleOption[] | { results?: RoleOption[]; data?: RoleOption[] };

interface StaffFormState {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role_names: string[];
    bio: string;
    specialization: string;
    years_of_experience: string;
    dob: string;
    sex: StaffSex;
    date_of_joining: string;
    profile_picture: File | null;
}

interface StaffPayload {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role_names: string[];
    username: string;
    bio: string;
    specialization: string;
    years_of_experience?: number | null;
    dob?: string | null;
    sex?: StaffSex | null;
    date_of_joining?: string | null;
}

type StaffMutationPayload = StaffPayload | FormData;
type EmailAvailability = boolean | "loading" | null;
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
type AvailabilityResponse = {
    email_available?: boolean;
};

const EMAIL_EXISTS_MESSAGE = "Email already exists. Use a different email id.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getStaffList = (responseData: StaffListResponse): StaffMember[] => {
    if (Array.isArray(responseData)) {
        return responseData;
    }

    if (Array.isArray(responseData.results)) {
        return responseData.results;
    }

    if (Array.isArray(responseData.data)) {
        return responseData.data;
    }

    return [];
};

const getRoleList = (responseData: RoleListResponse): RoleOption[] => {
    if (Array.isArray(responseData)) {
        return responseData;
    }

    if (Array.isArray(responseData.results)) {
        return responseData.results;
    }

    if (Array.isArray(responseData.data)) {
        return responseData.data;
    }

    return [];
};

const createEmptyStaffForm = (roleName = DEFAULT_ROLE_NAME): StaffFormState => ({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_names: [roleName],
    bio: "",
    specialization: "",
    years_of_experience: "",
    dob: "",
    sex: "",
    date_of_joining: "",
    profile_picture: null,
});

const getSelectedRoleName = (roles?: RoleOption[], currentRole?: string | null) => {
    if (currentRole) {
        return currentRole;
    }

    return roles?.[0]?.name || DEFAULT_ROLE_NAME;
};

const buildStaffPayload = (form: StaffFormState): StaffMutationPayload => {
    const payload: StaffPayload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        role_names: form.role_names,
        username: form.email,
        bio: form.bio,
        specialization: form.specialization,
        years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : null,
        dob: form.dob || null,
        sex: form.sex || null,
        date_of_joining: form.date_of_joining || null,
    };

    if (!form.profile_picture) {
        return payload;
    }

    const multipartPayload = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (key === "role_names") {
            payload.role_names.forEach((roleName, index) => {
                multipartPayload.append(`role_names[${index}]`, roleName);
            });
            return;
        }

        multipartPayload.append(key, value == null ? "" : String(value));
    });
    multipartPayload.append("profile_picture", form.profile_picture);

    return multipartPayload;
};

const isMultipartPayload = (payload: StaffMutationPayload): payload is FormData => {
    return payload instanceof FormData;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isValidEmail = (email: string): boolean => EMAIL_PATTERN.test(email);

const getFirstError = (value?: string | string[]): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

const getStaffDetailsHref = (member: StaffMember) => {
    return `/dashboard/staff/${encodeURIComponent(member.email)}`;
};

function getStaffStatusVariant(status?: StaffMember["status"]) {
    return status === "inactive" ? "neutral" as const : "success" as const;
}

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
        "Could not save staff member. Please check the details and try again."
    );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-[65%] text-right font-medium text-foreground">{value}</span>
        </div>
    );
}

export default function StaffMembersPage() {
    const queryClient = useQueryClient();
    const { sessionStatus, tenantId, userPermissions, permissionsLoading, hasRequiredPermission } =
        useCurrentUserPermissions(PERMISSIONS.STAFF_VIEW);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
    const [form, setForm] = useState<StaffFormState>(() => createEmptyStaffForm());
    const [formError, setFormError] = useState("");
    const [emailAvailability, setEmailAvailability] = useState<EmailAvailability>(null);
    const [emailAvailabilityCheckError, setEmailAvailabilityCheckError] = useState("");
    
    // Delete states
    const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null);

    const { data: staff, isLoading, error } = useQuery<StaffMember[]>({
        queryKey: ["staff-profiles"],
        enabled: hasRequiredPermission,
        queryFn: async () => {
            const response = await api.get<StaffListResponse>(STAFF_ENDPOINT);
            return getStaffList(response.data);
        },
    });

    const { data: roles, isLoading: rolesLoading } = useQuery<RoleOption[]>({
        queryKey: ["tenant-roles", tenantId],
        enabled: hasRequiredPermission && Boolean(tenantId),
        queryFn: async () => {
            const response = await api.get<RoleListResponse>(`organizations/${tenantId}/roles/`);
            return getRoleList(response.data);
        },
    });

    const selectedRoleName = form.role_names[0] || "";
    const roleSelectValue = roles?.some((role) => role.name === selectedRoleName) ? selectedRoleName : "";
    const normalizedEmail = normalizeEmail(form.email);
    const selectedMemberEmail = normalizeEmail(selectedMember?.email || "");
    const emailChangedInEditMode = modalMode !== "edit" || normalizedEmail !== selectedMemberEmail;
    const emailMatchesExistingStaff = Boolean(normalizedEmail) && Boolean(staff?.some((member) => (
        normalizeEmail(member.email) === normalizedEmail &&
        member.id !== selectedMember?.id
    )));
    const shouldCheckEmailAvailability = (
        isModalOpen &&
        Boolean(normalizedEmail) &&
        isValidEmail(normalizedEmail) &&
        emailChangedInEditMode &&
        !emailMatchesExistingStaff
    );

    useEffect(() => {
        if (!shouldCheckEmailAvailability) {
            return;
        }

        let isCurrentCheck = true;

        const timer = window.setTimeout(async () => {
            try {
                const response = await api.get<AvailabilityResponse>("auth/check-availability/", {
                    params: {
                        email: normalizedEmail,
                        exclude_current_user: false,
                    },
                });

                if (isCurrentCheck) {
                    setEmailAvailability(response.data.email_available ?? null);
                    setEmailAvailabilityCheckError("");
                }
            } catch {
                if (isCurrentCheck) {
                    setEmailAvailability(null);
                    setEmailAvailabilityCheckError("Could not check email availability. You can still try saving.");
                }
            }
        }, 600);

        return () => {
            isCurrentCheck = false;
            window.clearTimeout(timer);
        };
    }, [normalizedEmail, shouldCheckEmailAvailability]);

    const handleEmailChange = (value: string) => {
        const nextEmail = normalizeEmail(value);
        const nextEmailChangedInEditMode = modalMode !== "edit" || nextEmail !== selectedMemberEmail;
        const nextEmailMatchesExistingStaff = Boolean(nextEmail) && Boolean(staff?.some((member) => (
            normalizeEmail(member.email) === nextEmail &&
            member.id !== selectedMember?.id
        )));
        const shouldMarkLoading = (
            Boolean(nextEmail) &&
            isValidEmail(nextEmail) &&
            nextEmailChangedInEditMode &&
            !nextEmailMatchesExistingStaff
        );

        setForm({...form, email: value});
        setFormError("");
        setEmailAvailability(nextEmailMatchesExistingStaff ? false : shouldMarkLoading ? "loading" : null);
        setEmailAvailabilityCheckError("");
    };

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: StaffMutationPayload) => {
            const res = await api.post(STAFF_ENDPOINT, data, isMultipartPayload(data) ? {
                headers: { "Content-Type": "multipart/form-data" },
            } : undefined);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
            setFormError("");
            setIsModalOpen(false);
        },
        onError: (error: unknown) => setFormError(getMutationErrorMessage(error)),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: StaffMutationPayload }) => {
            const res = await api.put(`${STAFF_ENDPOINT}${id}/`, data, isMultipartPayload(data) ? {
                headers: { "Content-Type": "multipart/form-data" },
            } : undefined);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
            setFormError("");
            setIsModalOpen(false);
        },
        onError: (error: unknown) => setFormError(getMutationErrorMessage(error)),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`${STAFF_ENDPOINT}${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
            setMemberToDelete(null);
        }
    });

    const statusMutation = useMutation({
        mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: "active" | "inactive" }) => {
            const action = nextStatus === "active" ? "activate" : "deactivate";
            const response = await api.post<StaffMember>(`${STAFF_ENDPOINT}${id}/${action}/`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-profiles"] });
        },
    });

    const displayFormError = formError;
    const effectiveEmailAvailability = emailMatchesExistingStaff ? false : emailAvailability;
    const emailAvailabilityError = effectiveEmailAvailability === false ? EMAIL_EXISTS_MESSAGE : "";
    const emailFieldError = emailAvailabilityError || (displayFormError.toLowerCase().includes("email") ? displayFormError : "");
    const isSavingStaff = createMutation.isPending || updateMutation.isPending;
    const isStaffSubmitDisabled = isSavingStaff || !roles?.length || effectiveEmailAvailability === "loading" || effectiveEmailAvailability === false;

    const filteredStaff = staff?.filter(member => {
        const full_name = member.full_name.toLowerCase();
        const email = member.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        return full_name.includes(query) || email.includes(query);
    });

    const handleOpenAdd = () => {
        setModalMode("add");
        setForm(createEmptyStaffForm(getSelectedRoleName(roles)));
        setSelectedMember(null);
        setFormError("");
        setEmailAvailability(null);
        setEmailAvailabilityCheckError("");
        setIsModalOpen(true);
    };

    const handleOpenEdit = (member: StaffMember) => {
        const [firstName = "", ...lastNameParts] = member.full_name.split(" ");
        setModalMode("edit");
        setForm({ 
            first_name: firstName,
            last_name: lastNameParts.join(" "),
            email: member.email || "", 
            phone: member.phone || "", 
            role_names: [getSelectedRoleName(roles, member.role_name)],
            bio: member.bio || "",
            specialization: member.specialization || "",
            years_of_experience: member.years_of_experience == null ? "" : String(member.years_of_experience),
            dob: member.dob || "",
            sex: member.sex || "",
            date_of_joining: member.date_of_joining || "",
            profile_picture: null,
        });
        setSelectedMember(member);
        setFormError("");
        setEmailAvailability(null);
        setEmailAvailabilityCheckError("");
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        if (effectiveEmailAvailability === "loading" || effectiveEmailAvailability === false) {
            setFormError("Please use an available email before saving.");
            return;
        }
        const payload = buildStaffPayload({
            ...form,
            role_names: [roleSelectValue || roles?.[0]?.name || selectedRoleName],
        });
        if (modalMode === "add") {
            createMutation.mutate(payload);
        } else if (modalMode === "edit" && selectedMember) {
            updateMutation.mutate({ id: selectedMember.id, data: payload });
        }
    };

    if (sessionStatus === "loading" || permissionsLoading || (hasRequiredPermission && isLoading)) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
                Error loading staff members. Please try again.
            </div>
        );
    }

    if (!can(userPermissions, PERMISSIONS.STAFF_VIEW)) {
        redirect("/dashboard");
    }

    return (
        <PageShell>
            <PageHeader
                title="Staff Members"
                description="Manage your team and track their performance."
                icon={ShieldCheckIcon}
                actions={(
                <Button
                    onClick={handleOpenAdd}
                >
                    <PlusIcon className="h-4 w-4" />
                    Add Team Member
                </Button>
                )}
            />

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center text-sm">
                <div className="relative w-full md:w-96">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                    <Input
                        type="text"
                        placeholder="Search staff by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors md:block">
                <ResponsiveTableFromRows
                    columns={["ID", "Name", "Email", "Phone", "Roles", "Status", "Actions"]}
                    emptyText="No records found."
                        headerClassName="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors"
                        bodyClassName="divide-y divide-border text-card-foreground transition-colors"
                >
                            {filteredStaff?.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <ShieldCheckIcon size={48} className="text-zinc-300 dark:text-zinc-600 mb-4" />
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                                                {searchQuery ? "No matching staff found" : "No staff members"}
                                            </h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                                {searchQuery ? "Try adjusting your search query." : "Get started by adding your first team member."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff?.map((member) => (
                                    <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-zinc-500 dark:text-zinc-400">
                                            {member.public_id || "-"}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white text-base">
                                            {member.full_name}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-900 dark:text-white">
                                            {member.email}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                                            {member.phone || "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {member.role_name && (
                                                <Badge className="mr-1 capitalize">
                                                    {member.role_name}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={getStaffStatusVariant(member.status)} className="capitalize">
                                                {member.status || "active"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={getStaffDetailsHref(member)}
                                                    className={buttonVariants({ variant: "outline", size: "sm" })}
                                                    title="View"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    View
                                                </Link>
                                                <button 
                                                    onClick={() => handleOpenEdit(member)}
                                                    className="p-2 text-muted-foreground transition hover:text-primary"
                                                    title="Edit"
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    disabled={statusMutation.isPending}
                                                    onClick={() => statusMutation.mutate({
                                                        id: member.id,
                                                        nextStatus: member.status === "inactive" ? "active" : "inactive",
                                                    })}
                                                    className="p-2 text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                                    title={member.status === "inactive" ? "Make active" : "Make inactive"}
                                                >
                                                    {member.status === "inactive" ? (
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    ) : (
                                                        <XCircleIcon className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => setMemberToDelete(member)}
                                                    className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition"
                                                    title="Delete"
                                                >
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        
                </ResponsiveTableFromRows>
            </div>

            <div className="grid gap-4 md:hidden">
                {filteredStaff?.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={ShieldCheckIcon}
                            title={searchQuery ? "No matching staff found" : "No staff members"}
                            description={searchQuery ? "Try adjusting your search query." : "Get started by adding your first team member."}
                        />
                    </Card>
                ) : (
                    filteredStaff?.map((member) => (
                        <Card key={member.id}>
                            <CardContent className="space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-semibold text-foreground">{member.full_name}</h2>
                                        <p className="mt-1 truncate text-sm text-muted-foreground">{member.email}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        {member.role_name && <Badge className="capitalize">{member.role_name}</Badge>}
                                        <Badge variant={getStaffStatusVariant(member.status)} className="capitalize">
                                            {member.status || "active"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-2 border-t border-border pt-4">
                                    <DetailRow label="ID" value={member.public_id || "-"} />
                                    <DetailRow label="Phone" value={member.phone || "-"} />
                                    <DetailRow label="Specialization" value={member.specialization || "-"} />
                                </div>
                                <div className="flex justify-end gap-2 border-t border-border pt-3">
                                    <Link
                                        href={getStaffDetailsHref(member)}
                                        className={buttonVariants({ variant: "outline", size: "sm" })}
                                        title="View"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        View
                                    </Link>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)} title="Edit">
                                        <EditIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={statusMutation.isPending}
                                        onClick={() => statusMutation.mutate({
                                            id: member.id,
                                            nextStatus: member.status === "inactive" ? "active" : "inactive",
                                        })}
                                        title={member.status === "inactive" ? "Make active" : "Make inactive"}
                                    >
                                        {member.status === "inactive" ? (
                                            <CheckCircleIcon className="h-4 w-4" />
                                        ) : (
                                            <XCircleIcon className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setMemberToDelete(member)} title="Delete" className="hover:text-destructive">
                                        <Trash2Icon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                {modalMode === 'add' ? 'Add New Team Member' : 'Edit Team Member'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                            {displayFormError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    {displayFormError}
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">First Name</label>
                                    <input required type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Last Name</label>
                                    <input required type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="email"
                                            value={form.email}
                                            onChange={e => handleEmailChange(e.target.value)}
                                            aria-invalid={Boolean(emailFieldError)}
                                            className={`w-full bg-zinc-50 dark:bg-zinc-950 border rounded-md py-2 pl-3 pr-10 text-sm outline-none dark:text-white transition ${
                                                effectiveEmailAvailability === true
                                                    ? "border-green-500 focus:border-green-600"
                                                    : emailFieldError
                                                        ? "border-red-500 focus:border-red-600"
                                                        : "border-zinc-200 focus:border-indigo-500 dark:border-zinc-800"
                                            }`}
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                            {effectiveEmailAvailability === "loading" && <Loader2Icon className="h-4 w-4 animate-spin text-zinc-400" />}
                                            {effectiveEmailAvailability === true && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                                            {effectiveEmailAvailability === false && <XCircleIcon className="h-4 w-4 text-red-500" />}
                                        </div>
                                    </div>
                                    {emailFieldError && (
                                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                                            {emailFieldError}
                                        </p>
                                    )}
                                    {effectiveEmailAvailability === true && (
                                        <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                                            Email is available.
                                        </p>
                                    )}
                                    {emailAvailabilityCheckError && !emailFieldError && (
                                        <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                            {emailAvailabilityCheckError}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Phone</label>
                                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Primary Role</label>
                                    <select
                                        required
                                        value={roleSelectValue}
                                        disabled={rolesLoading || !roles?.length}
                                        onChange={e => setForm({...form, role_names: [e.target.value]})}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {rolesLoading && <option value="">Loading roles...</option>}
                                        {!rolesLoading && !roles?.length && <option value="">No roles available</option>}
                                        {roles?.map((role) => (
                                            <option key={role.id} value={role.name}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Specialization</label>
                                    <input type="text" value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Years of Experience</label>
                                    <input min="0" type="number" value={form.years_of_experience} onChange={e => setForm({...form, years_of_experience: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date of Joining</label>
                                    <input type="date" value={form.date_of_joining} onChange={e => setForm({...form, date_of_joining: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date of Birth</label>
                                    <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Sex</label>
                                    <select value={form.sex} onChange={e => setForm({...form, sex: e.target.value as StaffSex})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition">
                                        <option value="">Select sex</option>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Profile Picture</label>
                                <input type="file" accept="image/*" onChange={e => setForm({...form, profile_picture: e.target.files?.[0] || null})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1 file:text-sm file:font-medium file:text-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Bio</label>
                                <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={4} className="w-full resize-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 mt-6 md:mt-8 tracking-wide">
                                
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button disabled={isStaffSubmitDisabled} type="submit" className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    {isSavingStaff && <Loader2Icon className="w-4 h-4 animate-spin" />}
                                    {modalMode === 'add' ? 'Add Member' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {memberToDelete && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                                <Trash2Icon className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Delete Member?</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                                Are you sure you want to remove <span className="font-semibold text-zinc-900 dark:text-white">{memberToDelete.full_name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setMemberToDelete(null)}
                                    className="flex-1 py-2 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate(memberToDelete.id)}
                                    className="flex-1 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {deleteMutation.isPending && <Loader2Icon className="w-4 h-4 animate-spin" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
}
