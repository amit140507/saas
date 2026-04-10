"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { UsersIcon, UserPlusIcon, SearchIcon, Loader2Icon, EditIcon, Trash2Icon } from "lucide-react";

interface ClientData {
  id: number;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  status: string;
  goal: string;
  health_conditions: string;
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
    status: "active", goal: "", health_conditions: ""
  });

  const { data: clients, isLoading, error } = useQuery<ClientData[]>({
    queryKey: ["clients-management"],
    queryFn: async () => {
      const response = await api.get("/clients/management/");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/clients/management/", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-management"] });
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await api.put(`/clients/management/${id}/`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-management"] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/clients/management/${id}/`);
    },
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
      status: "active", goal: "", health_conditions: ""
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
      phone: client.user.phone || "",
      status: client.status || "active",
      goal: client.goal || "",
      health_conditions: client.health_conditions || ""
    });
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      user: {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone
      },
      status: form.status,
      goal: form.goal,
      health_conditions: form.health_conditions
    };

    if (modalMode === "add") {
      createMutation.mutate(payload);
    } else if (modalMode === "edit" && selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data: payload });
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-indigo-500" />
            Clients & Members
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage active gym members and online clients.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <UserPlusIcon className="w-5 h-5" />
          Add Client
        </button>
      </div>

      {/* Stats/Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center text-sm">
        <div className="relative w-full md:w-96">
          <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search clients by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
          />
        </div>
        <div className="flex items-center gap-6 text-zinc-500">
          <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Active: {filteredClients.filter(c => c.status === 'active').length}</span>
          <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500 block"></span> Leads: {filteredClients.filter(c => c.status === 'lead').length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold transition-colors">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Client Profile</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Goal</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
              {isLoading ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                        <div className="flex justify-center">
                            <Loader2Icon className="animate-spin text-indigo-600 w-8 h-8" />
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        client.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        client.status === 'lead' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400' : 
                        'bg-rose-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                      }`}>
                        {client.status}
                      </span>
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
                      <div className="text-zinc-500 text-xs">{client.user.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{client.goal || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleOpenEdit(client)}
                            className="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
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
    </div>
  );
}
