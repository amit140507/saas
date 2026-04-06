import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Using the Next.js 16 "proxy" convention
const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    const isAuthPage = pathname.startsWith("/login") || 
                       pathname.startsWith("/register") ||
                       pathname.startsWith("/forgot-password") ||
                       pathname.startsWith("/reset-password");

    if (isAuthPage && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-this",
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const isPublicAuthPage = pathname.startsWith("/login") || 
                                 pathname.startsWith("/register") ||
                                 pathname.startsWith("/forgot-password") ||
                                 pathname.startsWith("/reset-password") ||
                                 pathname === "/";

        if (isPublicAuthPage) return true;
        return !!token;
      },
    },
  }
);

// Export both to be safe, but standard Next.js needs "middleware" or default export
export default authMiddleware;
export const middleware = authMiddleware;

export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/profile/:path*", 
    "/login", 
    "/register", 
    "/register/:path*",
    "/forgot-password",
    "/reset-password/:path*"
  ],
};
