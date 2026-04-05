"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    HomeIcon,
    UserIcon,
    SettingsIcon,
    LayoutDashboardIcon,
    ShoppingBagIcon,
    LogOutIcon,
    ActivityIcon,
    CalendarIcon,
    FileTextIcon,
    RulerIcon
} from "lucide-react";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { name: "My Orders", href: "/dashboard/orders", icon: ShoppingBagIcon },
    { name: "My Subscription", href: "/dashboard/subscription", icon: CalendarIcon },
    { name: "My Plan", href: "/dashboard/my-plan", icon: FileTextIcon },
    { name: "Check-In Tracker", href: "/dashboard/check-in-tracker", icon: ActivityIcon },
    { name: "Measurements", href: "/dashboard/measurements", icon: RulerIcon },
    { name: "Profile", href: "/dashboard/profile", icon: UserIcon },
    { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        signOut({ callbackUrl: "/login" });
    };

    return (
        <div className="flex bg-zinc-900 text-white w-64 flex-col fixed inset-y-0">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-800">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    SaaS Client
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
                      group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                      ${pathname === item.href
                                                ? "bg-zinc-800 text-white"
                                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"}
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
                            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                            <LogOutIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Logout
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
}
