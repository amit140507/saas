"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, ClockIcon, PackageIcon, RefreshCwIcon, XCircleIcon } from "lucide-react";
import api from "@/lib/api";

type Order = {
    id: string;
    order_number: string;
    status: "pending" | "confirmed" | "cancelled" | "refunded";
    payment_method: string;
    total_amount: string;
    discount_amount: string;
    created_at: string;
    items: Array<{
        id: string;
        product: string | null;
        quantity: number;
        unit_price: string;
        total_price: string;
    }>;
};

const statusConfig = {
    pending: { icon: ClockIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20" },
    confirmed: { icon: CheckCircleIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
    cancelled: { icon: XCircleIcon, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-500/20" },
    refunded: { icon: RefreshCwIcon, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/20" },
} as const;

function toCurrency(value: string | number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

export default function MyOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | Order["status"]>("all");

    useEffect(() => {
        void (async () => {
            try {
                const response = await api.get<Order[]>("orders/orders/");
                setOrders(response.data);
            } catch (error) {
                console.error("Failed to fetch orders", error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filteredOrders = useMemo(() => {
        if (filter === "all") {
            return orders;
        }
        return orders.filter((order) => order.status === filter);
    }, [filter, orders]);

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <PackageIcon className="w-7 h-7 text-indigo-500" />
                    My Orders
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Track your membership purchases and payment history.</p>
            </div>

            <div className="flex gap-2 flex-wrap">
                {(["all", "pending", "confirmed", "cancelled", "refunded"] as const).map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            filter === value
                                ? "bg-indigo-600 text-white shadow"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                    >
                        {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center p-12 text-zinc-400">Loading your orders...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center p-12 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <PackageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500 font-medium">No orders found.</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const status = statusConfig[order.status];
                        const StatusIcon = status.icon;
                        return (
                            <div key={order.id} className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${status.bg}`}>
                                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{order.order_number}</h3>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            {formatDate(order.created_at)} • {order.payment_method === "payment_link" ? "Payment Link" : "Card"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {Number(order.discount_amount) > 0 && (
                                        <span className="text-xs text-emerald-500 font-semibold">{toCurrency(order.discount_amount)} off</span>
                                    )}
                                    <span className="text-lg font-black text-zinc-900 dark:text-white">{toCurrency(order.total_amount)}</span>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${status.bg} ${status.color}`}>
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
