import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authOptions } from "@/lib/auth";
import LastDashboardPathTracker from "@/components/LastDashboardPathTracker";
import OrganizationThemeProvider from "@/providers/OrganizationThemeProvider";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return (
        <OrganizationThemeProvider>
            <div className="min-h-full bg-background text-foreground transition-colors">
                <LastDashboardPathTracker />
                <Sidebar />
                <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
                    <Navbar />
                    <main className="flex-1 bg-muted/30 py-6 transition-colors sm:py-8 lg:py-10">
                        <div className="px-4 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </OrganizationThemeProvider>
    );
}
