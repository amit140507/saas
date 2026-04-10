"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    PackageIcon, PlusIcon, SearchIcon, XIcon, CreditCardIcon,
    LinkIcon, CheckCircleIcon, ClockIcon, XCircleIcon, AlertCircleIcon,
    RefreshCwIcon, Loader2Icon, CopyIcon, UserIcon, BoxIcon
} from "lucide-react";
import api from "@/lib/api";

interface Client {
    id: number;
    user: { id: number; first_name: string; last_name: string; email: string; public_id: string };
}

interface Plan {
    id: number;
    name: string;
    price: string;
    billing_cycle: string;
    duration_in_days: number | null;
    is_active: boolean;
}

interface Product {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    plans: Plan[];
}

interface Order {
    id: number;
    user_detail: { id: number; first_name: string; last_name: string; email: string; public_id: string };
    product_detail: { id: number; name: string; price: string; billing_cycle: string; product_name: string };
    subtotal: string;
    discount: string;
    total: string;
    status: string;
    payment_method: string;
    payment_link_token: string | null;
    notes: string;
    created_at: string;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    pending: { icon: ClockIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20" },
    paid: { icon: CheckCircleIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
    failed: { icon: XCircleIcon, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-500/20" },
    refunded: { icon: RefreshCwIcon, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/20" },
    cancelled: { icon: AlertCircleIcon, color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-500/20" },
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [form, setForm] = useState({
        user: "",
        product: "",
        plan: "",
        coupon: "",
        payment_method: "card" as "card" | "payment_link",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [generatedLink, setGeneratedLink] = useState("");
    const [copiedLink, setCopiedLink] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get("orders/");
            setOrders(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = async () => {
        setIsModalOpen(true);
        setForm({ user: "", product: "", plan: "", coupon: "", payment_method: "card", notes: "" });
        setFormError("");
        setGeneratedLink("");
        setCopiedLink(false);

        // Fetch clients and products in parallel
        try {
            const [clientsRes, productsRes] = await Promise.all([
                api.get("clients/management/"),
                api.get("billing/products/"),
            ]);
            setClients(Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data.results || []);
            setProducts(Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.results || []);
        } catch (err) {
            console.error("Failed to load form data:", err);
        }
    };

    const selectedProduct = products.find(p => p.id === parseInt(form.product));
    const activePlans = selectedProduct?.plans.filter(p => p.is_active) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.user || !form.plan) {
            setFormError("Please select a client and a plan.");
            return;
        }

        setSubmitting(true);
        setFormError("");
        setGeneratedLink("");

        try {
            const payload: any = {
                user: parseInt(form.user),
                product: parseInt(form.plan),
                payment_method: form.payment_method,
                notes: form.notes,
            };

            const res = await api.post("orders/admin-create/", payload);
            const newOrder = res.data;

            if (newOrder.payment_link) {
                setGeneratedLink(newOrder.payment_link);
            } else {
                setIsModalOpen(false);
                fetchOrders();
            }

            // Refresh orders list
            fetchOrders();
        } catch (err: any) {
            setFormError(err.response?.data?.error || err.response?.data?.detail || "Failed to create order.");
        } finally {
            setSubmitting(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        });
    };

    const filtered = orders
        .filter(o => statusFilter === "all" || o.status === statusFilter)
        .filter(o => {
            if (!search) return true;
            const q = search.toLowerCase();
            const name = `${o.user_detail?.first_name || ""} ${o.user_detail?.last_name || ""}`.toLowerCase();
            return name.includes(q) || o.user_detail?.email?.toLowerCase().includes(q);
        });

    // Count stats
    const counts = {
        all: orders.length,
        pending: orders.filter(o => o.status === "pending").length,
        paid: orders.filter(o => o.status === "paid").length,
        failed: orders.filter(o => o.status === "failed").length,
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <PackageIcon className="w-7 h-7 text-indigo-500" />
                        Orders
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage client orders and generate payment links.</p>
                </div>
                <button
                    onClick={openModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Order
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex gap-2 flex-wrap">
                    {([
                        { label: "All", value: "all", count: counts.all },
                        { label: "Pending", value: "pending", count: counts.pending },
                        { label: "Paid", value: "paid", count: counts.paid },
                        { label: "Failed", value: "failed", count: counts.failed },
                    ] as const).map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                                statusFilter === tab.value
                                    ? "bg-indigo-600 text-white shadow"
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                        >
                            {tab.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                statusFilter === tab.value ? "bg-white/20" : "bg-zinc-200 dark:bg-zinc-800"
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by client name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-zinc-900 dark:text-white text-sm"
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                                <th className="px-6 py-4">Order</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-400">Loading orders...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-400">No orders found.</td></tr>
                            ) : (
                                filtered.map((order) => {
                                    const sc = statusConfig[order.status] || statusConfig.pending;
                                    const StatusIcon = sc.icon;
                                    return (
                                        <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-zinc-900 dark:text-white">#{order.id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-zinc-900 dark:text-white">
                                                    {order.user_detail?.first_name} {order.user_detail?.last_name}
                                                </div>
                                                <div className="text-xs text-zinc-500">{order.user_detail?.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{order.product_detail?.product_name}</div>
                                                <div className="text-xs text-zinc-500">{order.product_detail?.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-zinc-900 dark:text-white">${order.total}</span>
                                                {parseFloat(order.discount) > 0 && (
                                                    <div className="text-xs text-emerald-500">-${order.discount} off</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                                    {order.payment_method === "payment_link" ? (
                                                        <><LinkIcon className="w-3 h-3" /> Link</>
                                                    ) : (
                                                        <><CreditCardIcon className="w-3 h-3" /> Card</>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${sc.bg} ${sc.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/dashboard/orders/${order.id}`}
                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium transition"
                                                >
                                                    View details
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Order Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Create New Order</h2>
                            <button onClick={() => { setIsModalOpen(false); setGeneratedLink(""); }} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-2xl leading-none">&times;</button>
                        </div>

                        {/* Payment Link Generated */}
                        {generatedLink ? (
                            <div className="p-6 space-y-4">
                                <div className="text-center space-y-3">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto">
                                        <CheckCircleIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Payment Link Generated!</h3>
                                    <p className="text-sm text-zinc-500">Share this link with the client to complete payment.</p>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedLink}
                                        className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                                    >
                                        <CopyIcon className="w-4 h-4" />
                                        {copiedLink ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setIsModalOpen(false); setGeneratedLink(""); }}
                                    className="w-full py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Client Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                                        <UserIcon className="w-3 h-3 inline mr-1" />
                                        Client
                                    </label>
                                    <select
                                        required
                                        value={form.user}
                                        onChange={(e) => setForm({ ...form, user: e.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                    >
                                        <option value="">Select a client...</option>
                                        {clients.map((c) => (
                                            <option key={c.user.id} value={c.user.id}>
                                                {c.user.first_name} {c.user.last_name} ({c.user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Product Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                                        <BoxIcon className="w-3 h-3 inline mr-1" />
                                        Product
                                    </label>
                                    <select
                                        required
                                        value={form.product}
                                        onChange={(e) => setForm({ ...form, product: e.target.value, plan: "" })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                    >
                                        <option value="">Select a product...</option>
                                        {products.filter(p => p.is_active).map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Plan Selector */}
                                {selectedProduct && (
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Plan</label>
                                        <select
                                            required
                                            value={form.plan}
                                            onChange={(e) => setForm({ ...form, plan: e.target.value })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                        >
                                            <option value="">Select a plan...</option>
                                            {activePlans.map((plan) => (
                                                <option key={plan.id} value={plan.id}>
                                                    {plan.name} — ${plan.price} / {plan.billing_cycle}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Coupon (optional) */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Coupon Code (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SAVE20"
                                        value={form.coupon}
                                        onChange={(e) => setForm({ ...form, coupon: e.target.value.toUpperCase() })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none"
                                    />
                                </div>

                                {/* Payment Method Toggle */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, payment_method: "card" })}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                                                form.payment_method === "card"
                                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                                            }`}
                                        >
                                            <CreditCardIcon className="w-4 h-4" />
                                            Pay by Card
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, payment_method: "payment_link" })}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                                                form.payment_method === "payment_link"
                                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                                            }`}
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            Send Payment Link
                                        </button>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Notes (Optional)</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Internal notes about this order..."
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none resize-none"
                                    />
                                </div>

                                {formError && (
                                    <p className="text-sm text-red-500 font-medium">{formError}</p>
                                )}

                                {/* Actions */}
                                <div className="pt-2 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {submitting ? (
                                            <><Loader2Icon className="w-4 h-4 animate-spin" /> Creating...</>
                                        ) : form.payment_method === "payment_link" ? (
                                            <><LinkIcon className="w-4 h-4" /> Generate Link</>
                                        ) : (
                                            <><CreditCardIcon className="w-4 h-4" /> Create Order</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
