"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ShieldCheckIcon, SearchIcon, PlusIcon, EditIcon, Trash2Icon, Loader2Icon, MoreVerticalIcon } from "lucide-react";
import { useState } from "react";

interface StaffMember {
    id: number;
    public_id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role_names: string[];
    phone: string;
    date_of_joining?: string;
    staff_profile?: {
        bio: string;
        specialization: string;
        rating: string;
    } | null;
}

export default function StaffMembersPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
    const [form, setForm] = useState({
        first_name: "", last_name: "", email: "", phone: "", role_names: ["trainer"]
    });
    
    // Delete states
    const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null);

    const { data: staff, isLoading, error } = useQuery<StaffMember[]>({
        queryKey: ["staff-members"],
        queryFn: async () => {
            const response = await api.get("/users/staff/");
            return response.data;
        },
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post("/users/staff/", data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-members"] });
            setIsModalOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number, data: any }) => {
            const res = await api.put(`/users/staff/${id}/`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-members"] });
            setIsModalOpen(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/users/staff/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-members"] });
            setMemberToDelete(null);
        }
    });

    const filteredStaff = staff?.filter(member => {
        const full_name = `${member.first_name} ${member.last_name}`.toLowerCase();
        const email = member.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        return full_name.includes(query) || email.includes(query);
    });

    const handleOpenAdd = () => {
        setModalMode("add");
        setForm({ first_name: "", last_name: "", email: "", phone: "", role_names: ["trainer"] });
        setSelectedMember(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (member: StaffMember) => {
        setModalMode("edit");
        setForm({ 
            first_name: member.first_name || "", 
            last_name: member.last_name || "", 
            email: member.email || "", 
            phone: member.phone || "", 
            role_names: member.role_names?.length ? member.role_names : ["trainer"] 
        });
        setSelectedMember(member);
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            username: form.email // For backward compatibility or if backend needs it
        };
        if (modalMode === "add") {
            createMutation.mutate(payload);
        } else if (modalMode === "edit" && selectedMember) {
            updateMutation.mutate({ id: selectedMember.id, data: payload });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2Icon className="animate-spin text-indigo-600 w-8 h-8" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50">
                Error loading staff members. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">Staff Members</h1>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Manage your team and track their performance.
                    </p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Team Member
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center text-sm">
                <div className="relative w-full md:w-96">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search staff by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold transition-colors">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Roles</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
                            {filteredStaff?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
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
                                            {member.public_id || "—"}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white text-base">
                                            {member.first_name} {member.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-900 dark:text-white">
                                            {member.email}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                                            {member.phone || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {member.role_names?.map((role) => (
                                                <span key={role} className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/10 dark:ring-indigo-400/20 mr-1 capitalize transition-colors">
                                                    {role}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenEdit(member)}
                                                    className="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                                    title="Edit"
                                                >
                                                    <EditIcon className="w-4 h-4" />
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
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                {modalMode === 'add' ? 'Add New Team Member' : 'Edit Team Member'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">First Name</label>
                                    <input required type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Last Name</label>
                                    <input required type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                                    <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Phone</label>
                                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Primary Role</label>
                                <select 
                                    value={form.role_names[0] || 'trainer'} 
                                    onChange={e => setForm({...form, role_names: [e.target.value]})} 
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition"
                                >
                                    <option value="trainer">Trainer</option>
                                    <option value="admin">Administrator</option>
                                    <option value="marketing">Marketing</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 mt-6 md:mt-8 tracking-wide">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button disabled={createMutation.isPending || updateMutation.isPending} type="submit" className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2Icon className="w-4 h-4 animate-spin" />}
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
                                Are you sure you want to remove <span className="font-semibold text-zinc-900 dark:text-white">{memberToDelete.first_name} {memberToDelete.last_name}</span>? This action cannot be undone.
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
        </div>
    );
}
