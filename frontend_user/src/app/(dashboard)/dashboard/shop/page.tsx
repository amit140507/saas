"use client";

import { useState, useEffect } from "react";
import { ShoppingBagIcon, CheckCircleIcon, StarIcon, ZapIcon, FlameIcon } from "lucide-react";
import api from "@/lib/api";

export default function ShopPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDuration, setSelectedDuration] = useState<string>("quarterly");

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get("billing/products/");
            setProducts(res.data);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            // Fallback for UI design preview
            const fallback = [
                { id: 1, name: "Transformation", price: "149.99", billing_cycle: "quarterly" },
                { id: 2, name: "Transformation", price: "249.99", billing_cycle: "half-yearly" },
                { id: 3, name: "Transformation", price: "399.99", billing_cycle: "yearly" },
                { id: 4, name: "Excellence", price: "199.99", billing_cycle: "quarterly" },
                { id: 5, name: "Excellence", price: "349.99", billing_cycle: "half-yearly" },
                { id: 6, name: "Excellence", price: "599.99", billing_cycle: "yearly" },
                { id: 7, name: "Lifestyle", price: "249.99", billing_cycle: "quarterly" },
                { id: 8, name: "Lifestyle", price: "449.99", billing_cycle: "half-yearly" },
                { id: 9, name: "Lifestyle", price: "799.99", billing_cycle: "yearly" },
            ];
            setProducts(fallback);
        } finally {
            setLoading(false);
        }
    };

    const getPlanIcon = (name: string) => {
        if (name.includes("Transformation")) return <ZapIcon className="w-6 h-6 text-blue-500" />;
        if (name.includes("Excellence")) return <FlameIcon className="w-6 h-6 text-orange-500" />;
        return <StarIcon className="w-6 h-6 text-yellow-500" />;
    };

    const getFeatures = (name: string) => {
        const base = ["Personalized Diet Plan", "Workout Routine", "Progress Tracking"];
        if (name.includes("Excellence")) return [...base, "Weekly Check-ins", "Priority Support"];
        if (name.includes("Lifestyle")) return [...base, "Bi-weekly Consultations", "Premium Supplements Guide", "24/7 VIP Chat Support"];
        return base;
    };

    // Filter products by selected duration
    const filteredProducts = products.filter(p => p.billing_cycle === selectedDuration);

    return (
        <div className="p-4 md:p-8 space-y-12 pb-32 max-w-7xl mx-auto">
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
                    filteredProducts.map((product, idx) => (
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
                                <span className="text-4xl font-black text-zinc-900 dark:text-white">${product.price}</span>
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
                                className={`mt-10 w-full rounded-2xl py-4 font-black text-lg transition-all 
                                ${idx === 1
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
                            >
                                Get Started Now
                            </button>
                        </div>
                    ))
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
        </div>
    );
}
