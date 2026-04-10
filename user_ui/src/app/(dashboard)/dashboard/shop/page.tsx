"use client";

import { useState, useEffect } from "react";
import { ShoppingBagIcon, CheckCircleIcon, StarIcon, ZapIcon, FlameIcon, TagIcon, XIcon, Loader2Icon } from "lucide-react";
import api from "@/lib/api";

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
    created_at: string;
    updated_at: string;
}

interface CheckoutState {
    isOpen: boolean;
    product: Product | null;
    plan: Plan | null;
    couponCode: string;
    couponId: number | null;
    discount: number;
    isApplyingCoupon: boolean;
    isProcessing: boolean;
    couponError: string;
    couponSuccess: string;
}

export default function ShopPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDuration, setSelectedDuration] = useState<string>("quarterly");
    const [checkout, setCheckout] = useState<CheckoutState>({
        isOpen: false,
        product: null,
        plan: null,
        couponCode: "",
        couponId: null,
        discount: 0,
        isApplyingCoupon: false,
        isProcessing: false,
        couponError: "",
        couponSuccess: "",
    });
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchProducts = async () => {
        try {
            const res = await api.get("billing/products/");
            setProducts(res.data);
        } catch (err) {
            console.error("Failed to fetch products:", err);
        } finally {
            setLoading(false);
        }
    };

    const getPlanIcon = (name: string) => {
        if (name.includes("Level 1") || name.includes("Transformation")) return <ZapIcon className="w-6 h-6 text-blue-500" />;
        if (name.includes("Level 2") || name.includes("Excellence")) return <FlameIcon className="w-6 h-6 text-orange-500" />;
        return <StarIcon className="w-6 h-6 text-yellow-500" />;
    };

    const getFeatures = (name: string) => {
        const base = ["Personalized Diet Plan", "Workout Routine", "Progress Tracking"];
        if (name.includes("Excellence") || name.includes("Level 2")) return [...base, "Weekly Check-ins", "Priority Support"];
        if (name.includes("Lifestyle") || name.includes("Level 3")) return [...base, "Bi-weekly Consultations", "Premium Supplements Guide", "24/7 VIP Chat Support"];
        return base;
    };

    const filteredProducts = products
        .filter(p => p.is_active && p.plans.some(plan => plan.billing_cycle === selectedDuration && plan.is_active));

    const getPlanForDuration = (product: Product): Plan | undefined => {
        return product.plans.find(plan => plan.billing_cycle === selectedDuration && plan.is_active);
    };

    const openCheckout = (product: Product, plan: Plan) => {
        setCheckout({
            isOpen: true,
            product,
            plan,
            couponCode: "",
            couponId: null,
            discount: 0,
            isApplyingCoupon: false,
            isProcessing: false,
            couponError: "",
            couponSuccess: "",
        });
    };

    const closeCheckout = () => {
        setCheckout(prev => ({ ...prev, isOpen: false }));
    };

    const applyCoupon = async () => {
        if (!checkout.couponCode.trim()) return;

        setCheckout(prev => ({ ...prev, isApplyingCoupon: true, couponError: "", couponSuccess: "" }));
        try {
            const res = await api.get(`billing/coupons/validate/`, {
                params: { code: checkout.couponCode }
            });
            const coupon = res.data;
            let discountAmount = 0;
            const price = parseFloat(checkout.plan!.price);

            if (coupon.discount_type === "percentage") {
                discountAmount = (price * parseFloat(coupon.discount_value)) / 100;
            } else if (coupon.discount_type === "fixed_amount") {
                discountAmount = parseFloat(coupon.discount_value);
            }

            setCheckout(prev => ({
                ...prev,
                couponId: coupon.id,
                discount: discountAmount,
                isApplyingCoupon: false,
                couponSuccess: `Coupon applied! You save $${discountAmount.toFixed(2)}`,
                couponError: "",
            }));
        } catch {
            setCheckout(prev => ({
                ...prev,
                isApplyingCoupon: false,
                couponError: "Invalid or expired coupon code.",
                couponSuccess: "",
                discount: 0,
                couponId: null,
            }));
        }
    };

    const handlePlaceOrder = async () => {
        if (!checkout.plan) return;

        setCheckout(prev => ({ ...prev, isProcessing: true }));
        try {
            // 1. Create the order
            const orderPayload: any = { product: checkout.plan.id };
            if (checkout.couponId) {
                orderPayload.coupon = checkout.couponId;
            }
            const orderRes = await api.post("orders/", orderPayload);
            const order = orderRes.data;

            // 2. TEMPORARY: Skip payment and mark as paid (dev only)
            try {
                await api.post(`orders/${order.id}/skip-payment/`);
                setToast({ message: "Order placed and marked as paid! (payment skipped)", type: "success" });
            } catch {
                setToast({ message: "Order created but failed to mark as paid.", type: "error" });
            }
            closeCheckout();
        } catch (err: any) {
            setToast({ message: err.response?.data?.error || "Failed to place order. Please try again.", type: "error" });
        } finally {
            setCheckout(prev => ({ ...prev, isProcessing: false }));
        }
    };

    const getTotal = () => {
        if (!checkout.plan) return 0;
        const price = parseFloat(checkout.plan.price);
        return Math.max(0, price - checkout.discount);
    };

    return (
        <div className="p-4 md:p-8 space-y-12 pb-32 max-w-7xl mx-auto">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] max-w-sm px-6 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm animate-slide-in flex items-center gap-3 ${
                    toast.type === "success" 
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500" 
                        : "bg-gradient-to-r from-red-600 to-red-500"
                }`}>
                    {toast.type === "success" ? <CheckCircleIcon className="w-5 h-5 shrink-0" /> : <XIcon className="w-5 h-5 shrink-0" />}
                    {toast.message}
                </div>
            )}

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-900 p-8 md:p-16 text-center shadow-2xl">
                <div className="absolute top-0 right-0 -m-12 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -m-12 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full"></div>

                <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                        <ShoppingBagIcon className="w-3 h-3" />
                        Exclusive Memberships
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                        Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Transformation</span>
                    </h1>

                    {/* Duration Selector */}
                    <div className="flex justify-center mt-8">
                        <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-xl">
                            {[
                                { label: "3 Months", value: "quarterly" },
                                { label: "6 Months", value: "half-yearly" },
                                { label: "12 Months", value: "yearly" }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSelectedDuration(opt.value)}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${selectedDuration === opt.value
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                            : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                {filteredProducts.length === 0 && !loading ? (
                    <div className="col-span-3 text-center p-12 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <p className="text-zinc-500">No membership plans available for this duration.</p>
                    </div>
                ) : (
                    filteredProducts.map((product, idx) => {
                        const plan = getPlanForDuration(product);
                        if (!plan) return null;

                        return (
                            <div
                                key={product.id}
                                className={`group relative flex flex-col p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl 
                                ${idx === 1
                                        ? "bg-white dark:bg-zinc-900 border-indigo-500 shadow-indigo-500/10 scale-105 z-10 ring-4 ring-indigo-500/5"
                                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}
                            >
                                {idx === 1 && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black uppercase px-4 py-1 rounded-full tracking-widest shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-8 flex items-center justify-between">
                                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                        {getPlanIcon(product.name)}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        {selectedDuration === 'quarterly' ? '90 Days Access' : selectedDuration === 'half-yearly' ? '180 Days Access' : '365 Days Access'}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{product.name}</h3>

                                <div className="mt-4 mb-8 flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-zinc-900 dark:text-white">${plan.price}</span>
                                    <span className="text-zinc-500 text-sm">/ {selectedDuration.replace('-', ' ')}</span>
                                </div>

                                <div className="space-y-4 flex-grow">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">What's included:</p>
                                    {getFeatures(product.name).map((feature, fIdx) => (
                                        <div key={fIdx} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => openCheckout(product, plan)}
                                    className={`mt-10 w-full rounded-2xl py-4 font-black text-lg transition-all cursor-pointer
                                    ${idx === 1
                                            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
                                >
                                    Get Started Now
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Trust Section */}
            <div className="text-center space-y-6 pt-12">
                <div className="flex justify-center -space-x-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-white dark:border-zinc-950 overflow-hidden bg-zinc-200">
                            <img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="User" />
                        </div>
                    ))}
                    <div className="w-12 h-12 rounded-full border-4 border-white dark:border-zinc-950 bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                        +5k
                    </div>
                </div>
                <p className="text-zinc-500 font-medium">Joined by 5,000+ members achieving their target goals</p>
            </div>

            {/* Checkout Modal */}
            {checkout.isOpen && checkout.plan && checkout.product && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-indigo-200">Checkout</p>
                                    <h2 className="text-xl font-bold mt-1">{checkout.product.name}</h2>
                                    <p className="text-sm text-indigo-200 mt-1">{checkout.plan.name} • {checkout.plan.billing_cycle.replace('-', ' ')}</p>
                                </div>
                                <button onClick={closeCheckout} className="text-white/70 hover:text-white text-2xl leading-none p-1">&times;</button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Order Summary */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                                    <span>Subtotal</span>
                                    <span className="font-semibold text-zinc-900 dark:text-white">${checkout.plan.price}</span>
                                </div>
                                {checkout.discount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Discount</span>
                                        <span className="font-semibold">-${checkout.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex justify-between">
                                    <span className="font-bold text-zinc-900 dark:text-white">Total</span>
                                    <span className="font-black text-lg text-zinc-900 dark:text-white">${getTotal().toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Coupon Section */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                    <TagIcon className="w-3 h-3 inline mr-1" />
                                    Coupon Code
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter code..."
                                        value={checkout.couponCode}
                                        onChange={(e) => setCheckout(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                                        className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none"
                                    />
                                    <button
                                        onClick={applyCoupon}
                                        disabled={checkout.isApplyingCoupon || !checkout.couponCode.trim()}
                                        className="px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {checkout.isApplyingCoupon ? "..." : "Apply"}
                                    </button>
                                </div>
                                {checkout.couponError && <p className="text-xs text-red-500 mt-1.5">{checkout.couponError}</p>}
                                {checkout.couponSuccess && <p className="text-xs text-emerald-500 mt-1.5">{checkout.couponSuccess}</p>}
                            </div>

                            {/* Pay Button */}
                            <button
                                onClick={handlePlaceOrder}
                                disabled={checkout.isProcessing}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl py-4 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {checkout.isProcessing ? (
                                    <>
                                        <Loader2Icon className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    `Pay $${getTotal().toFixed(2)}`
                                )}
                            </button>

                            <p className="text-xs text-center text-zinc-400">
                                Secure payment powered by Razorpay 🔒
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
