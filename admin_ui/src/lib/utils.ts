import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const LAST_DASHBOARD_PATH_KEY = "admin:last-dashboard-path";
export const DEFAULT_DASHBOARD_PATH = "/dashboard";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSafeDashboardPath(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  try {
    const url = new URL(path, "http://admin.local");

    if (url.origin !== "http://admin.local") {
      return null;
    }

    if (url.pathname !== DEFAULT_DASHBOARD_PATH && !url.pathname.startsWith(`${DEFAULT_DASHBOARD_PATH}/`)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function getStoredDashboardPath() {
  if (typeof window === "undefined") {
    return null;
  }

  return getSafeDashboardPath(window.sessionStorage.getItem(LAST_DASHBOARD_PATH_KEY));
}
