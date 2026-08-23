"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    ClipboardListIcon,
    DumbbellIcon,
    Loader2Icon,
    UsersIcon,
    UserCheckIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getClients } from "@/services/client.service";
import { getDietPlans } from "@/services/diet-plan.service";
import { getWorkoutPlans } from "@/services/workout.service";
import { cn } from "@/lib/utils";

interface StatCard {
    name: string;
    value: number | null;
    helper: string;
    href: string;
    icon: LucideIcon;
    tone: string;
    isLoading: boolean;
    isError: boolean;
}

function formatCount(value: number | null): string {
    return value === null ? "-" : value.toLocaleString();
}

function DashboardStatCard({ stat }: { stat: StatCard }) {
    return (
        <Link
            href={stat.href}
            className="block overflow-hidden rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 sm:p-6"
            aria-label={`Open ${stat.name}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <dt className="truncate text-sm font-medium text-zinc-500 transition-colors dark:text-zinc-400">
                        {stat.name}
                    </dt>
                    <dd className="mt-2 flex items-center text-3xl font-semibold text-zinc-900 transition-colors dark:text-white">
                        {stat.isLoading ? (
                            <Loader2Icon className="h-7 w-7 animate-spin text-zinc-400" aria-label={`Loading ${stat.name}`} />
                        ) : (
                            formatCount(stat.value)
                        )}
                    </dd>
                </div>
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", stat.tone)}>
                    <stat.icon className="h-5 w-5" aria-hidden="true" />
                </div>
            </div>
            <p className={cn("mt-4 text-sm", stat.isError ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400")}>
                {stat.isError ? "Unable to load this metric." : stat.helper}
            </p>
        </Link>
    );
}

export default function AdminDashboardPage() {
    const { data: session } = useSession();
    const profileName = session?.user?.name || session?.user?.email || "Admin";
    const {
        data: clients = [],
        isLoading: clientsLoading,
        isError: clientsError,
    } = useQuery({
        queryKey: ["dashboard-clients"],
        queryFn: getClients,
    });
    const {
        data: workoutPlans = [],
        isLoading: workoutPlansLoading,
        isError: workoutPlansError,
    } = useQuery({
        queryKey: ["dashboard-workout-plans"],
        queryFn: getWorkoutPlans,
    });
    const {
        data: dietPlans = [],
        isLoading: dietPlansLoading,
        isError: dietPlansError,
    } = useQuery({
        queryKey: ["dashboard-diet-plans"],
        queryFn: getDietPlans,
    });

    const activeClients = useMemo(
        () => clients.filter((client) => client.status === "active").length,
        [clients],
    );

    const stats: StatCard[] = [
        {
            name: "Active Clients",
            value: clientsError ? null : activeClients,
            helper: "Clients currently marked active.",
            href: "/dashboard/clients",
            icon: UserCheckIcon,
            tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
            isLoading: clientsLoading,
            isError: clientsError,
        },
        {
            name: "Total Clients",
            value: clientsError ? null : clients.length,
            helper: "All client profiles in this organization.",
            href: "/dashboard/clients",
            icon: UsersIcon,
            tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
            isLoading: clientsLoading,
            isError: clientsError,
        },
        {
            name: "Workout Plans",
            value: workoutPlansError ? null : workoutPlans.length,
            helper: "Workout plan templates created.",
            href: "/dashboard/workouts/planning",
            icon: DumbbellIcon,
            tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
            isLoading: workoutPlansLoading,
            isError: workoutPlansError,
        },
        {
            name: "Diet Plans",
            value: dietPlansError ? null : dietPlans.length,
            helper: "Diet plan templates created.",
            href: "/dashboard/diet-plans/planning",
            icon: ClipboardListIcon,
            tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
            isLoading: dietPlansLoading,
            isError: dietPlansError,
        },
    ];

    return (
        <div>
            <h1 className="text-2xl font-semibold text-zinc-900 transition-colors dark:text-white">Welcome {profileName}</h1>
            <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <DashboardStatCard key={stat.name} stat={stat} />
                ))}
            </dl>
        </div>
    );
}
