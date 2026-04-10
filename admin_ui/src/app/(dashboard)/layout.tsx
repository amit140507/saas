import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors">
            <Sidebar />
            <div className="pl-64 flex flex-col flex-1 min-h-screen">
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
