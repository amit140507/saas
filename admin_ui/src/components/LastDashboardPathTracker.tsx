"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getSafeDashboardPath, LAST_DASHBOARD_PATH_KEY } from "@/lib/utils";

export default function LastDashboardPathTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const search = searchParams.toString();
        const currentPath = `${pathname}${search ? `?${search}` : ""}`;
        const safePath = getSafeDashboardPath(currentPath);

        if (safePath) {
            window.sessionStorage.setItem(LAST_DASHBOARD_PATH_KEY, safePath);
        }
    }, [pathname, searchParams]);

    return null;
}
