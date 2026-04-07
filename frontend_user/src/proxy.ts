import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

export default async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-this",
  });

  const { pathname } = req.nextUrl;

  // Redirect authenticated users away from auth pages
  if (isPublicPath(pathname) && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect unauthenticated users to login
  if (!isPublicPath(pathname) && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/login",
    "/register",
    "/register/:path*",
    "/forgot-password",
    "/reset-password/:path*",
  ],
};
