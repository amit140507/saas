import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-full bg-white dark:bg-zinc-950 transition-colors">
            <Sidebar />
            <div className="pl-64 flex flex-col flex-1">
                <Navbar />
                <main className="py-10 min-h-screen">
                    <div className="px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
