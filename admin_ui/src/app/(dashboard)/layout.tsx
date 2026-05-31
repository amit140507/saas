import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authOptions } from "@/lib/auth";
import LastDashboardPathTracker from "@/components/LastDashboardPathTracker";

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
        <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors">
            <LastDashboardPathTracker />
            <Sidebar />
            <div className="flex flex-col flex-1 min-h-screen lg:pl-64">
                <Navbar />
                <main className="py-10 bg-zinc-50 dark:bg-zinc-900 flex-1 transition-colors">
                    <div className="px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>

    );
}
