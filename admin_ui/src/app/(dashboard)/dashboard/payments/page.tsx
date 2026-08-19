"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    CheckCircleIcon,
    ClockIcon,
    CreditCardIcon,
    ExternalLinkIcon,
    LinkIcon,
    SearchIcon,
    XCircleIcon,
    type LucideIcon,
} from "lucide-react";

import { getAdminPaymentLinks } from "@/services/payment.service";
import type { AdminPaymentLinkRequest } from "@/types/payment.type";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";

type StatusTone = {
    icon: LucideIcon;
    label: string;
    className: string;
};

const statusToneByValue: Record<string, StatusTone> = {
    paid: {
        icon: CheckCircleIcon,
        label: "Paid",
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    processing: {
        icon: ClockIcon,
        label: "Processing",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    },
    pending: {
        icon: ClockIcon,
        label: "Pending",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    failed: {
        icon: XCircleIcon,
        label: "Failed",
        className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    },
    expired: {
        icon: XCircleIcon,
        label: "Expired",
        className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
};

function toCurrency(amount: string, currency: string) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
        return `${currency} ${amount}`;
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(numericAmount);
}

function formatDate(value: string | null) {
    if (!value) {
        return "Not paid";
    }

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getStatusTone(status: string) {
    return statusToneByValue[status] || {
        icon: ClockIcon,
        label: status.replaceAll("_", " "),
        className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    };
}

export default function PaymentsPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);

    const { data: paymentLinks = [], isLoading, isError } = useQuery({
        queryKey: ["admin-payment-links"],
        queryFn: getAdminPaymentLinks,
    });

    const filteredPayments = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return paymentLinks.filter((payment) => {
            const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
            const matchesSearch = !normalizedSearch || [
                payment.client_name,
                payment.client_email,
                payment.order_id || "",
                payment.amount,
                payment.status,
            ].some((value) => value.toLowerCase().includes(normalizedSearch));

            return matchesStatus && matchesSearch;
        });
    }, [paymentLinks, search, statusFilter]);

    const counts = useMemo(() => {
        return paymentLinks.reduce(
            (accumulator, payment) => {
                accumulator.all += 1;
                accumulator[payment.status] = (accumulator[payment.status] || 0) + 1;
                return accumulator;
            },
            { all: 0 } as Record<string, number>
        );
    }, [paymentLinks]);

    const totalPaid = useMemo(() => {
        return paymentLinks
            .filter((payment) => payment.status === "paid")
            .reduce((total, payment) => total + Number(payment.amount || 0), 0);
    }, [paymentLinks]);

    const copyToClipboard = async (payment: AdminPaymentLinkRequest) => {
        if (!payment.payment_url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(payment.payment_url);
            setCopiedPaymentId(payment.id);
            window.setTimeout(() => {
                setCopiedPaymentId((current) => current === payment.id ? null : current);
            }, 2000);
        } catch (error) {
            console.error("Could not copy payment link", error);
        }
    };

    const statusTabs = [
        { label: "All", value: "all", count: counts.all },
        { label: "Pending", value: "pending", count: counts.pending || 0 },
        { label: "Processing", value: "processing", count: counts.processing || 0 },
        { label: "Paid", value: "paid", count: counts.paid || 0 },
        { label: "Failed", value: "failed", count: counts.failed || 0 },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <CreditCardIcon className="h-7 w-7 text-indigo-500" />
                        Payments
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        Track client payment requests, paid orders, and checkout links.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-bold uppercase text-zinc-500">Payment Requests</p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{counts.all}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-bold uppercase text-zinc-500">Paid Amount</p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                        {toCurrency(totalPaid.toFixed(2), paymentLinks[0]?.currency || "INR")}
                    </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-bold uppercase text-zinc-500">Open Requests</p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                        {(counts.pending || 0) + (counts.processing || 0)}
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="flex flex-wrap gap-2">
                    {statusTabs.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setStatusFilter(tab.value)}
                            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                                statusFilter === tab.value
                                    ? "bg-indigo-600 text-white shadow"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            }`}
                        >
                            {tab.label}
                            <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                                statusFilter === tab.value ? "bg-white/20" : "bg-zinc-200 dark:bg-zinc-800"
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search payments..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">Payment Details</h2>
                </div>
                <ResponsiveTableFromRows
                    columns={["Client", "Amount", "Status", "Created", "Paid", "Order", "Actions"]}
                    emptyText="No records found."
                        headerClassName="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50"
                        bodyClassName="divide-y divide-zinc-200 dark:divide-zinc-800"
                >
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">Loading payments...</td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-red-500">Unable to load payment details.</td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">No payment details found.</td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => {
                                    const statusTone = getStatusTone(payment.status);
                                    const StatusIcon = statusTone.icon;

                                    return (
                                        <tr key={payment.id}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-zinc-900 dark:text-white">{payment.client_name}</div>
                                                <div className="text-xs text-zinc-500">{payment.client_email}</div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">
                                                {toCurrency(payment.amount, payment.currency)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusTone.className}`}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {statusTone.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(payment.created_at)}</td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(payment.paid_at)}</td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">
                                                {payment.order_id || "Pending"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(payment)}
                                                        disabled={!payment.payment_url}
                                                        className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-500 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-indigo-400"
                                                    >
                                                        <LinkIcon className="h-4 w-4" />
                                                        {copiedPaymentId === payment.id ? "Copied" : "Copy"}
                                                    </button>
                                                    {payment.payment_url && (
                                                        <a
                                                            href={payment.payment_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                                        >
                                                            <ExternalLinkIcon className="h-4 w-4" />
                                                            Open
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        
                </ResponsiveTableFromRows>
            </div>
        </div>
    );
}
