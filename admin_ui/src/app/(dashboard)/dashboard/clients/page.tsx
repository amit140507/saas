"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, deleteClient, getClients, updateClient } from "@/services/client.service";
import type { ClientData, ClientPayload } from "@/types/client.type";
import { UsersIcon, UserPlusIcon, SearchIcon, Loader2Icon, EditIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell } from "@/components/ui/page";

function getClientStatusVariant(status: string) {
  if (status === "active") {
    return "success" as const;
  }
  if (status === "lead") {
    return "warning" as const;
  }
  return "destructive" as const;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    status: "active", goal: ""
  });

  const { data: clients, isLoading, error } = useQuery<ClientData[]>({
    queryKey: ["clients-management"],
    queryFn: getClients,
  });

  const createMutation = useMutation({
    mutationFn: (data: ClientPayload) => createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-management"] });
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: ClientPayload }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-management"] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-management"] });
      setClientToDelete(null);
    }
  });

  const filteredClients = clients?.filter(client => {
    const full_name = `${client.user.first_name} ${client.user.last_name}`.toLowerCase();
    const email = client.user.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return full_name.includes(query) || email.includes(query);
  }) || [];

  const handleOpenAdd = () => {
    setModalMode("add");
    setForm({
      first_name: "", last_name: "", email: "", phone: "",
      status: "active", goal: ""
    });
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: ClientData) => {
    setModalMode("edit");
    setForm({
      first_name: client.user.first_name || "",
      last_name: client.user.last_name || "",
      email: client.user.email || "",
      phone: client.phone || "",
      status: client.status || "active",
      goal: client.goal || ""
    });
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ClientPayload = {
      user: {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email
      },
      phone: form.phone,
      status: form.status,
      goal: form.goal
    };

    if (modalMode === "add") {
      createMutation.mutate(payload);
    } else if (modalMode === "edit" && selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data: payload });
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Clients & Members"
        description="Manage active gym members and online clients."
        icon={UsersIcon}
        actions={(
        <Button
          onClick={handleOpenAdd}
        >
          <UserPlusIcon className="w-5 h-5" />
          Add Client
        </Button>
        )}
      />

      {/* Stats/Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center text-sm">
        <div className="relative w-full md:w-96">
          <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <Input 
            type="text" 
            placeholder="Search clients by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-6 text-zinc-500">
          <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Active: {filteredClients.filter(c => c.status === 'active').length}</span>
          <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500 block"></span> Leads: {filteredClients.filter(c => c.status === 'lead').length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Client Profile</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Goal</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-card-foreground transition-colors">
              {isLoading ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                        <div className="flex justify-center">
                            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    </td>
                </tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-red-500">Error loading clients. Please try again.</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                  {searchQuery ? "No matching clients found." : "No clients found. Add one above."}
                </td></tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <Badge variant={getClientStatusVariant(client.status)} className="uppercase">
                        {client.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-white text-base">
                        {client.user.first_name} {client.user.last_name}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                         Added via manual entry
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-900 dark:text-white font-medium">{client.user.email}</div>
                      <div className="text-zinc-500 text-xs">{client.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{client.goal || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleOpenEdit(client)}
                            className="p-2 text-muted-foreground transition hover:text-primary"
                            title="Edit"
                        >
                            <EditIcon className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setClientToDelete(client)}
                            className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition"
                            title="Delete"
                        >
                            <Trash2Icon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:hidden">
        {isLoading ? (
          <Card><CardContent className="flex justify-center py-10"><Loader2Icon className="h-7 w-7 animate-spin text-primary" /></CardContent></Card>
        ) : error ? (
          <Card><CardContent className="py-10 text-center text-sm text-destructive">Error loading clients. Please try again.</CardContent></Card>
        ) : filteredClients.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{searchQuery ? "No matching clients found." : "No clients found. Add one above."}</CardContent></Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">
                      {client.user.first_name} {client.user.last_name}
                    </h2>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{client.user.email}</p>
                  </div>
                  <Badge variant={getClientStatusVariant(client.status)} className="uppercase">{client.status}</Badge>
                </div>
                <div className="space-y-2 border-t border-border pt-4">
                  <DetailRow label="Phone" value={client.phone || "No phone"} />
                  <DetailRow label="Goal" value={client.goal || "-"} />
                </div>
                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(client)} title="Edit">
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setClientToDelete(client)} title="Delete" className="hover:text-destructive">
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {modalMode === 'add' ? 'Add New Client' : 'Edit Client Profile'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-2xl leading-none transition">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">First Name</label>
                  <input required type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Last Name</label>
                  <input required type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Account Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition">
                  <option value="active">Active Member</option>
                  <option value="lead">Lead / Prospect</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Primary Goal</label>
                <input type="text" placeholder="e.g. Fat Loss, Competition Prep" value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none dark:text-white transition" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 mt-6 tracking-wide">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                  Cancel
                </button>
                <button disabled={createMutation.isPending || updateMutation.isPending} type="submit" className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2Icon className="w-4 h-4 animate-spin" />}
                  {modalMode === 'add' ? 'Create Client' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                        <Trash2Icon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Delete Client?</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                        Are you sure you want to remove <span className="font-semibold text-zinc-900 dark:text-white">{clientToDelete.user.first_name} {clientToDelete.user.last_name}</span>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setClientToDelete(null)}
                            className="flex-1 py-2 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(clientToDelete.id)}
                            className="flex-1 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {deleteMutation.isPending && <Loader2Icon className="w-4 h-4 animate-spin" />}
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </PageShell>
  );
}
