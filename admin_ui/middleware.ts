import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === "/login") {
        return NextResponse.next();
    }

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || "admin-fallback-secret-change-this",
    });

    if (!token?.accessToken) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/login", "/dashboard/:path*"],
};
