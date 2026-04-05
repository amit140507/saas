"use client";

import { useState, useEffect } from "react";
import { ActivityIcon, RulerIcon, SaveIcon, HistoryIcon } from "lucide-react";
// import axios from "axios";

export default function CustMeasurementsPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    weight: "",
    chest: "",
    hips: "",
    biceps: "",
    thighs: "",
    waist: ""
  });

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // In a real scenario:
    // axios.get("/api/metrics/measurements/").then(res => setHistory(res.data));
    setHistory([
      { id: 1, date: "2024-01-01", weight: 80.5, chest: 102, hips: 98, biceps: 38, thighs: 60, waist: 85 },
      { id: 2, date: "2024-01-15", weight: 79.2, chest: 101, hips: 97, biceps: 38.5, thighs: 59, waist: 83 },
    ]);
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      // const res = await axios.post("/api/metrics/measurements/", form);
      // setHistory([res.data, ...history]);
      alert("Measurement saved successfully!");
      setForm({ ...form, weight: "", chest: "", hips: "", biceps: "", thighs: "", waist: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to save measurements.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-32 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <RulerIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">My Measurements</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Log your body metrics and track your progress.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-blue-500" />
              New Entry
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Date</label>
                <input required type="date" name="date" value={form.date} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 75.5" className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Chest (cm)</label>
                  <input type="number" step="0.1" name="chest" value={form.chest} onChange={handleChange} placeholder="e.g. 100" className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Waist (cm)</label>
                  <input type="number" step="0.1" name="waist" value={form.waist} onChange={handleChange} placeholder="e.g. 80" className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Hips (cm)</label>
                  <input type="number" step="0.1" name="hips" value={form.hips} onChange={handleChange} placeholder="e.g. 95" className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Biceps (cm)</label>
                  <input type="number" step="0.1" name="biceps" value={form.biceps} onChange={handleChange} placeholder="e.g. 35" className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-1">Thighs (cm)</label>
                  <input type="number" step="0.1" name="thighs" value={form.thighs} onChange={handleChange} placeholder="e.g. 60" className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50">
                <SaveIcon className="w-4 h-4" />
                {loading ? "Saving..." : "Save Measurement"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-zinc-200 dark:border-zinc-800">
              <HistoryIcon className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Historical Logs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Weight</th>
                    <th className="px-4 py-3">Chest</th>
                    <th className="px-4 py-3">Waist</th>
                    <th className="px-4 py-3">Hips</th>
                    <th className="px-4 py-3">Biceps</th>
                    <th className="px-4 py-3">Thighs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {history.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No logs found.</td></tr>
                  ) : (
                    history.map(row => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{row.date}</td>
                        <td className="px-4 py-3">{row.weight || "-"}</td>
                        <td className="px-4 py-3">{row.chest || "-"}</td>
                        <td className="px-4 py-3">{row.waist || "-"}</td>
                        <td className="px-4 py-3">{row.hips || "-"}</td>
                        <td className="px-4 py-3">{row.biceps || "-"}</td>
                        <td className="px-4 py-3">{row.thighs || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
