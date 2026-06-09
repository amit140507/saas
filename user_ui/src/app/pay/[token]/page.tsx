"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, LinkIcon } from "lucide-react";
import api from "@/lib/api";
import { ensureRazorpayLoaded } from "@/lib/razorpay";

type PaymentLinkSummary = {
    id: string;
    status: string;
    source: string;
    amount: string;
    currency: string;
    order_snapshot: {
        client_name: string;
        client_email: string;
        subtotal: string;
        discount_amount: string;
        tax_amount: string;
        total_amount: string;
        notes: string;
        items: Array<{
            product_id: string;
            package_name: string;
            plan_name: string;
            quantity: number;
            unit_price: string;
            total_price: string;
        }>;
    };
};

type CheckoutResponse = {
    gateway: string;
    provider_order_id: string;
    key: string;
    amount: number;
    currency: string;
    intent_id: string;
};

function toCurrency(value: string | number, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

export default function PaymentLinkPage({ params }: { params: { token: string } }) {
    const [summary, setSummary] = useState<PaymentLinkSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const fetchSummary = async () => {
        try {
            const response = await api.get<PaymentLinkSummary>(`payments/payment-links/${params.token}/`);
            setSummary(response.data);
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.response?.data?.error || "Payment link not found.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchSummary();
    }, [params.token]);

    const pollStatus = async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
                const response = await api.get<PaymentLinkSummary>(`payments/payment-links/${params.token}/`);
                setSummary(response.data);
                if (response.data.status === "paid") {
                    setMessage("Payment confirmed. Your invoice is being prepared.");
                    return;
                }
            } catch (pollError) {
                console.error("Failed to refresh payment link", pollError);
            }
        }
        setMessage("Payment submitted. Waiting for confirmation from Razorpay.");
    };

    const handlePayment = async () => {
        setProcessing(true);
        setError("");
        try {
            const response = await api.post<CheckoutResponse>(`payments/payment-links/${params.token}/checkout/`);
            const checkoutReady = await ensureRazorpayLoaded();
            if (!checkoutReady || !window.Razorpay) {
                throw new Error("Razorpay checkout could not be loaded.");
            }

            const razorpay = new window.Razorpay({
                key: response.data.key,
                amount: response.data.amount,
                currency: response.data.currency,
                order_id: response.data.provider_order_id,
                name: "Payment Link",
                description: "Shared payment request",
                handler: () => {
                    setProcessing(false);
                    void pollStatus();
                },
                modal: {
                    ondismiss: () => setProcessing(false),
                },
                theme: {
                    color: "#2563eb",
                },
            });
            razorpay.open();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "Unable to start payment.");
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-zinc-400">Loading payment link...</div>;
    }

    if (error && !summary) {
        return <div className="min-h-screen flex items-center justify-center px-4 text-center text-red-600">{error}</div>;
    }

    if (!summary) {
        return null;
    }

    const isPaid = summary.status === "paid";

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 px-4 py-10">
            <div className="max-w-2xl mx-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <LinkIcon className="w-6 h-6 text-indigo-500" />
                        Payment Link
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {summary.order_snapshot.client_name} • {summary.order_snapshot.client_email}
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    <div className="space-y-3">
                        {summary.order_snapshot.items.map((item) => (
                            <div key={item.product_id} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                                <div>
                                    <div className="font-semibold text-zinc-900 dark:text-white">{item.package_name}</div>
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400">{item.plan_name} x {item.quantity}</div>
                                </div>
                                <div className="font-semibold text-zinc-900 dark:text-white">
                                    {toCurrency(item.total_price, summary.currency)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">Subtotal</span>
                            <span className="font-medium text-zinc-900 dark:text-white">{toCurrency(summary.order_snapshot.subtotal, summary.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">Discount</span>
                            <span className="font-medium text-zinc-900 dark:text-white">{toCurrency(summary.order_snapshot.discount_amount, summary.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">Tax</span>
                            <span className="font-medium text-zinc-900 dark:text-white">{toCurrency(summary.order_snapshot.tax_amount, summary.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                            <span className="font-bold text-zinc-900 dark:text-white">Total</span>
                            <span className="text-lg font-bold text-zinc-900 dark:text-white">{toCurrency(summary.order_snapshot.total_amount, summary.currency)}</span>
                        </div>
                    </div>

                    {message && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handlePayment}
                        disabled={processing || isPaid}
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {processing && <Loader2Icon className="w-4 h-4 animate-spin" />}
                        {isPaid ? "Already Paid" : `Pay ${toCurrency(summary.amount, summary.currency)}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
