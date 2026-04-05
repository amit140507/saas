"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    RulerIcon
} from "lucide-react";

const navigation = [
    { name: "Admin Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { name: "Staff Members", href: "/dashboard/staff-members", icon: ShieldCheckIcon },
    { name: "Clients (Members)", href: "/dashboard/clients", icon: UsersIcon },
    { name: "Payments", href: "/dashboard/payments", icon: CreditCardIcon },
    { name: "Security", href: "/dashboard/security", icon: ShieldCheckIcon },
    { name: "Macro Calculator", href: "/dashboard/macro-calculator", icon: CalculatorIcon },
    { name: "Client Trackers", href: "/dashboard/check-in-tracker", icon: ActivityIcon },
    { name: "Measurements", href: "/dashboard/measurements", icon: RulerIcon },
    { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        signOut({ callbackUrl: "/login" });
    };

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white w-64 flex-col fixed inset-y-0 border-r border-zinc-200 dark:border-zinc-800 transition-colors">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
                <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-500 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                    SaaS Admin
                </span>
            </div>
            <nav className="flex flex-1 flex-col px-4 py-6">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                        <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`
                      group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors
                      ${pathname === item.href
                                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}
                    `}
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
                            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            <LogOutIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Logout Admin
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

