import { ActivityIcon } from "lucide-react";

export default function DietPlanTrackingPage() {
    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex items-center gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    <ActivityIcon className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Diet Tracking</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Meal logs, diet logs, and client nutrition tracking will live here.
                    </p>
                </div>
            </div>

            <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Tracking workspace coming next</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
                    This route is ready for the diet tracking CRUD flow. The current frontend-only scope keeps planning, assignments, and PDF generation unchanged.
                </p>
            </section>
        </div>
    );
}
