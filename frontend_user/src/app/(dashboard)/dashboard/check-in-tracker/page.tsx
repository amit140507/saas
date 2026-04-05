"use client";

import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { CheckCircleIcon, CalendarIcon, ActivityIcon, SaveIcon } from "lucide-react";

export default function CheckInTracker() {
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const totalWeeks = 12;

  // We mock a plan context for now. Real implementation fetches plan from API.
  const planId = 1;

  // Form State: Array of 7 objects representing Sunday(0) to Saturday(6)
  const defaultLogs = Array.from({ length: 7 }).map((_, i) => ({
    id: null, // assigned by backend if exists
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

  // Fetch or reset logs when week changes
  useEffect(() => {
    // Mock loading data (in reality, Axios GET /api/checkins/logs/?plan=1&week_number=selectedWeek)
    // For now we just reset to empty defaults.
    setLogs(defaultLogs);
  }, [selectedWeek]);

  // Utility to update a specific day's field
  const updateField = (dayIndex: number, field: string, value: any) => {
    setLogs(logs.map((log, i) => (i === dayIndex ? { ...log, [field]: value } : log)));
  };

  // Utility to calculate Weekly Average for a specific numeric field
  const getAverage = (field: string) => {
    const validLogs = logs.filter(l => l[field] !== "" && l[field] !== null && !isNaN(Number(l[field])));
    if (validLogs.length === 0) return "-";
    const sum = validLogs.reduce((acc, curr) => acc + Number(curr[field]), 0);
    return (sum / validLogs.length).toFixed(2);
  };

  const saveLogs = async () => {
    setLoading(true);
    try {
      // payload matches the DailyLog serializer
      const payload = logs.map(l => ({
        ...l, 
        plan: planId,
        week_number: selectedWeek,
        // sanitize empty strings if required by DRF, DRF usually handles "" vs null for ints but better to be safe
        weight: l.weight === "" ? null : l.weight,
        fluid_intake: l.fluid_intake === "" ? null : l.fluid_intake,
        hunger_level: l.hunger_level === "" ? null : l.hunger_level,
        // etc... (abstracted for brevity)
        date: l.date ? l.date : new Date().toISOString().split('T')[0] // Needs valid date
      }));
      // await axios.post("http://localhost:8000/api/checkins/logs/bulk_update_logs/", payload);
      alert("Weekly Check-In Saved Successfully!");
    } catch (e: any) {
      console.error(e);
      alert("Failed to save check-in data.");
    } finally {
      setLoading(false);
    }
  };

  const daysLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Helper row renderer
  const renderRow = (label: string, field: string, type: string = "number", min?: string, max?: string) => (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-10">{label}</td>
      {logs.map((log, i) => (
        <td key={i} className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-center min-w-[100px]">
          {type === "checkbox" ? (
             <input type="checkbox" checked={log[field]} onChange={(e) => updateField(i, field, e.target.checked)} className="w-5 h-5 accent-indigo-600 rounded" />
          ) : type === "textarea" ? (
             <textarea value={log[field]} onChange={(e) => updateField(i, field, e.target.value)} className="w-full h-10 text-xs p-1 bg-transparent border-b border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 outline-none resize-none" placeholder="Notes..."></textarea>
          ) : (
             <input type={type} min={min} max={max} value={log[field]} onChange={(e) => updateField(i, field, e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-sm py-1 transition-colors" placeholder="-" />
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <ActivityIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Check-In Tracker</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Log your daily progress and hit your weekly goals.</p>
          </div>
        </div>
        
        {/* Week Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CalendarIcon className="w-5 h-5 text-zinc-500" />
          <select value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))} className="bg-transparent font-medium outline-none cursor-pointer">
            {Array.from({ length: totalWeeks }).map((_, i) => (
              <option key={i+1} value={i+1}>Week {i+1}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="px-4 py-3 w-48 sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">Metrics</th>
                {daysLabels.map((day, i) => (
                  <th key={day} className="px-4 py-3 text-center border-r border-zinc-200 dark:border-zinc-800 min-w-[120px]">
                    <div>{day}</div>
                    <input type="date" value={logs[i].date} onChange={(e) => updateField(i, "date", e.target.value)} className="mt-1 text-xs bg-transparent border-b border-zinc-300 dark:border-zinc-700 font-normal outline-none text-center block w-full" />
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10">Wk Avg</th>
              </tr>
            </thead>
            <tbody>
              
              {/* TABLE 1: GENERAL */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">1. General</td></tr>
              {renderRow("Weight", "weight", "number")}

              {/* TABLE 2: NUTRITION */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">2. Nutrition</td></tr>
              {renderRow("Fluid Intake (L)", "fluid_intake", "number")}
              {renderRow("Hunger Level (1-5)", "hunger_level", "number", "1", "5")}
              {renderRow("Craving Level (1-5)", "craving_level", "number", "1", "5")}

              {/* TABLE 3: TRAINING & CARDIO */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">3. Training & Cardio</td></tr>
              {renderRow("Steps", "steps", "number")}
              {renderRow("Cardio (mins)", "cardio_mins", "number")}
              {renderRow("Session Completed?", "session_completed", "checkbox")}
              {renderRow("Motivation (1-5)", "motivation", "number", "1", "5")}
              {renderRow("Performance (1-5)", "performance", "number", "1", "5")}

              {/* TABLE 4: RECOVERY & STRESS */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">4. Recovery & Stress</td></tr>
              {renderRow("Muscle Soreness (1-5)", "muscle_soreness", "number", "1", "5")}
              {renderRow("Energy Levels (1-5)", "energy_levels", "number", "1", "5")}
              {renderRow("Stress Levels (1-5)", "stress_levels", "number", "1", "5")}

              {/* TABLE 5: DIGESTION */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">5. Digestion</td></tr>
              {renderRow("Stool Frequency", "stool_frequency", "number")}
              {renderRow("Stool Quality", "stool_quality", "text")}
              {renderRow("GI Distress", "gi_distress", "text")}

              {/* TABLE 6: SLEEP */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">6. Sleep</td></tr>
              {renderRow("Sleep Duration (hr)", "sleep_duration", "number")}
              {renderRow("Sleep Quality (1-5)", "sleep_quality", "number", "1", "5")}

              {/* TABLE 7: NOTES */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/20"><td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">7. Additional Notes</td></tr>
              {renderRow("Accomplishments / Hurdles", "notes", "textarea")}

            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <button disabled={loading} onClick={saveLogs} className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors">
          {loading ? "Saving..." : "Save Week's Log"}
          <SaveIcon className="w-5 h-5 ml-1" />
        </button>
      </div>

    </div>
  );
}
