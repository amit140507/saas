export default function AdminDashboardPage() {
    return (
        <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white transition-colors">Admin Overview</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 transition-colors">
                Monitor system status, users, and payments from this console.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { name: 'Total Users', value: '1,234'},
                    { name: 'Today\'s Order', value: '45' },
                ].map((stat) => (
                    <div key={stat.name} className="overflow-hidden rounded-xl bg-white dark:bg-zinc-800/50 px-4 py-5 shadow-sm border border-zinc-200 dark:border-zinc-700/50 sm:p-6 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <dt className="truncate text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-colors">{stat.name}</dt>
                        <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                            <div className="flex items-baseline text-2xl font-semibold text-zinc-900 dark:text-white transition-colors">
                                {stat.value}
                                
                            </div>
                        </dd>
                    </div>
                ))}
            </div>
        </div>
    );
}
