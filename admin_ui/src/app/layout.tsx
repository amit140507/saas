import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import AuthContext from "@/providers/SessionProvider";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaaS Admin",
  description: "Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthContext>
          <QueryProvider>
            {children}
          </QueryProvider>
        </AuthContext>
      </body>
    </html>
  );
}
