"use client";

import { type CSSProperties, type ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCurrentUserPermissions } from "@/lib/permissions";
import { getCurrentAdminUser } from "@/services/auth.service";

const DEFAULT_BRAND_COLOR = "#EF4444";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

function normalizeHexColor(value: string | null | undefined): string {
    const color = value?.trim();
    if (!color || !HEX_COLOR_PATTERN.test(color)) {
        return DEFAULT_BRAND_COLOR;
    }

    const hex = color.slice(1);
    if (hex.length === 3) {
        return `#${hex.split("").map((char) => char + char).join("").toUpperCase()}`;
    }

    return `#${hex.toUpperCase()}`;
}

function hexToRgb(hexColor: string) {
    const hex = normalizeHexColor(hexColor).slice(1);
    return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
    };
}

function rgbToHex(r: number, g: number, b: number) {
    return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function mix(hexColor: string, target: "#000000" | "#FFFFFF", amount: number) {
    const sourceRgb = hexToRgb(hexColor);
    const targetRgb = hexToRgb(target);
    return rgbToHex(
        sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount,
        sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount,
        sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount,
    );
}

function getContrastForeground(hexColor: string) {
    const { r, g, b } = hexToRgb(hexColor);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.58 ? "#111827" : "#FFFFFF";
}

export default function OrganizationThemeProvider({ children }: { children: ReactNode }) {
    const { tenantId, sessionStatus } = useCurrentUserPermissions();
    const { data: currentUser } = useQuery({
        queryKey: ["organization-theme-current-user", tenantId],
        enabled: sessionStatus === "authenticated",
        queryFn: getCurrentAdminUser,
        staleTime: 60_000,
    });

    const activeMembership = currentUser?.memberships?.find((membership) => membership.tenant_id === tenantId)
        || currentUser?.memberships?.[0];

    const themeStyle = useMemo(() => {
        const primary = normalizeHexColor(activeMembership?.tenant_brand_color);
        const foreground = getContrastForeground(primary);

        return {
            "--primary": primary,
            "--primary-hover": mix(primary, "#000000", 0.12),
            "--primary-soft": `${primary}1A`,
            "--primary-foreground": foreground,
            "--ring": primary,
            "--sidebar-primary": primary,
            "--sidebar-primary-foreground": foreground,
        } as CSSProperties;
    }, [activeMembership?.tenant_brand_color]);

    return (
        <div className="min-h-full" style={themeStyle}>
            {children}
        </div>
    );
}
