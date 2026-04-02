"use client";

import { useState, useRef, useEffect } from "react";
import { BellIcon, SearchIcon, ShieldIcon, UserIcon, LogOutIcon, SettingsIcon, SunIcon, MoonIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CookieManager from "js-cookie";
import api from "@/lib/api";

export default function Navbar() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get("auth/user/");
                setUser(response.data);
            } catch (err) {
                console.error("Failed to fetch user in Navbar", err);
            }
        };
        fetchUser();
    }, []);

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

    const handleLogout = () => {
        CookieManager.remove("access_token");
        CookieManager.remove("refresh_token");
        router.push("/login");
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
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 text-zinc-900 dark:text-white transition-colors">
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <form className="relative flex flex-1" action="#" method="GET">
                    <label htmlFor="search-field" className="sr-only">
                        Search
                    </label>
                    <SearchIcon
                        className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-zinc-400 dark:text-zinc-500 ml-4"
                        aria-hidden="true"
                    />
                    <input
                        id="search-field"
                        className="block h-full w-full border-0 py-0 pl-12 pr-0 bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:ring-0 sm:text-sm"
                        placeholder="Search Admin Console..."
                        type="search"
                        name="search"
                    />
                </form>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Theme Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="-m-2.5 p-2.5 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                        <span className="sr-only">Toggle theme</span>
                        {isDarkMode ? (
                            <SunIcon className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <MoonIcon className="h-6 w-6" aria-hidden="true" />
                        )}
                    </button>

                    <button type="button" className="-m-2.5 p-2.5 text-zinc-400 hover:text-zinc-300">
                        <span className="sr-only">View notifications</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Separator */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />

                    {/* Admin Profile */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            className="flex items-center gap-x-4 focus:outline-none"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <div className="flex flex-col items-end hidden lg:flex">
                                <span className="text-sm font-semibold leading-6 text-zinc-900 dark:text-white" aria-hidden="true">
                                    {user ? user.username : 'Admin User'}
                                </span>
                                <span className="text-xs text-red-600 dark:text-red-400 capitalize">{user?.role || 'Super Admin'}</span>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
                                <ShieldIcon className="h-5 w-5 text-red-600 dark:text-red-500" />
                            </div>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white dark:bg-zinc-900 py-2 shadow-lg ring-1 ring-zinc-900/5 focus:outline-none border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-75">
                                <Link
                                    href="/dashboard/profile"
                                    className="flex items-center gap-x-3 px-4 py-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <UserIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                    Admin Profile
                                </Link>
                                <Link
                                    href="/dashboard/settings"
                                    className="flex items-center gap-x-3 px-4 py-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <SettingsIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                    System Settings
                                </Link>
                                <div className="border-t border-zinc-200 dark:border-zinc-800 my-1"></div>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-x-3 px-4 py-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors text-left"
                                    onClick={handleLogout}
                                >
                                    <LogOutIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
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
