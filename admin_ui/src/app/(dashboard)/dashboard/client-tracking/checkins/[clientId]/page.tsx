"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  ArrowLeftIcon,
  CalendarIcon,
  EditIcon,
  Loader2Icon,
  UsersIcon,
} from "lucide-react";

import { getCheckInLogsByPlan, getCheckInPlansByClient } from "@/services/checkin.service";
import { getClient } from "@/services/client.service";
import type { CheckInLogData } from "@/types/checkin.type";
import type { ClientData } from "@/types/client.type";

const DEFAULT_TOTAL_WEEKS = 12;
const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type MetricType = "number" | "boolean" | "text" | "textarea";

interface MetricRow {
  label: string;
  field: keyof CheckInLogData;
  type: MetricType;
}

interface MetricSection {
  title: string;
  rows: MetricRow[];
}

interface WeekColumn {
  dateKey: string;
  date: Date;
}

const metricSections: MetricSection[] = [
  {
    title: "1. General",
    rows: [{ label: "Date Submitted", field: "date", type: "text" }],
  },
  {
    title: "2. Nutrition",
    rows: [
      { label: "Fluid Intake (L)", field: "fluid_intake", type: "number" },
      { label: "Hunger Level (1-5)", field: "hunger_level", type: "number" },
      { label: "Craving Level (1-5)", field: "craving_level", type: "number" },
      { label: "Off Plan Meal?", field: "off_plan_meal", type: "boolean" },
      { label: "Off Plan Details", field: "off_plan_meal_details", type: "textarea" },
    ],
  },
  {
    title: "3. Training & Cardio",
    rows: [
      { label: "Steps", field: "steps", type: "number" },
      { label: "Cardio?", field: "cardio", type: "boolean" },
      { label: "Cardio Duration (mins)", field: "cardio_duration", type: "number" },
      { label: "Strength Training?", field: "strength_training", type: "boolean" },
      { label: "Strength Details", field: "strength_training_details", type: "textarea" },
      { label: "Motivation (1-5)", field: "motivation", type: "number" },
      { label: "Performance (1-5)", field: "performance", type: "number" },
    ],
  },
  {
    title: "4. Recovery & Stress",
    rows: [
      { label: "Muscle Soreness (1-5)", field: "muscle_soreness", type: "number" },
      { label: "Energy Levels (1-5)", field: "energy_levels", type: "number" },
      { label: "Stress Levels (1-5)", field: "stress_levels", type: "number" },
    ],
  },
  {
    title: "5. Digestion",
    rows: [
      { label: "Stool Frequency", field: "stool_frequency", type: "number" },
      { label: "Stool Quality", field: "stool_quality", type: "text" },
      { label: "GI Distress", field: "gi_distress", type: "text" },
    ],
  },
  {
    title: "6. Sleep",
    rows: [
      { label: "Sleep Duration (hr)", field: "sleep_duration", type: "number" },
      { label: "Sleep Quality (1-5)", field: "sleep_quality", type: "number" },
    ],
  },
  {
    title: "7. Additional Notes",
    rows: [{ label: "Accomplishments / Hurdles", field: "notes", type: "textarea" }],
  },
];

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getClientName(client?: ClientData) {
  if (!client) {
    return "Client";
  }

  const name = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
  return name || client.user.email || "Unnamed client";
}

function formatDisplayDate(value?: string) {
  if (!value) {
    return "-";
  }

  return dayFormatter.format(parseDate(value));
}

function formatValue(log: CheckInLogData | undefined, row: MetricRow) {
  if (!log) {
    return "-";
  }

  const value = log[row.field];

  if (row.type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (row.field === "date" && typeof value === "string") {
    return formatDisplayDate(value);
  }

  return String(value);
}

export default function ClientCheckinDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const [selectedWeek, setSelectedWeek] = useState(1);

  const clientQuery = useQuery<ClientData>({
    queryKey: ["client-detail", clientId],
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId),
  });

  const plansQuery = useQuery({
    queryKey: ["client-checkin-plans", clientId],
    queryFn: () => getCheckInPlansByClient(clientId),
    enabled: Boolean(clientId),
  });

  const selectedPlan = plansQuery.data?.[0];
  const selectedPlanStartDate = selectedPlan?.start_date;
  const totalWeeks = useMemo(() => {
    const highestLoggedWeek = selectedPlan?.daily_logs?.reduce(
      (maxWeek, log) => Math.max(maxWeek, log.week_number || 0),
      0
    );

    return Math.max(DEFAULT_TOTAL_WEEKS, highestLoggedWeek || 0);
  }, [selectedPlan]);

  const logsQuery = useQuery({
    queryKey: ["client-checkin-logs", selectedPlan?.id, selectedWeek],
    queryFn: () => getCheckInLogsByPlan(selectedPlan?.id || "", selectedWeek),
    enabled: Boolean(selectedPlan?.id),
  });

  const weekColumns = useMemo<WeekColumn[]>(() => {
    if (!selectedPlanStartDate) {
      return [];
    }

    const weekStart = addDays(parseDate(selectedPlanStartDate), (selectedWeek - 1) * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      return {
        date,
        dateKey: toDateInputValue(date),
      };
    });
  }, [selectedPlanStartDate, selectedWeek]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, CheckInLogData>();
    for (const log of logsQuery.data || []) {
      map.set(log.date, log);
    }
    return map;
  }, [logsQuery.data]);

  const weekLogs = weekColumns.map((column) => logsByDate.get(column.dateKey));
  const weekStartDate = weekColumns[0]?.date;
  const weekEndDate = weekColumns[weekColumns.length - 1]?.date;
  const isLoading = clientQuery.isLoading || plansQuery.isLoading || logsQuery.isLoading;
  const hasError = clientQuery.error || plansQuery.error || logsQuery.error;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-32">
      <div className="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <ActivityIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/client-tracking/checkins"
                  className="p-2 -ml-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  title="Back to check-ins"
                  aria-label="Back to check-ins"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Check-In Review</h1>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400">
                {getClientName(clientQuery.data)}
                {clientQuery.data?.user.public_id ? ` - ${clientQuery.data.user.public_id}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/client-tracking/checkins/${clientId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <EditIcon className="w-4 h-4" />
              Edit
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm w-full md:w-auto">
            <UsersIcon className="w-5 h-5 text-zinc-500" />
            <span className="font-medium text-zinc-900 dark:text-white">{getClientName(clientQuery.data)}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CalendarIcon className="w-5 h-5 text-zinc-500" />
              <select
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(Number(event.target.value))}
                className="bg-transparent font-medium outline-none cursor-pointer text-zinc-900 dark:text-white"
              >
                {Array.from({ length: totalWeeks }).map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Week {index + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {weekStartDate && weekEndDate
                ? `${dayFormatter.format(weekStartDate)} - ${dayFormatter.format(weekEndDate)}`
                : "No week dates"}
            </div>
          </div>
        </div>
      </div>

      {hasError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          Error loading check-in data. Please try again.
        </div>
      ) : plansQuery.isSuccess && !selectedPlan ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50">
          No check-in plan found for this client.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden opacity-95">
          <div className="overflow-x-auto relative">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 dark:bg-zinc-950/70">
                <Loader2Icon className="animate-spin text-indigo-600 w-8 h-8" />
              </div>
            )}
            <div className="min-w-max">
              <div className="flex bg-zinc-100 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
                  <div className="sticky left-0 z-10 w-48 shrink-0 border-b border-r border-zinc-200 bg-zinc-100 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                    Metrics
                  </div>
                  {weekColumns.map((column) => (
                    <div key={column.dateKey} className="min-w-[120px] border-b border-r border-zinc-200 px-4 py-3 text-center dark:border-zinc-800">
                      <div>{column.date.toLocaleDateString("en-US", { weekday: "long" })}</div>
                      <div className="text-xs font-normal text-zinc-400 mt-1">{dayFormatter.format(column.date)}</div>
                    </div>
                  ))}
              </div>
                {metricSections.map((section) => (
                  <FragmentSection key={section.title} section={section} weekLogs={weekLogs} />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentSection({ section, weekLogs }: { section: MetricSection; weekLogs: Array<CheckInLogData | undefined> }) {
  return (
    <div>
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/20">
          {section.title}
      </div>
      {section.rows.map((row) => (
        <div
          key={`${section.title}-${row.field}`}
          className="flex border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
        >
          <div className="sticky left-0 z-10 w-48 shrink-0 whitespace-nowrap border-r border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {row.label}
          </div>
          {weekLogs.map((log, index) => (
            <div
              key={`${String(row.field)}-${index}`}
              className="min-w-[120px] border-r border-zinc-200 p-2 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
            >
              {row.type === "textarea" ? (
                <div className="max-h-16 overflow-y-auto text-left text-xs p-1">{formatValue(log, row)}</div>
              ) : (
                <span>{formatValue(log, row)}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
