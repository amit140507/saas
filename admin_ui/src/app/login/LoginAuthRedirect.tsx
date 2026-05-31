"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { DEFAULT_DASHBOARD_PATH, getStoredDashboardPath } from "@/lib/utils";

export default function LoginAuthRedirect({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === "authenticated") {
            router.replace(getStoredDashboardPath() || DEFAULT_DASHBOARD_PATH);
        }
    }, [router, status]);

    if (status === "loading" || status === "authenticated") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-sm text-zinc-400">
                Loading...
            </div>
        );
    }

    return children;
}
