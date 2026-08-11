"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
    UsersIcon,
    SettingsIcon,
    LayoutDashboardIcon,
    CreditCardIcon,
    ShieldCheckIcon,
    LogOutIcon,
    CalculatorIcon,
    ActivityIcon,
    ShoppingCartIcon,
    PackageIcon,
    TicketPercentIcon,
    BadgeCheckIcon,
    MessageCircleIcon,
    MenuIcon,
    XIcon,
    DumbbellIcon,
    ChevronDownIcon,
    DropletIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { can, PERMISSIONS, useCurrentUserPermissions } from "@/lib/permissions";
import type { PermissionCode } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getCurrentAdminUser } from "@/services/auth.service";

interface NavigationItem {
    name: string;
    href: string;
    icon: LucideIcon;
    permission?: PermissionCode;
    children?: Array<{
        name: string;
        href: string;
    }>;
}

const navigation: NavigationItem[] = [
    { name: "Admin Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { name: "Staff Members", href: "/dashboard/staff", icon: ShieldCheckIcon, permission: PERMISSIONS.STAFF_VIEW },
    { name: "Clients (Members)", href: "/dashboard/clients", icon: UsersIcon, permission: PERMISSIONS.VIEW_CLIENTS },
    { name: "Packages", href: "/dashboard/packages", icon: PackageIcon, permission: PERMISSIONS.VIEW_PLANS },
    { name: "Coupons", href: "/dashboard/coupons", icon: TicketPercentIcon, permission: PERMISSIONS.VIEW_ORDERS },
    { name: "Orders", href: "/dashboard/orders", icon: ShoppingCartIcon, permission: PERMISSIONS.VIEW_ORDERS },
    { name: "Subscriptions", href: "/dashboard/subscriptions", icon: BadgeCheckIcon, permission: PERMISSIONS.VIEW_PLANS },
    { name: "Payments", href: "/dashboard/payments", icon: CreditCardIcon, permission: PERMISSIONS.MANAGE_ORDERS },
    {
        name: "Workouts",
        href: "/dashboard/workouts",
        icon: DumbbellIcon,
        permission: PERMISSIONS.MANAGE_WORKOUTS,
        children: [
            { name: "Exercise Creation", href: "/dashboard/workouts/exercises" },
            { name: "Planning", href: "/dashboard/workouts/planning" },
        ],
    },
    { name: "Macro Calculator", href: "/dashboard/macro-calculator", icon: CalculatorIcon, permission: PERMISSIONS.VIEW_PLANS },
    {
        name: "Diet/Meal Plan",
        href: "/dashboard/diet-plans",
        icon: PackageIcon,
        permission: PERMISSIONS.MANAGE_DIET,
        children: [
            { name: "Planning", href: "/dashboard/diet-plans/planning" },
            { name: "Tracking", href: "/dashboard/diet-plans/tracking" },
        ],
    },
    { name: "Blood Reports", href: "/dashboard/blood-reports", icon: DropletIcon, permission: PERMISSIONS.VIEW_REPORTS },
    // { name: "Security", href: "/dashboard/security", icon: ShieldCheckIcon },
    
    {
        name: "Client Progress Tracker",
        href: "/dashboard/client-tracking",
        icon: ActivityIcon,
        permission: PERMISSIONS.VIEW_PROGRESS,
        children: [
            { name: "Checkins", href: "/dashboard/client-tracking/checkins" },
            { name: "Measurements", href: "/dashboard/client-tracking/measurements" },
        ],
    },
     {
        name: "Engagement",
        href: "/dashboard/engagement",
        icon: MessageCircleIcon,
        permission: PERMISSIONS.SEND_COMMUNICATIONS,
        children: [
            { name: "Communications", href: "/dashboard/engagement/communications" },
            { name: "Follow-ups", href: "/dashboard/engagement/follow-ups" },
        ],
    },
    { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon, permission: PERMISSIONS.MANAGE_SETTINGS },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        Workouts: pathname.startsWith("/dashboard/workouts"),
        Engagement: pathname.startsWith("/dashboard/engagement") || pathname.startsWith("/dashboard/email-logs"),
        "Diet/Meal Plan": pathname.startsWith("/dashboard/diet-plans"),
        "Client Progress Tracker": pathname.startsWith("/dashboard/client-tracking"),
    });
    const { userPermissions, permissionsLoading, sessionStatus, tenantId } = useCurrentUserPermissions();
    const { data: currentUser } = useQuery({
        queryKey: ["sidebar-current-user", tenantId],
        enabled: sessionStatus === "authenticated",
        queryFn: getCurrentAdminUser,
    });

    const currentMembership = currentUser?.memberships?.find((membership) => membership.tenant_id === tenantId) || currentUser?.memberships?.[0];
    const organizationName = currentMembership?.tenant_name;
    const organizationLogo = currentMembership?.tenant_logo || null;

    const visibleNavigation = permissionsLoading
        ? navigation.filter((item) => !item.permission)
        : navigation.filter((item) => !item.permission || can(userPermissions, item.permission));

    const handleLogout = () => {
        signOut({ callbackUrl: "/login" });
    };

    const sidebarContent = (
        <>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 transition-colors">
                <Link href="/dashboard" onClick={() => setIsMobileOpen(false)} className="min-w-0">
                    {organizationLogo ? (
                        <Image
                            src={organizationLogo}
                            alt={`${organizationName} logo`}
                            width={160}
                            height={40}
                            unoptimized
                            className="max-h-10 w-auto max-w-40 object-contain"
                        />
                    ) : (
                        <span className="block truncate text-xl font-bold text-primary">
                            {organizationName}
                        </span>
                    )}
                </Link>
                <button
                    type="button"
                    onClick={() => setIsMobileOpen(false)}
                    className="-mr-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
                >
                    <span className="sr-only">Close sidebar</span>
                    <XIcon className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>
            <nav className="flex flex-1 flex-col px-4 py-6">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                        <ul role="list" className="-mx-2 space-y-1">
                            {visibleNavigation.map((item) => (
                                <li key={item.name}>
                                    {item.children ? (
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => setOpenGroups((groups) => ({ ...groups, [item.name]: !groups[item.name] }))}
                                                className={cn(
                                                    "group flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors",
                                                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                                                        ? "bg-primary-soft text-primary"
                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                )}
                                            >
                                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                <span className="min-w-0 flex-1 text-left">{item.name}</span>
                                                <ChevronDownIcon
                                                    className={cn(
                                                        "h-4 w-4 shrink-0 transition-transform",
                                                        openGroups[item.name] ? "rotate-180" : ""
                                                    )}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            {openGroups[item.name] && (
                                                <ul className="mt-1 space-y-1 pl-9">
                                                    {item.children.map((child) => (
                                                        <li key={child.name}>
                                                            <Link
                                                                href={child.href}
                                                                onClick={() => setIsMobileOpen(false)}
                                                                className={cn(
                                                                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                                                    pathname === child.href
                                                                        ? "bg-primary-soft text-primary"
                                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                                )}
                                                            >
                                                                {child.name}
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsMobileOpen(false)}
                                            className={cn(
                                                "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors",
                                                pathname === item.href
                                                    ? "bg-primary-soft text-primary"
                                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                            {item.name}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </li>
                    <li className="mt-auto -mx-2">
                        <button
                            onClick={handleLogout}
                            type="button"
                            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <LogOutIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Logout Admin
                        </button>
                    </li>
                </ul>
            </nav>
        </>
    );

    return (
        <>
            <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="fixed left-4 top-4 z-50 rounded-md border border-border bg-card p-2 text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
            >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="fixed inset-y-0 hidden w-64 flex-col border-r border-border bg-card text-card-foreground transition-colors lg:flex">
                {sidebarContent}
            </div>

            <div
                className={cn(
                    "fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm transition-opacity lg:hidden",
                    isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                onClick={() => setIsMobileOpen(false)}
                aria-hidden="true"
            />

            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-3rem)] flex-col border-r border-border bg-card text-card-foreground shadow-xl transition-transform duration-200 ease-out lg:hidden",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </div>
        </>
    );
}
