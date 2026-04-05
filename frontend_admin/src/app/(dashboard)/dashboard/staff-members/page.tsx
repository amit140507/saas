"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { UserIcon, ShieldCheckIcon, MailIcon, PhoneIcon, CalendarIcon, StarIcon } from "lucide-react";

interface StaffMember {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    phone: string;
    date_of_joining: string;
    staff_profile: {
        bio: string;
        specialization: string;
        rating: string;
    } | null;
}

export default function StaffMembersPage() {
    const { data: staff, isLoading, error } = useQuery<StaffMember[]>({
        queryKey: ["staff-members"],
        queryFn: async () => {
            const response = await api.get("/users/staff/");
            return response.data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
                <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition">
                    Add Team Member
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {staff?.map((member) => (
                    <div key={member.id} className="relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600">
                        <div className="p-6">
                            <div className="flex items-center gap-x-4">
                                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <UserIcon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold leading-7 tracking-tight text-zinc-900 dark:text-white">
                                        {member.first_name} {member.last_name}
                                    </h3>
                                    <p className="text-sm font-medium leading-6 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        {member.role}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                                    <MailIcon size={16} className="mr-2" />
                                    {member.email}
                                </div>
                                {member.phone && (
                                    <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                                        <PhoneIcon size={16} className="mr-2" />
                                        {member.phone}
                                    </div>
                                )}
                                <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                                    <CalendarIcon size={16} className="mr-2" />
                                    Joined {member.date_of_joining ? new Date(member.date_of_joining).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>

                            {member.staff_profile && (
                                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-700">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                            {member.staff_profile.specialization || "Generalist"}
                                        </div>
                                        <div className="flex items-center text-yellow-500">
                                            <StarIcon size={16} fill="currentColor" className="mr-1" />
                                            <span className="text-sm font-bold">{member.staff_profile.rating}</span>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 italic">
                                        "{member.staff_profile.bio || 'Efficiency and excellence combined.'}"
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="mt-auto bg-zinc-50 dark:bg-zinc-800/50 px-6 py-3 border-t border-zinc-100 dark:border-zinc-700 flex justify-end gap-x-3">
                            <button className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                                Edit
                            </button>
                            <button className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition">
                                View Clients
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {staff?.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    <ShieldCheckIcon size={48} className="mx-auto text-zinc-300 dark:text-zinc-600" />
                    <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No staff members</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Get started by adding your first team member.</p>
                </div>
            )}
        </div>
    );
}
