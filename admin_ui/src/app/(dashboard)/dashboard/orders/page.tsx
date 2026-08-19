"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircleIcon,
    BanknoteIcon,
    BoxIcon,
    CheckCircleIcon,
    ClockIcon,
    CreditCardIcon,
    EditIcon,
    LandmarkIcon,
    LinkIcon,
    Loader2Icon,
    PackageIcon,
    PlusIcon,
    RefreshCwIcon,
    SearchIcon,
    SmartphoneIcon,
    Trash2Icon,
    UserIcon,
    XCircleIcon,
    XIcon,
    type LucideIcon,
} from "lucide-react";

import { getClients } from "@/services/client.service";
import { getCoupons } from "@/services/coupon.service";
import { getOrders, updateOrder } from "@/services/order.service";
import { createAdminCheckoutIntent, createAdminManualPayment, createAdminPaymentLink, getAdminPaymentLinks, getCheckoutIntentStatus } from "@/services/payment.service";
import { getPackages } from "@/services/package.service";
import { ensureRazorpayLoaded } from "@/lib/razorpay";
import type { ClientData } from "@/types/client.type";
import type { Coupon } from "@/types/coupon.type";
import type { ManualPaymentMethod, Order, OrderItemPayload, OrderPayload, OrderPaymentMethod, OrderStatus } from "@/types/order.type";
import type { AdminPaymentLinkPayload, AdminPaymentLinkRequest, AdminPaymentLinkResponse } from "@/types/payment.type";
import type { Package } from "@/types/package.type";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";

type ModalMode = "create" | "edit";
type PaymentFlow = "manual" | "payment_link" | "checkout";

type OrderItemForm = {
    rowId: string;
    product: string;
    quantity: string;
    unit_price: string;
};

type OrderForm = {
    client: string;
    coupon: string;
    status: OrderStatus;
    payment_method: OrderPaymentMethod;
    payment_flow: PaymentFlow;
    manual_payment_method: ManualPaymentMethod;
    discount_amount: string;
    tax_amount: string;
    notes: string;
    items: OrderItemForm[];
};

type StatusConfig = {
    icon: LucideIcon;
    color: string;
    bg: string;
};

const statusConfig: Record<OrderStatus, StatusConfig> = {
    pending: { icon: ClockIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20" },
    confirmed: { icon: CheckCircleIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
    cancelled: { icon: XCircleIcon, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-500/20" },
    refunded: { icon: RefreshCwIcon, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/20" },
};

const manualPaymentMethods: Array<{
    value: ManualPaymentMethod;
    label: string;
    icon: LucideIcon;
}> = [
    { value: "cash", label: "Cash", icon: BanknoteIcon },
    { value: "upi", label: "UPI", icon: SmartphoneIcon },
    { value: "card", label: "Card", icon: CreditCardIcon },
    { value: "bank_transfer", label: "Bank Transfer", icon: LandmarkIcon },
    { value: "pos", label: "POS", icon: CreditCardIcon },
];

const manualPaymentMethodSet = new Set<OrderPaymentMethod>(
    manualPaymentMethods.map((method) => method.value)
);

function getPaymentMethodMeta(method: OrderPaymentMethod): { label: string; icon: LucideIcon } {
    if (method === "payment_link") {
        return { label: "Payment Link", icon: LinkIcon };
    }

    if (method === "checkout") {
        return { label: "Razorpay Checkout", icon: CreditCardIcon };
    }

    return manualPaymentMethods.find((option) => option.value === method) || manualPaymentMethods[0];
}

const createEmptyItem = (): OrderItemForm => ({
    rowId: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    product: "",
    quantity: "1",
    unit_price: "0.00",
});

const createEmptyForm = (): OrderForm => ({
    client: "",
    coupon: "",
    status: "pending",
    payment_method: "cash",
    payment_flow: "manual",
    manual_payment_method: "cash",
    discount_amount: "0.00",
    tax_amount: "0.00",
    notes: "",
    items: [createEmptyItem()],
});

function toCurrency(value: string | number) {
    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return String(value);
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
}

function toMoneyString(value: number) {
    return Math.max(value, 0).toFixed(2);
}

function getClientName(client?: ClientData) {
    if (!client) {
        return "Unknown client";
    }

    const name = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
    return name || client.user.email || "Unnamed client";
}

function getCouponLabel(coupon: Coupon) {
    const value = Number(coupon.discount_value);
    const discount = coupon.discount_type === "percent"
        ? `${Number.isNaN(value) ? coupon.discount_value : value}%`
        : toCurrency(coupon.discount_value);
    return `${coupon.code} - ${discount}`;
}

function getErrorMessage(error: unknown, fallback: string) {
    const data = (error as {
        response?: {
            data?: {
                detail?: string;
                error?: string;
                items?: string | string[];
                non_field_errors?: string[];
            };
        };
    }).response?.data;

    if (data?.error) {
        return data.error;
    }

    if (data?.detail) {
        return data.detail;
    }

    if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length) {
        return data.non_field_errors[0];
    }

    if (Array.isArray(data?.items) && data.items.length) {
        return data.items[0];
    }

    if (typeof data?.items === "string") {
        return data.items;
    }

    return fallback;
}

function flattenPlans(packages: Package[]) {
    return packages.flatMap((packageItem) =>
        packageItem.plans.map((plan) => ({
            ...plan,
            packageName: packageItem.name,
            packageActive: packageItem.is_active,
        }))
    );
}

function toForm(order: Order): OrderForm {
    const paymentFlow: PaymentFlow = order.payment_method === "payment_link"
        ? "payment_link"
        : order.payment_method === "checkout"
            ? "checkout"
            : "manual";
    const manualPaymentMethod = manualPaymentMethodSet.has(order.payment_method)
        ? order.payment_method as ManualPaymentMethod
        : "cash";

    return {
        client: order.client,
        coupon: order.coupon || "",
        status: order.status,
        payment_method: order.payment_method,
        payment_flow: paymentFlow,
        manual_payment_method: manualPaymentMethod,
        discount_amount: order.discount_amount,
        tax_amount: order.tax_amount,
        notes: order.notes || "",
        items: order.items.length
            ? order.items.map((item) => ({
                rowId: item.id,
                product: item.product || "",
                quantity: String(item.quantity),
                unit_price: item.unit_price,
            }))
            : [createEmptyItem()],
    };
}

export default function AdminOrdersPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [form, setForm] = useState<OrderForm>(createEmptyForm);
    const [formError, setFormError] = useState("");
    const [latestPaymentLink, setLatestPaymentLink] = useState<AdminPaymentLinkResponse | null>(null);
    const [copiedPaymentLinkId, setCopiedPaymentLinkId] = useState<string | null>(null);

    const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ["admin-orders"],
        queryFn: getOrders,
    });

    const { data: paymentLinks = [], isLoading: isLoadingPaymentLinks } = useQuery({
        queryKey: ["admin-payment-links"],
        queryFn: getAdminPaymentLinks,
    });

    const { data: clients = [], isLoading: isLoadingClients } = useQuery({
        queryKey: ["admin-order-clients"],
        queryFn: getClients,
        enabled: isModalOpen || orders.length > 0,
    });

    const { data: packages = [], isLoading: isLoadingPackages } = useQuery({
        queryKey: ["admin-order-packages"],
        queryFn: getPackages,
        enabled: isModalOpen || orders.length > 0,
    });

    const { data: coupons = [], isLoading: isLoadingCoupons } = useQuery({
        queryKey: ["admin-order-coupons"],
        queryFn: getCoupons,
        enabled: isModalOpen || orders.length > 0,
    });

    const planOptions = useMemo(() => flattenPlans(packages), [packages]);
    const activeCoupons = useMemo(() => {
        const selectedCouponId = form.coupon;
        return coupons.filter((coupon) => coupon.is_active || coupon.id === selectedCouponId);
    }, [coupons, form.coupon]);
    const activePlanOptions = useMemo(() => {
        const selectedPlanIds = new Set(form.items.map((item) => item.product).filter(Boolean));
        return planOptions.filter((plan) => (plan.packageActive && plan.is_active) || selectedPlanIds.has(plan.id));
    }, [form.items, planOptions]);

    const clientById = useMemo(() => {
        return new Map(clients.map((client) => [client.id, client]));
    }, [clients]);

    const planById = useMemo(() => {
        return new Map(planOptions.map((plan) => [plan.id, plan]));
    }, [planOptions]);

    const couponById = useMemo(() => {
        return new Map(coupons.map((coupon) => [coupon.id, coupon]));
    }, [coupons]);

    const computedItems = useMemo(() => {
        return form.items.map((item) => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unit_price) || 0;
            return {
                ...item,
                total_price: toMoneyString(quantity * unitPrice),
            };
        });
    }, [form.items]);

    const subtotal = computedItems.reduce((sum, item) => sum + Number(item.total_price), 0);
    const discountAmount = Number(form.discount_amount) || 0;
    const taxAmount = Number(form.tax_amount) || 0;
    const totalAmount = Math.max(subtotal - discountAmount + taxAmount, 0);

    const refreshOrders = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    };

    const refreshPaymentLinks = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-payment-links"] });
    };

    const pollCheckoutStatus = async (intentId: string) => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
                const intent = await getCheckoutIntentStatus(intentId);
                if (intent.status === "paid") {
                    refreshOrders();
                    return;
                }
            } catch (error) {
                console.error("Could not refresh checkout status", error);
            }
        }
        refreshOrders();
    };

    const createPaymentLinkMutation = useMutation({
        mutationFn: createAdminPaymentLink,
        onSuccess: (result) => {
            setLatestPaymentLink(result);
            refreshPaymentLinks();
            closeModal();
        },
        onError: (error: unknown) => {
            setFormError(getErrorMessage(error, "Could not create payment link. Please check the details and try again."));
        },
    });

    const createManualPaymentMutation = useMutation({
        mutationFn: createAdminManualPayment,
        onSuccess: () => {
            refreshOrders();
            closeModal();
        },
        onError: (error: unknown) => {
            setFormError(getErrorMessage(error, "Could not record manual payment. Please check the details and try again."));
        },
    });

    const createAdminCheckoutMutation = useMutation({
        mutationFn: createAdminCheckoutIntent,
        onSuccess: async (result) => {
            const checkoutReady = await ensureRazorpayLoaded();
            if (!checkoutReady || !window.Razorpay) {
                setFormError("Razorpay checkout could not be loaded.");
                return;
            }

            const client = clientById.get(form.client);
            const razorpay = new window.Razorpay({
                key: result.key,
                amount: result.amount,
                currency: result.currency,
                order_id: result.provider_order_id,
                name: getClientName(client),
                description: "Admin order payment",
                handler: () => {
                    void pollCheckoutStatus(result.intent_id);
                    closeModal();
                },
                modal: {
                    ondismiss: () => {
                        setFormError("Payment was not completed. The order will be created after successful payment.");
                    },
                },
                theme: {
                    color: "#4f46e5",
                },
            });
            razorpay.open();
        },
        onError: (error: unknown) => {
            setFormError(getErrorMessage(error, "Could not start checkout. Please check the details and try again."));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: OrderPayload }) => updateOrder(id, payload),
        onSuccess: () => {
            refreshOrders();
            closeModal();
        },
        onError: (error: unknown) => {
            setFormError(getErrorMessage(error, "Could not update order. Please check the details and try again."));
        },
    });

    const isSubmitting = updateMutation.isPending || createPaymentLinkMutation.isPending || createManualPaymentMutation.isPending || createAdminCheckoutMutation.isPending;
    const selectedManualPaymentMethod = getPaymentMethodMeta(form.manual_payment_method);
    const SelectedManualPaymentIcon = selectedManualPaymentMethod.icon;

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();
        return orders
            .filter((order) => statusFilter === "all" || order.status === statusFilter)
            .filter((order) => {
                if (!query) {
                    return true;
                }

                const client = clientById.get(order.client);
                const clientName = getClientName(client).toLowerCase();
                const clientEmail = client?.user.email.toLowerCase() || "";
                const orderNumber = order.order_number.toLowerCase();
                return clientName.includes(query) || clientEmail.includes(query) || orderNumber.includes(query);
            });
    }, [clientById, orders, search, statusFilter]);

    const counts = {
        all: orders.length,
        pending: orders.filter((order) => order.status === "pending").length,
        confirmed: orders.filter((order) => order.status === "confirmed").length,
        cancelled: orders.filter((order) => order.status === "cancelled").length,
        refunded: orders.filter((order) => order.status === "refunded").length,
    };

    const openCreateModal = () => {
        setModalMode("create");
        setSelectedOrder(null);
        setForm(createEmptyForm());
        setFormError("");
        setIsModalOpen(true);
    };

    const openEditModal = (order: Order) => {
        setModalMode("edit");
        setSelectedOrder(order);
        setForm(toForm(order));
        setFormError("");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
        setForm(createEmptyForm());
        setFormError("");
    };

    const updateItem = <Field extends keyof OrderItemForm>(
        rowId: string,
        field: Field,
        value: OrderItemForm[Field],
    ) => {
        setForm((current) => ({
            ...current,
            items: current.items.map((item) => {
                if (item.rowId !== rowId) {
                    return item;
                }

                const nextItem = { ...item, [field]: value };
                if (field === "product") {
                    const selectedPlan = planById.get(String(value));
                    nextItem.unit_price = selectedPlan?.price || "0.00";
                }

                return nextItem;
            }),
        }));
    };

    const addItem = () => {
        setForm((current) => ({
            ...current,
            items: [...current.items, createEmptyItem()],
        }));
    };

    const removeItem = (rowId: string) => {
        setForm((current) => ({
            ...current,
            items: current.items.length > 1
                ? current.items.filter((item) => item.rowId !== rowId)
                : current.items,
        }));
    };

    const buildPayload = (): OrderPayload | null => {
        if (!form.client) {
            setFormError("Please select a client.");
            return null;
        }

        const items: OrderItemPayload[] = computedItems.map((item) => ({
            product: item.product,
            quantity: Number(item.quantity),
            unit_price: toMoneyString(Number(item.unit_price) || 0),
            total_price: item.total_price,
        }));

        if (items.some((item) => !item.product)) {
            setFormError("Please select a product for each order item.");
            return null;
        }

        if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
            setFormError("Quantity must be at least 1 for each item.");
            return null;
        }

        return {
            client: form.client,
            status: form.status,
            payment_method: form.payment_flow === "manual" ? form.manual_payment_method : form.payment_method,
            subtotal: toMoneyString(subtotal),
            discount_amount: toMoneyString(discountAmount),
            tax_amount: toMoneyString(taxAmount),
            total_amount: toMoneyString(totalAmount),
            coupon: form.coupon || null,
            notes: form.notes,
            items,
        };
    };

    const buildPaymentLinkPayload = (): AdminPaymentLinkPayload | null => {
        if (!form.client) {
            setFormError("Please select a client.");
            return null;
        }

        const items = computedItems.map((item) => ({
            product: item.product,
            quantity: Number(item.quantity),
            unit_price: toMoneyString(Number(item.unit_price) || 0),
            total_price: item.total_price,
        }));

        if (items.some((item) => !item.product)) {
            setFormError("Please select a product for each payment link item.");
            return null;
        }

        if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
            setFormError("Quantity must be at least 1 for each payment link item.");
            return null;
        }

        return {
            client: form.client,
            coupon: form.coupon || null,
            notes: form.notes,
            subtotal: toMoneyString(subtotal),
            discount_amount: toMoneyString(discountAmount),
            tax_amount: toMoneyString(taxAmount),
            total_amount: toMoneyString(totalAmount),
            items,
        };
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");

        if (modalMode === "create") {
            const paymentLinkPayload = buildPaymentLinkPayload();
            if (!paymentLinkPayload) {
                return;
            }

            if (form.payment_flow === "payment_link") {
                createPaymentLinkMutation.mutate(paymentLinkPayload);
                return;
            }

            if (form.payment_flow === "manual") {
                createManualPaymentMutation.mutate({
                    ...paymentLinkPayload,
                    payment_method: form.manual_payment_method,
                });
                return;
            }

            createAdminCheckoutMutation.mutate(paymentLinkPayload);
            return;
        }

        const payload = buildPayload();
        if (!payload) {
            return;
        }

        if (modalMode === "edit" && selectedOrder) {
            updateMutation.mutate({ id: selectedOrder.id, payload });
            return;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const copyToClipboard = async (value: string, linkId: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedPaymentLinkId(linkId);
            window.setTimeout(() => {
                setCopiedPaymentLinkId((current) => current === linkId ? null : current);
            }, 2000);
        } catch (error) {
            console.error("Could not copy payment link", error);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <PackageIcon className="w-7 h-7 text-indigo-500" />
                        Orders
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage client orders, line items, and payment status.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Order
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex gap-2 flex-wrap">
                    {([
                        { label: "All", value: "all", count: counts.all },
                        { label: "Pending", value: "pending", count: counts.pending },
                        { label: "Confirmed", value: "confirmed", count: counts.confirmed },
                        { label: "Cancelled", value: "cancelled", count: counts.cancelled },
                        { label: "Refunded", value: "refunded", count: counts.refunded },
                    ] as const).map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
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
                        placeholder="Search orders or clients..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-zinc-900 dark:text-white text-sm"
                    />
                </div>
            </div>

            {latestPaymentLink && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Payment link ready for {latestPaymentLink.snapshot.client_name}:{" "}
                    <button
                        type="button"
                        onClick={() => copyToClipboard(latestPaymentLink.payment_url, latestPaymentLink.id)}
                        className="font-semibold underline underline-offset-2"
                    >
                        {copiedPaymentLinkId === latestPaymentLink.id ? "Link copied" : "Copy link"}
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wide">Payment Requests</h2>
                </div>
                <ResponsiveTableFromRows
                    columns={["Client", "Amount", "Status", "Created", "Link"]}
                    emptyText="No records found."
                        headerClassName="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500"
                        bodyClassName="divide-y divide-zinc-200 dark:divide-zinc-800"
                >
                            {isLoadingPaymentLinks ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-zinc-400">Loading payment requests...</td></tr>
                            ) : paymentLinks.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-zinc-400">No payment requests yet.</td></tr>
                            ) : (
                                paymentLinks.map((paymentLink: AdminPaymentLinkRequest) => (
                                    <tr key={paymentLink.id}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-zinc-900 dark:text-white">{paymentLink.client_name}</div>
                                            <div className="text-xs text-zinc-500">{paymentLink.client_email}</div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{toCurrency(paymentLink.amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                                                paymentLink.status === "paid"
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                                    : paymentLink.status === "processing"
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                            }`}>
                                                {paymentLink.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(paymentLink.created_at)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(paymentLink.payment_url, paymentLink.id)}
                                                className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                {copiedPaymentLinkId === paymentLink.id ? "Link copied" : "Copy Link"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        
                </ResponsiveTableFromRows>
            </div>

            <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <ResponsiveTableFromRows
                    columns={["Order", "Client", "Items", "Amount", "Payment", "Status", "Date", "Actions"]}
                    emptyText="No records found."
                        headerClassName="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold"
                        bodyClassName="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                            {isLoadingOrders ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-zinc-400">Loading orders...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-zinc-400">No orders found.</td></tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const statusStyle = statusConfig[order.status] || statusConfig.pending;
                                    const StatusIcon = statusStyle.icon;
                                    const client = clientById.get(order.client);
                                    const coupon = order.coupon ? couponById.get(order.coupon) : undefined;
                                    const firstItem = order.items[0];
                                    const firstPlan = firstItem?.product ? planById.get(firstItem.product) : undefined;
                                    const paymentMethod = getPaymentMethodMeta(order.payment_method);
                                    const PaymentMethodIcon = paymentMethod.icon;
                                    return (
                                        <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-zinc-900 dark:text-white">{order.order_number}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-zinc-900 dark:text-white">{getClientName(client)}</div>
                                                <div className="text-xs text-zinc-500">{client?.user.email || "Client ID: " + order.client}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{firstPlan ? firstPlan.packageName : "Order items"}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {firstPlan ? firstPlan.name : `${order.items.length} item${order.items.length === 1 ? "" : "s"}`}
                                                    {order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-zinc-900 dark:text-white">{toCurrency(order.total_amount)}</span>
                                                {Number(order.discount_amount) > 0 && (
                                                    <div className="text-xs text-emerald-500">{toCurrency(order.discount_amount)} off</div>
                                                )}
                                                {coupon && (
                                                    <div className="text-xs text-zinc-500">Coupon: {coupon.code}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                                    <PaymentMethodIcon className="w-3 h-3" />
                                                    {paymentMethod.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusStyle.bg} ${statusStyle.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(order.created_at)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openEditModal(order)}
                                                    className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium transition"
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        
                </ResponsiveTableFromRows>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                                    {modalMode === "edit" ? "Edit Order" : "Add Order"}
                                </h2>
                                {selectedOrder && (
                                    <p className="text-xs text-zinc-500 mt-1">{selectedOrder.order_number}</p>
                                )}
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                                aria-label="Close order form"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-76px)]">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                                        <UserIcon className="w-3 h-3 inline mr-1" />
                                        Client
                                    </label>
                                    <select
                                        required
                                        value={form.client}
                                        disabled={isLoadingClients}
                                        onChange={(event) => setForm({ ...form, client: event.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                    >
                                        <option value="">{isLoadingClients ? "Loading clients..." : "Select a client..."}</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {getClientName(client)} ({client.user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                                    <select
                                        value={form.status}
                                        onChange={(event) => setForm({ ...form, status: event.target.value as OrderStatus })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Coupon</label>
                                    <select
                                        value={form.coupon}
                                        disabled={isLoadingCoupons}
                                        onChange={(event) => setForm({ ...form, coupon: event.target.value })}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                    >
                                        <option value="">{isLoadingCoupons ? "Loading coupons..." : "No coupon"}</option>
                                        {activeCoupons.map((coupon) => (
                                            <option key={coupon.id} value={coupon.id}>
                                                {getCouponLabel(coupon)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase">
                                        <BoxIcon className="w-3 h-3 inline mr-1" />
                                        Order Items
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Add Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {computedItems.map((item, index) => (
                                        <div key={item.rowId} className="grid grid-cols-1 md:grid-cols-[1fr_88px_120px_120px_40px] gap-3 items-end bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1">Product</label>
                                                <select
                                                    required
                                                    value={item.product}
                                                    disabled={isLoadingPackages}
                                                    onChange={(event) => updateItem(item.rowId, "product", event.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                                >
                                                    <option value="">{isLoadingPackages ? "Loading products..." : "Select tenant product..."}</option>
                                                    {activePlanOptions.map((plan) => (
                                                        <option key={plan.id} value={plan.id}>
                                                            {plan.packageName} - {plan.name} ({toCurrency(plan.price)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={item.quantity}
                                                    onChange={(event) => updateItem(item.rowId, "quantity", event.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1">Unit Price</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unit_price}
                                                    onChange={(event) => updateItem(item.rowId, "unit_price", event.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1">Total</label>
                                                <div className="h-10 flex items-center px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-semibold text-zinc-900 dark:text-white">
                                                    {toCurrency(item.total_price)}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.rowId)}
                                                disabled={form.items.length === 1}
                                                className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 disabled:hover:text-zinc-500 disabled:hover:bg-transparent"
                                                aria-label={`Remove item ${index + 1}`}
                                            >
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-[1fr_320px] gap-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Payment Type</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setForm({
                                                    ...form,
                                                    payment_flow: "manual",
                                                    payment_method: form.manual_payment_method,
                                                })}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                                                    form.payment_flow === "manual"
                                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                        : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                                                }`}
                                            >
                                                <BanknoteIcon className="w-4 h-4" />
                                                Manual
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm({
                                                    ...form,
                                                    payment_flow: "payment_link",
                                                    payment_method: "payment_link",
                                                })}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                                                    form.payment_flow === "payment_link"
                                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                        : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                                                }`}
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                Razorpay Link
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm({
                                                    ...form,
                                                    payment_flow: "checkout",
                                                    payment_method: "checkout",
                                                })}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                                                    form.payment_flow === "checkout"
                                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                        : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                                                }`}
                                            >
                                                <CreditCardIcon className="w-4 h-4" />
                                                Razorpay Checkout
                                            </button>
                                        </div>
                                    </div>

                                    {form.payment_flow === "manual" && (
                                        <div>
                                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Manual Payment Method</label>
                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                                                {manualPaymentMethods.map((method) => {
                                                    const MethodIcon = method.icon;
                                                    return (
                                                        <button
                                                            key={method.value}
                                                            type="button"
                                                            onClick={() => setForm({
                                                                ...form,
                                                                payment_flow: "manual",
                                                                payment_method: method.value,
                                                                manual_payment_method: method.value,
                                                            })}
                                                            className={`flex items-center justify-center gap-2 min-h-10 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                                                form.manual_payment_method === method.value
                                                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                                                            }`}
                                                        >
                                                            <MethodIcon className="w-4 h-4 shrink-0" />
                                                            <span className="truncate">{method.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Notes</label>
                                        <textarea
                                            rows={4}
                                            placeholder="Internal notes about this order..."
                                            value={form.notes}
                                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none resize-none text-zinc-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Subtotal</span>
                                        <span className="font-semibold text-zinc-900 dark:text-white">{toCurrency(subtotal)}</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Discount</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.discount_amount}
                                            onChange={(event) => setForm({ ...form, discount_amount: event.target.value })}
                                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Tax</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.tax_amount}
                                            onChange={(event) => setForm({ ...form, tax_amount: event.target.value })}
                                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none text-zinc-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Total</span>
                                        <span className="text-lg font-bold text-zinc-900 dark:text-white">{toCurrency(totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {formError && (
                                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                                    <AlertCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <div className="pt-2 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2.5 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <><Loader2Icon className="w-4 h-4 animate-spin" /> Saving...</>
                                    ) : modalMode === "edit" ? (
                                        <><EditIcon className="w-4 h-4" /> Save Changes</>
                                    ) : form.payment_flow === "payment_link" ? (
                                        <><LinkIcon className="w-4 h-4" /> Create Payment Link</>
                                    ) : form.payment_flow === "manual" ? (
                                        <><SelectedManualPaymentIcon className="w-4 h-4" /> Record {selectedManualPaymentMethod.label}</>
                                    ) : (
                                        <><CreditCardIcon className="w-4 h-4" /> Open Checkout</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
