"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EyeIcon, Loader2Icon, RulerIcon } from "lucide-react";

import { getClients } from "@/services/client.service";
import type { ClientData } from "@/types/client.type";

function getClientName(client: ClientData) {
  const name = `${client.user.first_name || ""} ${client.user.last_name || ""}`.trim();
  return name || client.user.email || "Unnamed client";
}

export default function ClientMeasurementsPage() {
  const { data: clients, isLoading, error } = useQuery<ClientData[]>({
    queryKey: ["client-measurements-list"],
    queryFn: getClients,
  });

  const clientList = clients || [];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <RulerIcon className="w-7 h-7 text-orange-500" />
            Client Measurements
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Review client body measurements and progress trends.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold transition-colors">
                <th className="px-6 py-4">Client Public ID</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                    <div className="flex justify-center">
                      <Loader2Icon className="animate-spin text-orange-600 w-8 h-8" />
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-red-500">
                    Error loading clients. Please try again.
                  </td>
                </tr>
              ) : clientList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                    No clients found.
                  </td>
                </tr>
              ) : (
                clientList.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                        {client.user.public_id || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">{client.user.email || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-white text-base">
                        {getClientName(client)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/client-tracking/measurements/${client.id}`}
                        className="inline-flex p-2 text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition"
                        title="View"
                        aria-label={`View measurements for ${getClientName(client)}`}
                      >
                        <EyeIcon className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
