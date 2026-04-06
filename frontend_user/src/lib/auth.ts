import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Django Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const response = await axios.post(`${API_URL}auth/login/`, {
            username: credentials?.email,
            password: credentials?.password,
          });

          if (response.data && response.data.access) {
            // Return user object + tokens
            return {
              id: response.data.user?.id || "user",
              email: credentials?.email,
              name: `${response.data.user?.first_name || ""} ${response.data.user?.last_name || ""}`.trim(),
              accessToken: response.data.access,
              refreshToken: response.data.refresh,
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Exchange Google access_token for Django JWT
          const response = await axios.post(`${API_URL}auth/google/`, {
            access_token: account.access_token,
          });

          if (response.data && response.data.access) {
            // Attach Django tokens to the user object for the JWT callback
            (user as any).accessToken = response.data.access;
            (user as any).refreshToken = response.data.refresh;
            return true;
          }
          return false;
        } catch (error) {
          console.error("Google login failed on backend", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
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
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-this",
};

// Remove redundant initialization
// export default NextAuth(authOptions);
