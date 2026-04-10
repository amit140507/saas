"use client";

import { useState, useRef, useEffect } from "react";
import { BellIcon, SearchIcon, UserIcon, LogOutIcon, SettingsIcon, SunIcon, MoonIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();
    const router = useRouter();

    const handleLogout = () => {
        signOut({ callbackUrl: "/login" });
    };

    // Initial theme setup
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove("dark");
        }
    }, []);

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
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors">
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <form className="relative flex flex-1" action="#" method="GET">
                    <label htmlFor="search-field" className="sr-only">
                        Search
                    </label>
                    <SearchIcon
                        className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-zinc-400 ml-4"
                        aria-hidden="true"
                    />
                    <input
                        id="search-field"
                        className="block h-full w-full border-0 py-0 pl-12 pr-0 text-zinc-900 dark:text-zinc-100 bg-transparent placeholder:text-zinc-400 focus:ring-0 sm:text-sm"
                        placeholder="Search..."
                        type="search"
                        name="search"
                    />
                </form>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Theme Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="-m-2.5 p-2.5 text-zinc-400 hover:text-indigo-600 transition-colors"
                    >
                        <span className="sr-only">Toggle theme</span>
                        {isDarkMode ? (
                            <SunIcon className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <MoonIcon className="h-6 w-6" aria-hidden="true" />
                        )}
                    </button>

                    <button type="button" className="-m-2.5 p-2.5 text-zinc-400 hover:text-zinc-500">
                        <span className="sr-only">View notifications</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Separator */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />

                    {/* Profile dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            className="flex items-center gap-x-4 focus:outline-none"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className="hidden lg:flex lg:items-center">
                                <span className="ml-4 text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100 capitalize" aria-hidden="true">
                                    {session?.user?.name || "Account"}
                                </span>
                            </span>
                            <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                <UserIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                            </div>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white dark:bg-zinc-900 py-2 shadow-lg ring-1 ring-zinc-900/5 focus:outline-none border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-75">
                                <Link
                                    href="/dashboard/profile"
                                    className="flex items-center gap-x-3 px-4 py-2 text-sm leading-6 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <UserIcon className="h-4 w-4 text-zinc-400" />
                                    My Profile
                                </Link>
                                <Link
                                    href="/dashboard/settings"
                                    className="flex items-center gap-x-3 px-4 py-2 text-sm leading-6 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <SettingsIcon className="h-4 w-4 text-zinc-400" />
                                    Settings
                                </Link>
                                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-x-3 px-4 py-2 text-sm leading-6 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                    onClick={handleLogout}
                                >
                                    <LogOutIcon className="h-4 w-4 text-zinc-400" />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
