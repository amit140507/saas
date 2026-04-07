"use client";

import { useState, useEffect } from "react";
import { DropletIcon, SaveIcon, HistoryIcon, PlusIcon, TrashIcon, FileTextIcon, DownloadIcon } from "lucide-react";
import api from "@/lib/api";

export default function BloodReportsPage() {
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [form, setForm] = useState({
        date: new Date().toISOString().split("T")[0],
        lab_name: "",
        notes: "",
        readings: [
            { marker_name: "HbA1c", marker_type: "hba1c", value: "", unit: "%", reference_range: "< 5.7" },
            { marker_name: "Glucose (Fasting)", marker_type: "glucose", value: "", unit: "mg/dL", reference_range: "70-99" },
            { marker_name: "Total Cholesterol", marker_type: "cholesterol_total", value: "", unit: "mg/dL", reference_range: "< 200" },
        ]
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get("reports/blood-reports/");
            setReports(res.data);
        } catch (err) {
            console.error("Failed to fetch reports:", err);
            // Fallback dummy data for preview
            setReports([
                {
                    id: 1,
                    date: "2024-02-15",
                    lab_name: "City Diagnostics",
                    readings: [
                        { marker_name: "HbA1c", value: "5.4", unit: "%" },
                        { marker_name: "Glucose", value: "92", unit: "mg/dL" }
                    ]
                },
            ]);
        }
    };

    const handleFormChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReportFile(e.target.files[0]);
        }
    };

    const handleReadingChange = (index: number, field: string, value: string) => {
        const newReadings = [...form.readings];
        newReadings[index] = { ...newReadings[index], [field]: value };
        setForm({ ...form, readings: newReadings });
    };

    const addMarker = () => {
        setForm({
            ...form,
            readings: [...form.readings, { marker_name: "", marker_type: "", value: "", unit: "", reference_range: "" }]
        });
    };

    const removeMarker = (index: number) => {
        const newReadings = form.readings.filter((_, i) => i !== index);
        setForm({ ...form, readings: newReadings });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append("date", form.date);
        formData.append("lab_name", form.lab_name);
        formData.append("notes", form.notes);
        formData.append("readings", JSON.stringify(form.readings));
        if (reportFile) {
            formData.append("report_file", reportFile);
        }

        try {
            const res = await api.post("reports/blood-reports/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            setReports([res.data, ...reports]);
            alert("Blood report saved successfully!");
            // Reset form
            setForm({
                ...form,
                lab_name: "",
                notes: "",
                readings: form.readings.map(r => ({ ...r, value: "" }))
            });
            setReportFile(null);
            // Reset file input manually if needed
            const fileInput = document.getElementById("report_file") as HTMLInputElement;
            if (fileInput) fileInput.value = "";

        } catch (err) {
            console.error(err);
            alert("Failed to save report. Make sure backend migrations are run.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 pb-32 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                        <DropletIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Blood Reports</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">Track your clinical health markers and blood work history.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 sticky top-8">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                            <PlusIcon className="w-5 h-5 text-red-500" />
                            Add New Report
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Report Date</label>
                                    <input required type="date" name="date" value={form.date} onChange={handleFormChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-red-500 transition-colors" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Lab Name</label>
                                    <input type="text" name="lab_name" value={form.lab_name} onChange={handleFormChange} placeholder="e.g. Apollo" className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-red-500 transition-colors" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Attach PDF Report</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="report_file"
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Markers & Values</h3>
                                    <button type="button" onClick={addMarker} className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center gap-1">
                                        <PlusIcon className="w-3 h-3" /> Add Marker
                                    </button>
                                </div>

                                {form.readings.map((reading, idx) => (
                                    <div key={idx} className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800 relative">
                                        <button type="button" onClick={() => removeMarker(idx)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="col-span-2">
                                                <input
                                                    placeholder="Marker Name (e.g. HDL)"
                                                    value={reading.marker_name}
                                                    onChange={(e) => handleReadingChange(idx, 'marker_name', e.target.value)}
                                                    className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-800 text-sm py-1 outline-none focus:border-red-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-zinc-500">Value</label>
                                                <input
                                                    type="number" step="0.001"
                                                    value={reading.value}
                                                    onChange={(e) => handleReadingChange(idx, 'value', e.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-red-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-zinc-500">Unit</label>
                                                <input
                                                    placeholder="mg/dL"
                                                    value={reading.unit}
                                                    onChange={(e) => handleReadingChange(idx, 'unit', e.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-red-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="submit" disabled={loading} className="w-full mt-4 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50">
                                <SaveIcon className="w-4 h-4" />
                                {loading ? "Saving..." : "Save Report"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: History */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 p-5 border-b border-zinc-200 dark:border-zinc-800">
                            <HistoryIcon className="w-5 h-5 text-zinc-500" />
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Reports</h2>
                        </div>

                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {reports.length === 0 ? (
                                <div className="p-8 text-center text-zinc-400">No blood reports found. Add your first report to start tracking.</div>
                            ) : (
                                reports.map(report => (
                                    <div key={report.id} className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-zinc-900 dark:text-white">{report.date}</h3>
                                                <p className="text-xs text-zinc-500">{report.lab_name || "Unknown Lab"}</p>
                                            </div>
                                            {report.report_file && (
                                                <a
                                                    href={report.report_file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-full transition-colors"
                                                >
                                                    <DownloadIcon className="w-3 h-3" />
                                                    Download PDF
                                                </a>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {report.readings?.map((reading: any, rIdx: number) => (
                                                <div key={rIdx} className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                                                    <p className="text-[10px] uppercase font-bold text-zinc-400 truncate">{reading.marker_name}</p>
                                                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                        {reading.value} <span className="text-[10px] font-normal text-zinc-500">{reading.unit}</span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

