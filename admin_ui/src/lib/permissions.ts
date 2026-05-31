import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import api from "@/lib/api";

export const PERMISSIONS = {
  MANAGE_CLIENTS: "manage_clients",
  VIEW_CLIENTS: "view_clients",
  MANAGE_PLANS: "manage_plans",
  ASSIGN_PLANS: "assign_plans",
  VIEW_PLANS: "view_plans",
  MANAGE_ORDERS: "manage_orders",
  VIEW_ORDERS: "view_orders",
  VIEW_REPORTS: "view_reports",
  MANAGE_STAFF: "manage_staff",
  SEND_COMMUNICATIONS: "send_communications",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_PROGRESS: "view_progress",
  MANAGE_PROGRESS: "manage_progress",
  MANAGE_WORKOUTS: "manage_workouts",
  MANAGE_DIET: "manage_diet",
  MANAGE_SUPPORT: "manage_support",

  STAFF_VIEW: "manage_staff",
  STAFF_CREATE: "manage_staff",
  STAFF_UPDATE: "manage_staff",
  STAFF_DELETE: "manage_staff",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

interface PermissionSession {
  tenantId?: string;
  permissionCodes?: string[];
  permission_codes?: string[];
}

interface CurrentUserPermissionsResponse {
  permission_codes?: string[];
}

export function can(
  permissions: string[] | undefined,
  required: string | string[],
): boolean {
  if (!permissions) return false;

  if (Array.isArray(required)) {
    return required.every((perm) => permissions.includes(perm));
  }

  return permissions.includes(required);
}

function getSessionPermissionCodes(session: PermissionSession | null): string[] {
  return session?.permissionCodes || session?.permission_codes || [];
}

export function useCurrentUserPermissions(required?: string | string[]) {
  const { data: session, status: sessionStatus } = useSession();
  const permissionSession = session as PermissionSession | null;
  const tenantId = permissionSession?.tenantId;
  const sessionPermissionCodes = getSessionPermissionCodes(permissionSession);

  const { data: userPermissions = sessionPermissionCodes, isLoading: permissionsLoading } = useQuery<string[]>({
    queryKey: ["current-user-permissions", tenantId],
    enabled: sessionStatus === "authenticated",
    initialData: sessionPermissionCodes.length ? sessionPermissionCodes : undefined,
    queryFn: async () => {
      const response = await api.get<CurrentUserPermissionsResponse>("auth/user/");
      return response.data.permission_codes || [];
    },
  });

  return {
    hasRequiredPermission: required ? can(userPermissions, required) : true,
    sessionStatus,
    tenantId,
    userPermissions,
    permissionsLoading,
  };
}
