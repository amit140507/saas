"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ArrowLeftIcon, Loader2Icon, MailIcon, RulerIcon, UserIcon } from "lucide-react";

import { getClient } from "@/services/client.service";
import { getMeasurementsByClient } from "@/services/measurement.service";
import type { ClientData } from "@/types/client.type";
import type { MeasurementMetricKey, WeeklyMeasurementData } from "@/types/measurement.type";
import { ResponsiveTableFromRows } from "@/components/ui/responsive-table";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const metricOptions: Array<{ key: MeasurementMetricKey; label: string; unit: string }> = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "chest", label: "Chest", unit: "cm" },
  { key: "abdomen", label: "Abdomen", unit: "cm" },
  { key: "glutes", label: "Glutes", unit: "cm" },
  { key: "arm_left", label: "Left Arm", unit: "cm" },
  { key: "arm_right", label: "Right Arm", unit: "cm" },
  { key: "thighs_left", label: "Left Thigh", unit: "cm" },
  { key: "thighs_right", label: "Right Thigh", unit: "cm" },
  { key: "calf_left", label: "Left Calf", unit: "cm" },
  { key: "calf_right", label: "Right Calf", unit: "cm" },
];

const tableColumns: Array<{ key: MeasurementMetricKey; label: string }> = [
  { key: "weight", label: "Weight (kg)" },
  { key: "chest", label: "Chest (cm)" },
  { key: "abdomen", label: "Abdomen (cm)" },
  { key: "glutes", label: "Glutes (cm)" },
  { key: "arm_left", label: "Left Arm (cm)" },
  { key: "arm_right", label: "Right Arm (cm)" },
  { key: "thighs_left", label: "Left Thigh (cm)" },
  { key: "thighs_right", label: "Right Thigh (cm)" },
  { key: "calf_left", label: "Left Calf (cm)" },
  { key: "calf_right", label: "Right Calf (cm)" },
];

function getClientName(client?: ClientData) {
  if (!client) {
    return "Client";
  }

  const name = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
  return name || client.user.email || "Unnamed client";
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

function formatMetricValue(value: string | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function toMetricNumber(measurement: WeeklyMeasurementData, key: MeasurementMetricKey) {
  const value = measurement[key];
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export default function ClientMeasurementDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const [selectedMetric, setSelectedMetric] = useState<MeasurementMetricKey>("weight");

  const clientQuery = useQuery<ClientData>({
    queryKey: ["client-detail", clientId],
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId),
  });

  const measurementsQuery = useQuery<WeeklyMeasurementData[]>({
    queryKey: ["client-measurements", clientId],
    queryFn: () => getMeasurementsByClient(clientId),
    enabled: Boolean(clientId),
  });

  const measurements = useMemo(() => measurementsQuery.data || [], [measurementsQuery.data]);
  const selectedMetricOption = metricOptions.find((option) => option.key === selectedMetric) || metricOptions[0];
  const chartMeasurements = useMemo(
    () =>
      [...measurements]
        .sort((first, second) => new Date(first.measured_at).getTime() - new Date(second.measured_at).getTime())
        .filter((measurement) => toMetricNumber(measurement, selectedMetric) !== null),
    [measurements, selectedMetric]
  );

  const chartData = useMemo(
    () => ({
      labels: chartMeasurements.map((measurement) => formatDate(measurement.measured_at)),
      datasets: [
        {
          label: `${selectedMetricOption.label} (${selectedMetricOption.unit})`,
          data: chartMeasurements.map((measurement) => toMetricNumber(measurement, selectedMetric)),
          borderColor: "rgb(234, 88, 12)",
          backgroundColor: "rgba(234, 88, 12, 0.14)",
          pointBackgroundColor: "rgb(234, 88, 12)",
          pointBorderColor: "rgb(255, 255, 255)",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [chartMeasurements, selectedMetric, selectedMetricOption]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: { parsed: { y: number | null } }) =>
              `${selectedMetricOption.label}: ${context.parsed.y ?? "-"} ${selectedMetricOption.unit}`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value: string | number) => `${value}`,
          },
        },
      },
    }),
    [selectedMetricOption]
  );

  const isLoading = clientQuery.isLoading || measurementsQuery.isLoading;
  const hasError = clientQuery.error || measurementsQuery.error;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-32 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <RulerIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/client-tracking/measurements"
                  className="p-2 -ml-2 text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition"
                  title="Back to measurements"
                  aria-label="Back to measurements"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Measurement Review</h1>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400">
                {getClientName(clientQuery.data)}
                {clientQuery.data?.user.public_id ? ` - ${clientQuery.data.user.public_id}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <UserIcon className="w-5 h-5 text-zinc-500" />
            <span className="font-medium text-zinc-900 dark:text-white">{getClientName(clientQuery.data)}</span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <MailIcon className="w-5 h-5 text-zinc-500" />
            <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-white">
              {clientQuery.data?.user.email || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <span className="text-xs font-bold uppercase text-zinc-500">Public ID</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-white">
              {clientQuery.data?.user.public_id || "-"}
            </span>
          </div>
        </div>
      </div>

      {hasError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          Error loading measurement data. Please try again.
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex justify-center">
            <Loader2Icon className="animate-spin text-orange-600 w-8 h-8" />
          </div>
        </div>
      ) : measurements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50">
          No measurements found for this client.
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Progress Graph</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {chartMeasurements.length} logged {selectedMetricOption.label.toLowerCase()} values
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RulerIcon className="w-5 h-5 text-zinc-500" />
                <select
                  value={selectedMetric}
                  onChange={(event) => setSelectedMetric(event.target.value as MeasurementMetricKey)}
                  className="w-56 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none transition-colors focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                >
                  {metricOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-80 p-5">
              {chartMeasurements.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                  No values recorded for {selectedMetricOption.label.toLowerCase()}.
                </div>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-zinc-200 dark:border-zinc-800">
              <RulerIcon className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Historical Measurements</h2>
            </div>
            <ResponsiveTableFromRows
                    columns={["Measured At", "Column 2", "Notes"]}
                    emptyText="No records found."
                        headerClassName="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold"
                        bodyClassName="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {measurements.map((measurement) => (
                    <tr key={measurement.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                        {formatDate(measurement.measured_at)}
                      </td>
                      {tableColumns.map((column) => (
                        <td key={`${measurement.id}-${column.key}`} className="px-4 py-3 whitespace-nowrap">
                          {formatMetricValue(measurement[column.key])}
                        </td>
                      ))}
                      <td className="px-4 py-3 min-w-64 text-zinc-500 dark:text-zinc-400">
                        {measurement.notes || "-"}
                      </td>
                    </tr>
                  ))}
                
                </ResponsiveTableFromRows>
          </div>
        </>
      )}
    </div>
  );
}
