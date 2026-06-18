"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircleIcon,
    CheckCircleIcon,
    ClockIcon,
    MailIcon,
    SearchIcon,
    XCircleIcon,
    type LucideIcon,
} from "lucide-react";

import { getEmailLogs } from "@/services/communication.service";
import type { EmailLog, EmailLogStatus } from "@/types/communication.type";

type StatusTab = EmailLogStatus | "all";

type StatusTone = {
    icon: LucideIcon;
    label: string;
    className: string;
};

const statusToneByValue: Record<EmailLogStatus, StatusTone> = {
    pending: {
        icon: ClockIcon,
        label: "Pending",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    sent: {
        icon: CheckCircleIcon,
        label: "Sent",
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    failed: {
        icon: XCircleIcon,
        label: "Failed",
        className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    },
};

function formatDate(value: string | null) {
    if (!value) {
        return "Not sent";
    }

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getRelatedLabel(log: EmailLog) {
    if (!log.related_object_type && !log.related_object_id) {
        return "None";
    }

    if (!log.related_object_type) {
        return log.related_object_id;
    }

    return `${log.related_object_type}${log.related_object_id ? ` #${log.related_object_id}` : ""}`;
}

export default function EmailLogsPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusTab>("all");

    const { data: emailLogs = [], isLoading, isError } = useQuery({
        queryKey: ["admin-email-logs"],
        queryFn: getEmailLogs,
    });

    const filteredLogs = useMemo(() => {
        const query = search.trim().toLowerCase();

        return emailLogs.filter((log) => {
            const matchesStatus = statusFilter === "all" || log.status === statusFilter;
            const matchesSearch = !query || [
                log.recipient_email,
                log.subject,
                log.template_name,
                log.related_object_type,
                log.related_object_id,
            ].some((value) => value.toLowerCase().includes(query));

            return matchesStatus && matchesSearch;
        });
    }, [emailLogs, search, statusFilter]);

    const counts = useMemo(() => {
        return emailLogs.reduce(
            (accumulator, log) => {
                accumulator.all += 1;
                accumulator[log.status] += 1;
                return accumulator;
            },
            { all: 0, pending: 0, sent: 0, failed: 0 } as Record<StatusTab, number>
        );
    }, [emailLogs]);

    const statusTabs: Array<{ label: string; value: StatusTab; count: number }> = [
        { label: "All", value: "all", count: counts.all },
        { label: "Pending", value: "pending", count: counts.pending },
        { label: "Sent", value: "sent", count: counts.sent },
        { label: "Failed", value: "failed", count: counts.failed },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <MailIcon className="h-7 w-7 text-indigo-500" />
                        Email Logs
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        Review tenant email delivery history and failures.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-bold uppercase text-zinc-500">Total Emails</p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{counts.all}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-bold uppercase text-zinc-500">Sent</p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{counts.sent}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-bold uppercase text-zinc-500">Failed</p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{counts.failed}</p>
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
                <div className="relative w-full md:w-96">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search emails..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-white">
                        Delivery History
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <tr>
                                <th className="px-6 py-4">Recipient</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Template</th>
                                <th className="px-6 py-4">Related</th>
                                <th className="px-6 py-4">Sent</th>
                                <th className="px-6 py-4">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">Loading email logs...</td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-red-500">Unable to load email logs.</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">No email logs found.</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const tone = statusToneByValue[log.status];
                                    const StatusIcon = tone.icon;

                                    return (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                                                {log.recipient_email}
                                            </td>
                                            <td className="max-w-xs px-6 py-4">
                                                <div className="truncate text-zinc-900 dark:text-white">{log.subject}</div>
                                                {log.error_message && (
                                                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                                        <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate">{log.error_message}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${tone.className}`}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {tone.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">
                                                {log.template_name || "None"}
                                            </td>
                                            <td className="max-w-xs px-6 py-4 text-xs text-zinc-500">
                                                <span className="block truncate">{getRelatedLabel(log)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(log.sent_at)}</td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(log.created_at)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
