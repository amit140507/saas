"use client";

import { useState, useEffect } from "react";
import { PackageIcon, ClockIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import api from "@/lib/api";

interface Order {
    id: number;
    product_detail: {
        id: number;
        name: string;
        price: string;
        billing_cycle: string;
        product_name: string;
    };
    subtotal: string;
    discount: string;
    total: string;
    status: string;
    payment_method: string;
    created_at: string;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    pending: { icon: ClockIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20" },
    paid: { icon: CheckCircleIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
    failed: { icon: XCircleIcon, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-500/20" },
    refunded: { icon: RefreshCwIcon, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/20" },
    cancelled: { icon: AlertCircleIcon, color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-500/20" },
};

export default function MyOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get("orders/");
            setOrders(res.data);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <PackageIcon className="w-7 h-7 text-indigo-500" />
                    My Orders
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Track your membership purchases and payment history.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { label: "All", value: "all" },
                    { label: "Pending", value: "pending" },
                    { label: "Paid", value: "paid" },
                    { label: "Failed", value: "failed" },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            filter === tab.value
                                ? "bg-indigo-600 text-white shadow"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center p-12 text-zinc-400">Loading your orders...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center p-12 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <PackageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500 font-medium">No orders found.</p>
                        <p className="text-zinc-400 text-sm mt-1">Head to the shop to get started!</p>
                    </div>
                ) : (
                    filtered.map((order) => {
                        const sc = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = sc.icon;
                        return (
                            <div key={order.id} className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${sc.bg}`}>
                                        <StatusIcon className={`w-5 h-5 ${sc.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white">
                                            {order.product_detail?.product_name} — {order.product_detail?.name}
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Order #{order.id} • {formatDate(order.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {parseFloat(order.discount) > 0 && (
                                        <span className="text-xs text-emerald-500 font-semibold">-${order.discount} off</span>
                                    )}
                                    <span className="text-lg font-black text-zinc-900 dark:text-white">${order.total}</span>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${sc.bg} ${sc.color}`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
