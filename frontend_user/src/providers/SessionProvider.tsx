"use client";

import { SessionProvider } from "next-auth/react";

export default function AuthContext({ children }: { children: React.Context<any> | any }) {
  return <SessionProvider>{children}</SessionProvider>;
}
