"use client";

import { useState, useEffect } from "react";
import { CheckCircleIcon, CalendarIcon, ActivityIcon, UsersIcon } from "lucide-react";
// In a real implementation this would fetch all plans using `axios.get('/api/checkins/plans/')`

export default function AdminCheckInTracker() {
  const [selectedClient, setSelectedClient] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const totalWeeks = 12;

  const defaultLogs = Array.from({ length: 7 }).map((_, i) => ({
    id: null,
    day_of_week: i,
    date: "",
    weight: "",
    fluid_intake: "",
    hunger_level: "",
    craving_level: "",
    steps: "",
    cardio_mins: "",
    session_completed: false,
    motivation: "",
    performance: "",
    muscle_soreness: "",
    energy_levels: "",
    stress_levels: "",
    stool_frequency: "",
    stool_quality: "",
    gi_distress: "",
    sleep_duration: "",
    sleep_quality: "",
    notes: ""
  }));

  const [logs, setLogs] = useState<any[]>(defaultLogs);

  useEffect(() => {
    // API mock
    setLogs(defaultLogs);
  }, [selectedWeek, selectedClient]);

  const getAverage = (field: string) => {
    const validLogs = logs.filter(l => l[field] !== "" && l[field] !== null && !isNaN(Number(l[field])));
    if (validLogs.length === 0) return "-";
    const sum = validLogs.reduce((acc, curr) => acc + Number(curr[field]), 0);
    return (sum / validLogs.length).toFixed(2);
  };

  const daysLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const renderRow = (label: string, field: string, type: string = "number") => (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-10">{label}</td>
      {logs.map((log, i) => (
        <td key={i} className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-center min-w-[100px] text-sm text-zinc-500">
          {type === "checkbox" ? (
             log[field] ? "✅" : "❌"
          ) : type === "textarea" ? (
             <div className="h-10 overflow-y-auto text-left text-xs p-1">{log[field] || "-"}</div>
          ) : (
             <span>{log[field] || "-"}</span>
          )}
        </td>
      ))}
      <td className="px-4 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 text-center bg-zinc-50 dark:bg-zinc-900">
        {type === "number" ? getAverage(field) : "-"}
      </td>
    </tr>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <ActivityIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin Check-In Review</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Review client compliance and metrics.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
             <UsersIcon className="w-5 h-5 text-zinc-500" />
             <select value={selectedClient} onChange={(e) => setSelectedClient(Number(e.target.value))} className="bg-transparent font-medium outline-none cursor-pointer">
                <option value={1}>John Doe - 12 Wk Fat Loss</option>
                <option value={2}>Jane Smith - 12 Wk Muscle Gain</option>
             </select>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CalendarIcon className="w-5 h-5 text-zinc-500" />
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))} className="bg-transparent font-medium outline-none cursor-pointer">
              {Array.from({ length: totalWeeks }).map((_, i) => (
                <option key={i+1} value={i+1}>Week {i+1}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden opacity-95">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="px-4 py-3 w-48 sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">Metrics</th>
                {daysLabels.map((day, i) => (
                  <th key={day} className="px-4 py-3 text-center border-r border-zinc-200 dark:border-zinc-800 min-w-[120px]">
                    <div>{day}</div>
                    <div className="text-xs font-normal text-zinc-400 mt-1">{logs[i].date || "No Date"}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10">Wk Avg</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">1. General</td></tr>
              {renderRow("Weight", "weight", "number")}

              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">2. Nutrition</td></tr>
              {renderRow("Fluid Intake (L)", "fluid_intake", "number")}
              {renderRow("Hunger Level (1-5)", "hunger_level", "number")}
              {renderRow("Craving Level (1-5)", "craving_level", "number")}

              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">3. Training & Cardio</td></tr>
              {renderRow("Steps", "steps", "number")}
              {renderRow("Cardio (mins)", "cardio_mins", "number")}
              {renderRow("Session Completed?", "session_completed", "checkbox")}
              {renderRow("Motivation (1-5)", "motivation", "number")}
              {renderRow("Performance (1-5)", "performance", "number")}

              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">4. Recovery & Stress</td></tr>
              {renderRow("Muscle Soreness (1-5)", "muscle_soreness", "number")}
              {renderRow("Energy Levels (1-5)", "energy_levels", "number")}
              {renderRow("Stress Levels (1-5)", "stress_levels", "number")}

              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">5. Digestion</td></tr>
              {renderRow("Stool Frequency", "stool_frequency", "number")}
              {renderRow("Stool Quality", "stool_quality", "text")}
              {renderRow("GI Distress", "gi_distress", "text")}

              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">6. Sleep</td></tr>
              {renderRow("Sleep Duration (hr)", "sleep_duration", "number")}
              {renderRow("Sleep Quality (1-5)", "sleep_quality", "number")}

              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">7. Additional Notes</td></tr>
              {renderRow("Accomplishments / Hurdles", "notes", "textarea")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
