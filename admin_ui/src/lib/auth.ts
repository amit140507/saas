import NextAuth, { NextAuthOptions } from "next-auth";
import type { User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

import { API_URL } from "@/lib/config";

interface UserMembership {
  tenant_id: string;
  tenant_name: string;
  tenant_brand_color?: string;
  role: string | null;
  is_owner: boolean;
}

interface AdminLoginResponse {
  access?: string;
  refresh?: string;
  user?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    permission_codes?: string[];
    memberships?: UserMembership[];
  };
}

type AdminAuthUser = User & {
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  tenantName?: string;
  permissionCodes?: string[];
};

type AdminJwt = JWT & {
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  tenantName?: string;
  permissionCodes?: string[];
};

interface AuthErrorResponse {
  detail?: string;
  non_field_errors?: string[];
}

function extractAuthErrorMessage(error: unknown): string {
  const data = axios.isAxiosError<AuthErrorResponse | string>(error)
    ? error.response?.data
    : undefined;
  if (typeof data === "string" && data.trim()) {
    return data;
  }
  if (!data || typeof data === "string") {
    return "Unable to log in with provided credentials.";
  }
  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return String(data.non_field_errors[0]);
  }
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }
  return "Unable to log in with provided credentials.";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const identifier = credentials?.email?.trim() || "";
          const loginPayload = {
            password: credentials?.password,
            ...(identifier.includes("@")
              ? { email: identifier }
              : { username: identifier }),
          };
          const response = await axios.post<AdminLoginResponse>(`${API_URL}auth/login/`, loginPayload);

          if (response.data && response.data.access) {
            const memberships = response.data.user?.memberships || [];
            const activeMembership = memberships[0];

            // Optional: Add logic here to verify if the user has 'admin' or 'staff' role
            return {
              id: response.data.user?.id || "admin",
              email: credentials?.email,
              name: `${response.data.user?.first_name || ""} ${response.data.user?.last_name || ""}`.trim(),
              accessToken: response.data.access,
              refreshToken: response.data.refresh,
              tenantId: activeMembership?.tenant_id,
              tenantName: activeMembership?.tenant_name,
              permissionCodes: response.data.user?.permission_codes || [],
            };
          }
          return null;
        } catch (error: unknown) {
          const message = extractAuthErrorMessage(error);
          const errorDetails = axios.isAxiosError(error)
            ? error.response?.data || error.message
            : error;
          console.error("Admin login error response:", errorDetails);
          throw new Error(message);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const adminUser = user as AdminAuthUser;
        const adminToken = token as AdminJwt;
        adminToken.accessToken = adminUser.accessToken;
        adminToken.refreshToken = adminUser.refreshToken;
        adminToken.tenantId = adminUser.tenantId;
        adminToken.tenantName = adminUser.tenantName;
        adminToken.permissionCodes = adminUser.permissionCodes;
      }
      return token;
    },
    async session({ session, token }) {
      const adminToken = token as AdminJwt;
      return {
        ...session,
        accessToken: adminToken.accessToken,
        tenantId: adminToken.tenantId,
        tenantName: adminToken.tenantName,
        permissionCodes: adminToken.permissionCodes || [],
      };
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "admin-fallback-secret-change-this",
};

export default NextAuth(authOptions);
