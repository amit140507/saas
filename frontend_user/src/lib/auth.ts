import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

/**
 * Decodes the exp (expiration) claim from a JWT.
 */
function decodeJWTExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload.exp * 1000; // to milliseconds
  } catch (error) {
    return 0;
  }
}

/**
 * Exchanges a refresh token for a new access token.
 */
async function refreshAccessToken(token: any) {
  try {
    const response = await axios.post(`${API_URL}auth/token/refresh/`, {
      refresh: token.refreshToken,
    });

    return {
      ...token,
      accessToken: response.data.access,
      accessTokenExpires: decodeJWTExp(response.data.access),
      // SimpleJWT might rotate the refresh token too
      refreshToken: response.data.refresh ?? token.refreshToken,
    };
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

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
            return {
              id: response.data.user?.id || "user",
              email: credentials?.email,
              name: `${response.data.user?.first_name || ""} ${response.data.user?.last_name || ""}`.trim(),
              accessToken: response.data.access,
              refreshToken: response.data.refresh,
            };
          }
          return null;
        } catch (error: any) {
          console.error("Login error response:", error.response?.data || error.message);
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
          const response = await axios.post(`${API_URL}auth/google/`, {
            access_token: account.access_token,
          });

          if (response.data && response.data.access) {
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
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        return {
          accessToken: (user as any).accessToken,
          accessTokenExpires: decodeJWTExp((user as any).accessToken),
          refreshToken: (user as any).refreshToken,
          user,
        };
      }

      // If token hasn't expired, return it
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // If token has expired, refresh it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).user = token.user;
      (session as any).error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-this",
};
