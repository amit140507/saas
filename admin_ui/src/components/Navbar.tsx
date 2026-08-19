"use client";

import { useState, useRef, useEffect } from "react";
import { BellIcon, ShieldIcon, UserIcon, LogOutIcon, SunIcon, MoonIcon } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentAdminUser } from "@/services/auth.service";

function getInitialDarkMode() {
    if (typeof window === "undefined") {
        return false;
    }

    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export default function Navbar() {
    const { status: sessionStatus } = useSession();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ["navbar-current-user"],
        enabled: sessionStatus === "authenticated",
        queryFn: getCurrentAdminUser,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const handleLogout = () => {
        signOut({ callbackUrl: "/login" });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-end gap-x-4 border-b border-border bg-card px-4 pl-16 text-card-foreground shadow-sm transition-colors sm:gap-x-6 sm:px-6 lg:px-8">
            <div className="flex flex-1 justify-end gap-x-4 self-stretch lg:gap-x-6">
                
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Theme Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="-m-2.5 p-2.5 text-muted-foreground transition-colors hover:text-primary"
                    >
                        <span className="sr-only">Toggle theme</span>
                        {isDarkMode ? (
                            <SunIcon className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <MoonIcon className="h-6 w-6" aria-hidden="true" />
                        )}
                    </button>

                    <button type="button" className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground">
                        <span className="sr-only">View notifications</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Separator */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

                    {/* Admin Profile */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            className="flex items-center gap-x-4 focus:outline-none"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <div className="flex flex-col items-end hidden lg:flex">
                                {user ? (
                                    <>
                                        <span className="text-sm font-semibold leading-6 text-foreground" aria-hidden="true">
                                            {user.username || user.email || "Admin"}
                                        </span>
                                        <span className="text-xs capitalize text-primary">{user.memberships?.[0]?.role}</span>
                                    </>
                                ) : isUserLoading || sessionStatus === "loading" ? (
                                    <>
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="mt-1 h-3 w-14" />
                                    </>
                                ) : (
                                    <span className="text-sm font-semibold leading-6 text-foreground" aria-hidden="true">
                                        Admin
                                    </span>
                                )}
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary-soft transition-colors hover:bg-primary-soft/80">
                                <ShieldIcon className="h-5 w-5 text-primary" />
                            </div>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md border border-border bg-popover py-2 text-popover-foreground shadow-lg ring-1 ring-foreground/5 animate-in fade-in zoom-in duration-75 focus:outline-none">
                                <Link
                                    href="/dashboard/profile"
                                    className="flex items-center gap-x-3 px-4 py-2 text-sm leading-6 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    My Profile
                                </Link>
                                
                                <div className="my-1 border-t border-border"></div>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-x-3 px-4 py-2 text-left text-sm leading-6 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                    onClick={handleLogout}
                                >
                                    <LogOutIcon className="h-4 w-4 text-muted-foreground" />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
