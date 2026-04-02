export default function DashboardPage() {
    return (
        <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Welcome to your Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-600">
                Here you can manage your orders, profile, and settings.
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-8">
                {[
                    { name: 'Total Users', value: '12,345', change: '+12%', icon: 'Users' },
                    { name: 'Active Subscriptions', value: '1,234', change: '+3%', icon: 'CreditCard' },
                    { name: 'Monthly Revenue', value: '$45,678', change: '+8%', icon: 'DollarSign' },
                    { name: 'Churn Rate', value: '2.4%', change: '-0.5%', icon: 'BarChart' },
                ].map((stat) => (
                    <div key={stat.name} className="bg-white dark:bg-zinc-900 overflow-hidden shadow rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">{stat.name}</p>
                                    <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 px-5 py-3 border-t border-zinc-200 dark:border-zinc-800">
                            <div className="text-sm">
                                <span className={stat.change.startsWith('+') ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                                    {stat.change}
                                </span>
                                <span className="text-zinc-500 dark:text-zinc-400"> from last month</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
