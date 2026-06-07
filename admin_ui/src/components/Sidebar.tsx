"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    UsersIcon,
    SettingsIcon,
    LayoutDashboardIcon,
    CreditCardIcon,
    ShieldCheckIcon,
    LogOutIcon,
    CalculatorIcon,
    ActivityIcon,
    RulerIcon,
    ShoppingCartIcon,
    PackageIcon,
    BadgeCheckIcon,
    MenuIcon,
    XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { can, PERMISSIONS, useCurrentUserPermissions } from "@/lib/permissions";
import type { PermissionCode } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface NavigationItem {
    name: string;
    href: string;
    icon: LucideIcon;
    permission?: PermissionCode;
}

const navigation: NavigationItem[] = [
    { name: "Admin Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { name: "Staff Members", href: "/dashboard/staff", icon: ShieldCheckIcon, permission: PERMISSIONS.STAFF_VIEW },
    { name: "Clients (Members)", href: "/dashboard/clients", icon: UsersIcon, permission: PERMISSIONS.VIEW_CLIENTS },
    { name: "Packages", href: "/dashboard/packages", icon: PackageIcon, permission: PERMISSIONS.VIEW_PLANS },
    { name: "Subscriptions", href: "/dashboard/subscriptions", icon: BadgeCheckIcon, permission: PERMISSIONS.VIEW_PLANS },
    { name: "Orders", href: "/dashboard/orders", icon: ShoppingCartIcon, permission: PERMISSIONS.VIEW_ORDERS },
    { name: "Payments", href: "/dashboard/payments", icon: CreditCardIcon, permission: PERMISSIONS.MANAGE_ORDERS },
    // { name: "Security", href: "/dashboard/security", icon: ShieldCheckIcon },
    { name: "Macro Calculator", href: "/dashboard/macro-calculator", icon: CalculatorIcon, permission: PERMISSIONS.VIEW_PLANS },
    { name: "Client Trackers", href: "/dashboard/check-in-tracker", icon: ActivityIcon, permission: PERMISSIONS.VIEW_PROGRESS },
    { name: "Measurements", href: "/dashboard/measurements", icon: RulerIcon, permission: PERMISSIONS.VIEW_PROGRESS },
    { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon, permission: PERMISSIONS.MANAGE_SETTINGS },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { userPermissions, permissionsLoading } = useCurrentUserPermissions();

    const visibleNavigation = permissionsLoading
        ? navigation.filter((item) => !item.permission)
        : navigation.filter((item) => !item.permission || can(userPermissions, item.permission));

    const handleLogout = () => {
        signOut({ callbackUrl: "/login" });
    };

    const sidebarContent = (
        <>
            <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
                <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-500 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                    SaaS Admin
                </span>
                <button
                    type="button"
                    onClick={() => setIsMobileOpen(false)}
                    className="-mr-2 rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white lg:hidden"
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
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={cn(
                                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors",
                                            pathname === item.href
                                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                        )}
                                    >
                                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </li>
                    <li className="mt-auto -mx-2">
                        <button
                            onClick={handleLogout}
                            type="button"
                            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white transition-colors"
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
                className="fixed left-4 top-4 z-50 rounded-md border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white lg:hidden"
            >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white w-64 flex-col fixed inset-y-0 border-r border-zinc-200 dark:border-zinc-800 transition-colors lg:flex">
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
                    "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-3rem)] flex-col border-r border-zinc-200 bg-white text-zinc-900 shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 dark:text-white lg:hidden",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </div>
        </>
    );
}
