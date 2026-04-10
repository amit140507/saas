"use client";

import { useState, useEffect } from "react";
import { UsersIcon, ActivityIcon, RulerIcon } from "lucide-react";
// import axios from "axios";

export default function AdminMeasurementsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock list of clients
  useEffect(() => {
    setClients([
      { id: "1", first_name: "John", last_name: "Doe" },
      { id: "2", first_name: "Jane", last_name: "Smith" },
    ]);
  }, []);

  // Fetch measurements when a client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setHistory([]);
      return;
    }
    setLoading(true);
    // In real app:
    // axios.get(`/api/measurement/measurements/?user=${selectedClientId}`)
    //   .then(res => setHistory(res.data)).finally(() => setLoading(false));

    setTimeout(() => {
      setHistory([
        { id: 1, date: "2024-01-01", weight: 80.5, chest: 102, hips: 98, biceps: 38, thighs: 60, waist: 85 },
        { id: 2, date: "2024-01-15", weight: 79.2, chest: 101, hips: 97, biceps: 38.5, thighs: 59, waist: 83 },
      ]);
      setLoading(false);
    }, 500);
  }, [selectedClientId]);

  return (
    <div className="p-4 md:p-8 space-y-6 pb-32 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <RulerIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Client Measurements</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Review physical changes and progress for active clients.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <UsersIcon className="w-5 h-5 text-zinc-400" />
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Select Client:</span>
        </div>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="w-full md:w-80 bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors"
        >
          <option value="">-- Choose a Client --</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* History Table */}
      {selectedClientId ? (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-zinc-200 dark:border-zinc-800">
            <ActivityIcon className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Historical Logs</h2>
          </div>
          <div className="overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 flex items-center justify-center z-10">
                Loading...
              </div>
            )}
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Weight (kg)</th>
                  <th className="px-4 py-3">Chest (cm)</th>
                  <th className="px-4 py-3">Waist (cm)</th>
                  <th className="px-4 py-3">Hips (cm)</th>
                  <th className="px-4 py-3">Biceps (cm)</th>
                  <th className="px-4 py-3">Thighs (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {history.length === 0 && !loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No logs found for this client.</td></tr>
                ) : (
                  history.map(row => (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white w-32">{row.date}</td>
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
      ) : (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-zinc-500">
          Select a client from the dropdown above to view their measurements history.
        </div>
      )}
    </div>
  );
}
