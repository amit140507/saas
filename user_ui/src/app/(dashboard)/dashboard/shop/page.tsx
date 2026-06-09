"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, PackageIcon, ShoppingBagIcon, TagIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ensureRazorpayLoaded } from "@/lib/razorpay";

type Plan = {
    id: string;
    name: string;
    price: string;
    duration_in_days: number | null;
    is_active: boolean;
};

type Package = {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    plans: Plan[];
};

type CheckoutResponse = {
    gateway: string;
    provider_order_id: string;
    key: string;
    amount: number;
    currency: string;
    intent_id: string;
};

type CheckoutState = {
    plan: Plan | null;
    packageName: string;
    couponCode: string;
    notes: string;
    isOpen: boolean;
    isSubmitting: boolean;
    error: string;
};

const emptyCheckoutState: CheckoutState = {
    plan: null,
    packageName: "",
    couponCode: "",
    notes: "",
    isOpen: false,
    isSubmitting: false,
    error: "",
};

function toCurrency(value: string | number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

export default function ShopPage() {
    const router = useRouter();
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<string>("");
    const [checkout, setCheckout] = useState<CheckoutState>(emptyCheckoutState);

    useEffect(() => {
        void (async () => {
            try {
                const response = await api.get<Package[]>("packages/");
                setPackages(response.data);
            } catch (error) {
                console.error("Failed to load packages", error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const activePackages = useMemo(() => {
        return packages
            .filter((item) => item.is_active)
            .map((item) => ({
                ...item,
                plans: item.plans.filter((plan) => plan.is_active),
            }))
            .filter((item) => item.plans.length > 0);
    }, [packages]);

    const startCheckout = (packageItem: Package, plan: Plan) => {
        setCheckout({
            plan,
            packageName: packageItem.name,
            couponCode: "",
            notes: "",
            isOpen: true,
            isSubmitting: false,
            error: "",
        });
    };

    const closeCheckout = () => setCheckout(emptyCheckoutState);

    const pollIntentStatus = async (intentId: string) => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
                const response = await api.get(`payments/checkout-intents/${intentId}/`);
                if (response.data.status === "paid") {
                    setToast("Payment received. Your order is now confirmed.");
                    router.push("/dashboard/orders");
                    return;
                }
            } catch (error) {
                console.error("Failed to refresh checkout intent", error);
            }
        }
        setToast("Payment submitted. We are waiting for confirmation from Razorpay.");
    };

    const handleCheckout = async () => {
        if (!checkout.plan) {
            return;
        }

        setCheckout((current) => ({ ...current, isSubmitting: true, error: "" }));
        try {
            const response = await api.post<CheckoutResponse>("payments/checkout-intents/", {
                plan_id: checkout.plan.id,
                coupon_code: checkout.couponCode.trim(),
                notes: checkout.notes,
            });

            const checkoutReady = await ensureRazorpayLoaded();
            if (!checkoutReady || !window.Razorpay) {
                throw new Error("Razorpay checkout could not be loaded.");
            }

            const razorpay = new window.Razorpay({
                key: response.data.key,
                amount: response.data.amount,
                currency: response.data.currency,
                order_id: response.data.provider_order_id,
                name: checkout.packageName,
                description: checkout.plan.name,
                handler: () => {
                    void pollIntentStatus(response.data.intent_id);
                    closeCheckout();
                },
                modal: {
                    ondismiss: () => {
                        setCheckout((current) => ({ ...current, isSubmitting: false }));
                    },
                },
                theme: {
                    color: "#2563eb",
                },
            });
            razorpay.open();
        } catch (error: any) {
            const message = error?.response?.data?.error
                || error?.response?.data?.detail
                || error?.response?.data?.coupon_code?.[0]
                || error?.message
                || "Unable to start payment right now.";
            setCheckout((current) => ({ ...current, isSubmitting: false, error: message }));
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <ShoppingBagIcon className="w-7 h-7 text-indigo-500" />
                    Membership Plans
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Choose a plan and pay securely with Razorpay.</p>
            </div>

            {toast && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {toast}
                </div>
            )}

            {loading ? (
                <div className="text-center p-12 text-zinc-400">Loading plans...</div>
            ) : activePackages.length === 0 ? (
                <div className="text-center p-12 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <PackageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium">No plans are available right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activePackages.map((packageItem) => (
                        <div key={packageItem.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{packageItem.name}</h2>
                            {packageItem.description && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{packageItem.description}</p>
                            )}

                            <div className="mt-5 space-y-3">
                                {packageItem.plans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => startCheckout(packageItem, plan)}
                                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-left hover:border-indigo-500 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="font-semibold text-zinc-900 dark:text-white">{plan.name}</div>
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {plan.duration_in_days ? `${plan.duration_in_days} days access` : "Flexible duration"}
                                                </div>
                                            </div>
                                            <div className="text-right font-bold text-zinc-900 dark:text-white">{toCurrency(plan.price)}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {checkout.isOpen && checkout.plan && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{checkout.packageName}</h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{checkout.plan.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCheckout}
                                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500">Plan total</span>
                                    <span className="font-bold text-zinc-900 dark:text-white">{toCurrency(checkout.plan.price)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                    <TagIcon className="w-3 h-3 inline mr-1" />
                                    Coupon Code
                                </label>
                                <input
                                    value={checkout.couponCode}
                                    onChange={(event) => setCheckout((current) => ({ ...current, couponCode: event.target.value.toUpperCase() }))}
                                    placeholder="Optional coupon"
                                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Notes</label>
                                <textarea
                                    rows={3}
                                    value={checkout.notes}
                                    onChange={(event) => setCheckout((current) => ({ ...current, notes: event.target.value }))}
                                    placeholder="Optional notes for your coach"
                                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            {checkout.error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                                    {checkout.error}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleCheckout}
                                disabled={checkout.isSubmitting}
                                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {checkout.isSubmitting && <Loader2Icon className="w-4 h-4 animate-spin" />}
                                Pay {toCurrency(checkout.plan.price)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
