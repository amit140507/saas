"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    BadgeCheckIcon,
    CalendarIcon,
    Loader2Icon,
    PackageIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/ui/page";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";
import { cn } from "@/lib/utils";
import { getClients } from "@/services/client.service";
import { getOrders } from "@/services/order.service";
import { getPackages } from "@/services/package.service";
import { getMembership } from "@/services/subscription.service";
import type { ClientData } from "@/types/client.type";
import type { Membership, MembershipStatus, SnapshotJson } from "@/types/subscription.type";

const statusVariant: Record<MembershipStatus, "success" | "neutral" | "warning" | "destructive" | "default"> = {
    active: "success",
    expired: "neutral",
    frozen: "default",
    cancelled: "destructive",
    pending: "warning",
};

function formatDate(value: string | null | undefined) {
    if (!value) {
        return "Not set";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function formatCurrency(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
        return "Not set";
    }

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

function getClientName(client?: ClientData) {
    if (!client) {
        return "Unknown client";
    }

    const fullName = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
    return fullName || client.user.email || "Unnamed client";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "Not set";
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }

    return JSON.stringify(value);
}

function titleize(value: string) {
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ValueRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium text-foreground sm:max-w-[65%] sm:text-right">{value}</dd>
        </div>
    );
}

function Section({
    title,
    count,
    children,
}: {
    title: string;
    count?: number;
    children: ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {typeof count === "number" && <Badge variant="neutral">{count}</Badge>}
            </div>
            {children}
        </section>
    );
}

function EmptySection({ label }: { label: string }) {
    return (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {label}
        </div>
    );
}

function DataTable({
    headers,
    emptyLabel,
    children,
}: {
    headers: string[];
    emptyLabel: string;
    children: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ResponsiveTableFromRows
                columns={headers}
                emptyText={emptyLabel}
                headerClassName="border-border bg-muted/50 text-muted-foreground"
                bodyClassName="divide-border"
            >
                {children}
            </ResponsiveTableFromRows>
        </div>
    );
}

function getSnapshotPackageDetails(data: SnapshotJson | undefined) {
    if (!data || !isRecord(data.package_details)) {
        return null;
    }

    return data.package_details;
}

function SnapshotSection({ membership }: { membership: Membership }) {
    const snapshot = membership.snapshot;
    const packageDetails = getSnapshotPackageDetails(snapshot?.data);
    const packageFeatures = packageDetails && Array.isArray(packageDetails.package_features)
        ? packageDetails.package_features
        : [];
    const topLevelEntries = snapshot
        ? Object.entries(snapshot.data).filter(([key]) => key !== "package_details" && key !== "package_features")
        : [];

    if (!snapshot) {
        return (
            <Section title="Membership Snapshot">
                <EmptySection label="No membership snapshot found." />
            </Section>
        );
    }

    return (
        <Section title="Membership Snapshot">
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ValueRow label="Snapshot ID" value={snapshot.id} />
                <ValueRow label="Package" value={packageDetails ? stringifyValue(packageDetails.name) : "Not set"} />
                {topLevelEntries.map(([key, value]) => (
                    <ValueRow key={key} label={titleize(key)} value={stringifyValue(value)} />
                ))}
            </dl>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Snapshot Features</h3>
                <DataTable
                    headers={["Feature", "Code", "Description"]}
                    emptyLabel="No snapshot features found."
                >
                    {packageFeatures.map((feature, index) => {
                        if (!isRecord(feature)) {
                            return null;
                        }

                        const details = isRecord(feature.feature_details) ? feature.feature_details : {};
                        return (
                            <tr key={String(feature.id || index)} className="border-b border-border last:border-0">
                                <td className="px-4 py-3 font-medium text-foreground">{stringifyValue(details.name)}</td>
                                <td className="px-4 py-3 text-muted-foreground">{stringifyValue(details.code)}</td>
                                <td className="px-4 py-3 text-muted-foreground">{stringifyValue(details.description)}</td>
                            </tr>
                        );
                    })}
                </DataTable>
            </div>
        </Section>
    );
}

export default function MembershipDetailPage() {
    const params = useParams<{ membershipId: string }>();
    const membershipId = params.membershipId;

    const { data: membership, isLoading, error } = useQuery({
        queryKey: ["admin-membership", membershipId],
        queryFn: () => getMembership(membershipId),
    });

    const { data: clients = [] } = useQuery({
        queryKey: ["admin-subscription-detail-clients"],
        queryFn: getClients,
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["admin-subscription-detail-orders"],
        queryFn: getOrders,
    });

    const { data: packages = [] } = useQuery({
        queryKey: ["admin-subscription-detail-packages"],
        queryFn: getPackages,
    });

    const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
    const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
    const packageById = useMemo(() => new Map(packages.map((packageItem) => [packageItem.id, packageItem])), [packages]);

    if (isLoading) {
        return (
            <PageShell>
                <div className="flex items-center justify-center py-16">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                </div>
            </PageShell>
        );
    }

    if (error || !membership) {
        return (
            <PageShell>
                <PageHeader title="Subscription not found" icon={BadgeCheckIcon} />
                <Link href="/dashboard/subscriptions" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back
                </Link>
            </PageShell>
        );
    }

    const client = clientById.get(membership.client);
    const order = membership.order ? orderById.get(membership.order) : undefined;
    const packageItem = membership.plan_details?.package ? packageById.get(membership.plan_details.package) : undefined;
    const freezes = membership.freezes || [];
    const addons = membership.addons || [];
    const changes = membership.changes || [];

    return (
        <PageShell>
            <PageHeader
                title={getClientName(client)}
                description={membership.plan_details?.name || membership.plan}
                icon={BadgeCheckIcon}
                actions={(
                    <Link href="/dashboard/subscriptions" className={cn(buttonVariants({ variant: "outline" }))}>
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back
                    </Link>
                )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="mt-3">
                        <Badge variant={statusVariant[membership.status]}>{membership.status}</Badge>
                    </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Start Date</div>
                    <div className="mt-2 flex items-center gap-2 text-xl font-bold text-foreground">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        {formatDate(membership.start_date)}
                    </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Plan</div>
                    <div className="mt-2 flex items-center gap-2 text-xl font-bold text-foreground">
                        <PackageIcon className="h-5 w-5 text-primary" />
                        {membership.plan_details?.name || "Unknown plan"}
                    </div>
                </div>
            </div>

            <Section title="Membership Details">
                <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <ValueRow label="Membership ID" value={membership.id} />
                    <ValueRow label="Tenant" value={membership.tenant} />
                    <ValueRow label="Client" value={`${getClientName(client)} (${client?.user.email || membership.client})`} />
                    <ValueRow label="Package" value={packageItem?.name || membership.plan_details?.package || "Not set"} />
                    <ValueRow label="Plan" value={membership.plan_details?.name || membership.plan} />
                    <ValueRow label="Plan price" value={formatCurrency(membership.plan_details?.price)} />
                    <ValueRow label="Billing cycle" value={membership.plan_details?.billing_cycle || "Not set"} />
                    <ValueRow label="Order" value={order?.order_number || membership.order || "No order"} />
                    <ValueRow label="Start date" value={formatDate(membership.start_date)} />
                    <ValueRow label="Base end date" value={formatDate(membership.base_end_date)} />
                    <ValueRow label="Extended end date" value={formatDate(membership.extended_end_date)} />
                    <ValueRow label="Renewed from" value={membership.renewed_from || "Not set"} />
                    <ValueRow label="Notes" value={membership.notes || "Not set"} />
                    <ValueRow label="Created at" value={formatDate(membership.created_at)} />
                    <ValueRow label="Updated at" value={formatDate(membership.updated_at)} />
                </dl>
            </Section>

            <SnapshotSection membership={membership} />

            <Section title="Membership Freezes" count={freezes.length}>
                <DataTable headers={["Start Date", "End Date", "Days"]} emptyLabel="No membership freezes found.">
                    {freezes.map((freeze) => (
                        <tr key={freeze.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 font-medium text-foreground">{formatDate(freeze.start_date)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(freeze.end_date)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{freeze.days}</td>
                        </tr>
                    ))}
                </DataTable>
            </Section>

            <Section title="Membership Add-ons" count={addons.length}>
                <DataTable headers={["Add-on", "Code", "Price", "Dates", "Billing", "Status"]} emptyLabel="No membership add-ons found.">
                    {addons.map((membershipAddon) => (
                        <tr key={membershipAddon.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 font-medium text-foreground">{membershipAddon.addon_details?.name || membershipAddon.addon}</td>
                            <td className="px-4 py-3 text-muted-foreground">{membershipAddon.addon_details?.code || "Not set"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatCurrency(membershipAddon.price)}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                                {formatDate(membershipAddon.start_date)} - {formatDate(membershipAddon.end_date)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{membershipAddon.addon_details?.billing_type || "Not set"}</td>
                            <td className="px-4 py-3">
                                <Badge variant={membershipAddon.status === "active" ? "success" : membershipAddon.status === "cancelled" ? "destructive" : "neutral"}>
                                    {membershipAddon.status}
                                </Badge>
                            </td>
                        </tr>
                    ))}
                </DataTable>
            </Section>

            <Section title="Membership Changes" count={changes.length}>
                <DataTable headers={["From Plan", "To Plan", "Price Difference"]} emptyLabel="No membership changes found.">
                    {changes.map((change) => (
                        <tr key={change.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 font-medium text-foreground">{change.from_plan_details?.name || change.from_plan}</td>
                            <td className="px-4 py-3 text-muted-foreground">{change.to_plan_details?.name || change.to_plan}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatCurrency(change.price_difference)}</td>
                        </tr>
                    ))}
                </DataTable>
            </Section>
        </PageShell>
    );
}
