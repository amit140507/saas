"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    DownloadIcon,
    DropletIcon,
    EyeIcon,
    FileTextIcon,
    Loader2Icon,
    PlusIcon,
    SaveIcon,
    TrashIcon,
    UploadIcon,
    XIcon,
} from "lucide-react";

import { getClients } from "@/services/client.service";
import { createBloodReport, getBloodReports } from "@/services/blood-report.service";
import type { BloodMarker, BloodReport, BloodReportFormState } from "@/types/blood-report.type";
import type { ClientData } from "@/types/client.type";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";

const DEFAULT_MARKERS: BloodMarker[] = [
    { marker_name: "HbA1c", value: "", unit: "%", normal_max: "5.700" },
    { marker_name: "Glucose (Fasting)", value: "", unit: "mg/dL", normal_min: "70.000", normal_max: "99.000" },
    { marker_name: "Total Cholesterol", value: "", unit: "mg/dL", normal_max: "200.000" },
];

function createDefaultForm(): BloodReportFormState {
    return {
        client: "",
        report_date: new Date().toISOString().split("T")[0],
        lab_name: "",
        notes: "",
        markers: DEFAULT_MARKERS.map((marker) => ({ ...marker })),
    };
}

function getClientName(client?: ClientData): string {
    if (!client) return "Unknown client";
    const fullName = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
    return fullName || client.user.email;
}

function getClientPublicId(client?: ClientData): string {
    return client?.user.public_id || "-";
}

function getClientEmail(client?: ClientData): string {
    return client?.user.email || "-";
}

export default function AdminBloodReportsPage() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isAddingReport, setIsAddingReport] = useState(false);
    const [selectedReport, setSelectedReport] = useState<BloodReport | null>(null);
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [form, setForm] = useState<BloodReportFormState>(() => createDefaultForm());
    const [successMessage, setSuccessMessage] = useState("");

    const { data: reports = [], isLoading: reportsLoading, isError: reportsFailed } = useQuery<BloodReport[]>({
        queryKey: ["admin-blood-reports"],
        queryFn: getBloodReports,
    });

    const { data: clients = [], isLoading: clientsLoading } = useQuery<ClientData[]>({
        queryKey: ["clients-management"],
        queryFn: getClients,
    });

    const clientById = useMemo(() => {
        return new Map(clients.map((client) => [client.id, client]));
    }, [clients]);

    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime());
    }, [reports]);

    const selectedReportClient = selectedReport ? clientById.get(selectedReport.client) : undefined;

    const createMutation = useMutation({
        mutationFn: (payload: FormData) => createBloodReport(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-blood-reports"] });
            setSuccessMessage("Blood report saved successfully.");
            setIsAddingReport(false);
            setForm(createDefaultForm());
            setReportFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            window.setTimeout(() => setSuccessMessage(""), 3000);
        },
    });

    const handleReadingChange = (index: number, field: keyof BloodMarker, value: string) => {
        const markers = [...form.markers];
        markers[index] = { ...markers[index], [field]: value };
        setForm({ ...form, markers });
    };

    const addMarker = () => {
        setForm({
            ...form,
            markers: [...form.markers, { marker_name: "", value: "", unit: "", normal_min: "", normal_max: "" }],
        });
    };

    const removeMarker = (index: number) => {
        setForm({
            ...form,
            markers: form.markers.filter((_, markerIndex) => markerIndex !== index),
        });
    };

    const handleCancelAdd = () => {
        setIsAddingReport(false);
        setForm(createDefaultForm());
        setReportFile(null);
        createMutation.reset();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSuccessMessage("");

        const filledMarkers = form.markers.filter((marker) => marker.marker_name.trim() && String(marker.value).trim());
        if (!form.client || !reportFile || filledMarkers.length === 0) {
            return;
        }

        const payload = new FormData();
        payload.append("client", form.client);
        payload.append("report_date", form.report_date);
        payload.append("lab_name", form.lab_name);
        payload.append("notes", form.notes);
        payload.append("markers", JSON.stringify(filledMarkers));
        payload.append("report_file", reportFile);
        createMutation.mutate(payload);
    };

    const formIsValid = Boolean(form.client && reportFile && form.markers.some((marker) => marker.marker_name.trim() && String(marker.value).trim()));

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 pb-32 md:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        <DropletIcon className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Blood Reports</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">View, upload, and download client blood reports.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsAddingReport(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700"
                >
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    Add New Report
                </button>
            </div>

            {successMessage && (
                <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            {isAddingReport && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white">
                            <PlusIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                            Add Blood Report
                        </h2>
                        <button
                            type="button"
                            onClick={handleCancelAdd}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                        >
                            <span className="sr-only">Close add report form</span>
                            <XIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-4 lg:col-span-1">
                            <div>
                                <label htmlFor="client" className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                                    Client
                                </label>
                                <select
                                    id="client"
                                    required
                                    value={form.client}
                                    disabled={clientsLoading}
                                    onChange={(event) => setForm({ ...form, client: event.target.value })}
                                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-red-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                >
                                    <option value="">{clientsLoading ? "Loading clients..." : "Select client"}</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {getClientName(client)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="report_date" className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                                    Report Date
                                </label>
                                <input
                                    id="report_date"
                                    required
                                    type="date"
                                    value={form.report_date}
                                    onChange={(event) => setForm({ ...form, report_date: event.target.value })}
                                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-red-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="lab_name" className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                                    Lab Name
                                </label>
                                <input
                                    id="lab_name"
                                    type="text"
                                    value={form.lab_name}
                                    onChange={(event) => setForm({ ...form, lab_name: event.target.value })}
                                    placeholder="e.g. Apollo"
                                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-red-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="report_file" className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                                    Attach PDF Report
                                </label>
                                <label
                                    htmlFor="report_file"
                                    className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-red-200 bg-red-50/60 p-4 text-sm transition-colors hover:border-red-300 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:hover:border-red-500/50 dark:hover:bg-red-500/15"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-red-600 shadow-sm dark:bg-zinc-900 dark:text-red-400">
                                        <UploadIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-zinc-900 dark:text-white">
                                            {reportFile ? reportFile.name : "Upload PDF report"}
                                        </span>
                                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                            {reportFile ? "Click to replace the selected file" : "PDF files only"}
                                        </span>
                                    </span>
                                </label>
                                <input
                                    ref={fileInputRef}
                                    id="report_file"
                                    required
                                    type="file"
                                    accept=".pdf"
                                    onChange={(event) => setReportFile(event.target.files?.[0] || null)}
                                    className="sr-only"
                                />
                            </div>

                            <div>
                                <label htmlFor="notes" className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                                    Notes
                                </label>
                                <textarea
                                    id="notes"
                                    value={form.notes}
                                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                                    rows={3}
                                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-red-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 lg:col-span-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Markers</h3>
                                <button type="button" onClick={addMarker} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400">
                                    <PlusIcon className="h-3 w-3" aria-hidden="true" />
                                    Add Marker
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {form.markers.map((marker, index) => (
                                    <div key={`${marker.marker_name}-${index}`} className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                                        <div className="flex items-start gap-2">
                                            <input
                                                placeholder="Marker Name"
                                                value={marker.marker_name}
                                                onChange={(event) => handleReadingChange(index, "marker_name", event.target.value)}
                                                className="min-w-0 flex-1 border-b border-zinc-200 bg-transparent py-1 text-sm outline-none transition-colors focus:border-red-500 dark:border-zinc-800 dark:text-white"
                                            />
                                            <button type="button" onClick={() => removeMarker(index)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                                                <span className="sr-only">Remove marker</span>
                                                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-zinc-500">Value</label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={marker.value}
                                                    onChange={(event) => handleReadingChange(index, "value", event.target.value)}
                                                    className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition-colors focus:border-red-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-zinc-500">Unit</label>
                                                <input
                                                    placeholder="mg/dL"
                                                    value={marker.unit || ""}
                                                    onChange={(event) => handleReadingChange(index, "unit", event.target.value)}
                                                    className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none transition-colors focus:border-red-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {createMutation.isError && (
                                <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                                    Failed to save report. Check the client, PDF, and marker values.
                                </div>
                            )}

                            <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={handleCancelAdd}
                                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || !formIsValid}
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {createMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SaveIcon className="h-4 w-4" aria-hidden="true" />}
                                    {createMutation.isPending ? "Saving..." : "Save Report"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <FileTextIcon className="h-5 w-5 text-zinc-500" aria-hidden="true" />
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Reports List</h2>
                    </div>
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{sortedReports.length} reports</span>
                </div>

                <ResponsiveTableFromRows
                    columns={["Public ID", "Name", "Email", "Report Date", "Lab", "Actions"]}
                    emptyText="No records found."
                        headerClassName="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50"
                        bodyClassName="divide-y divide-zinc-200 text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300"
                >
                            {reportsLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                                        <div className="flex justify-center">
                                            <Loader2Icon className="h-8 w-8 animate-spin text-red-600" aria-hidden="true" />
                                        </div>
                                    </td>
                                </tr>
                            ) : reportsFailed ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                                        Error loading blood reports.
                                    </td>
                                </tr>
                            ) : sortedReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                                        No blood reports found. Use Add New Report to upload one.
                                    </td>
                                </tr>
                            ) : (
                                sortedReports.map((report) => {
                                    const client = clientById.get(report.client);
                                    return (
                                        <tr key={report.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                            <td className="px-6 py-4 font-mono text-xs text-zinc-500">{getClientPublicId(client)}</td>
                                            <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{getClientName(client)}</td>
                                            <td className="px-6 py-4">{getClientEmail(client)}</td>
                                            <td className="px-6 py-4 font-medium">{report.report_date}</td>
                                            <td className="px-6 py-4">{report.lab_name || "Unknown Lab"}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedReport(report)}
                                                        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                                    >
                                                        <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                                        View
                                                    </button>
                                                    {report.report_file ? (
                                                        <a
                                                            href={report.report_file}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                                        >
                                                            <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                                            Download
                                                        </a>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                                                        >
                                                            <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                                            Download
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        
                </ResponsiveTableFromRows>
            </div>

            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Blood Report Details</h2>
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                    {getClientName(selectedReportClient)} - {selectedReport.report_date}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedReport(null)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                                <span className="sr-only">Close report details</span>
                                <XIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="max-h-[calc(90vh-90px)] space-y-5 overflow-y-auto p-5">
                            <div className="grid grid-cols-1 gap-4 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-950 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-zinc-500">Public ID</p>
                                    <p className="mt-1 font-medium text-zinc-900 dark:text-white">{getClientPublicId(selectedReportClient)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-zinc-500">Email</p>
                                    <p className="mt-1 font-medium text-zinc-900 dark:text-white">{getClientEmail(selectedReportClient)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-zinc-500">Lab</p>
                                    <p className="mt-1 font-medium text-zinc-900 dark:text-white">{selectedReport.lab_name || "Unknown Lab"}</p>
                                </div>
                            </div>

                            {selectedReport.notes && (
                                <div>
                                    <p className="text-xs font-bold uppercase text-zinc-500">Notes</p>
                                    <p className="mt-1 rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">{selectedReport.notes}</p>
                                </div>
                            )}

                            <div>
                                <p className="mb-3 text-xs font-bold uppercase text-zinc-500">Markers</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {selectedReport.markers?.length ? (
                                        selectedReport.markers.map((marker) => (
                                            <div key={marker.id || marker.marker_name} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                                                <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{marker.marker_name}</p>
                                                <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                                                    {marker.value} <span className="text-xs font-normal text-zinc-500">{marker.unit}</span>
                                                </p>
                                                {(marker.normal_min || marker.normal_max) && (
                                                    <p className="mt-1 text-xs text-zinc-500">
                                                        Normal: {marker.normal_min || "-"} - {marker.normal_max || "-"}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">No marker values recorded.</p>
                                    )}
                                </div>
                            </div>

                            {selectedReport.report_file && (
                                <a
                                    href={selectedReport.report_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
                                >
                                    <DownloadIcon className="h-4 w-4" aria-hidden="true" />
                                    Download PDF
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
