import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";

function extractAuthErrorMessage(error: any): string {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) {
    return data;
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
          const response = await axios.post(`${API_URL}auth/login/`, loginPayload);

          if (response.data && response.data.access) {
            // Optional: Add logic here to verify if the user has 'admin' or 'staff' role
            return {
              id: response.data.user?.id || "admin",
              email: credentials?.email,
              name: `${response.data.user?.first_name || ""} ${response.data.user?.last_name || ""}`.trim(),
              accessToken: response.data.access,
              refreshToken: response.data.refresh,
            };
          }
          return null;
        } catch (error: any) {
          const message = extractAuthErrorMessage(error);
          console.error("Admin login error response:", error.response?.data || error.message);
          throw new Error(message);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "admin-fallback-secret-change-this",
};

export default NextAuth(authOptions);
