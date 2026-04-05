"use client";

import { useState, useEffect } from "react";
import { UsersIcon, UserPlusIcon, MoreVerticalIcon, SearchIcon, ActivityIcon } from "lucide-react";
// import axios from "axios";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    status: "active", goal: "", health_conditions: ""
  });

  useEffect(() => {
    // In real app:
    // axios.get("/api/clients/management/").then(res => { setClients(res.data); setLoading(false); });
    setTimeout(() => {
      setClients([
        { id: 1, user: { first_name: "Bruce", last_name: "Wayne", email: "bruce@wayne.com", phone: "555-0101" }, status: "active", goal: "Muscle Gain" },
        { id: 2, user: { first_name: "Clark", last_name: "Kent", email: "clark@dailyplanet.com", phone: "555-0202" }, status: "lead", goal: "Strength" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    // const res = await axios.post("/api/clients/management/", { ...form, user: { first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone } });
    // setClients([...clients, res.data]);
    alert("Client safely added and login credentials generated.");
    setIsModalOpen(false);
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
          onClick={() => setIsModalOpen(true)}
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
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-zinc-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-6 text-zinc-500">
          <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Active: {clients.filter(c => c.status === 'active').length}</span>
          <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500 block"></span> Leads: {clients.filter(c => c.status === 'lead').length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Client Profile</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Goal</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-400">Loading clients...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-400">No clients found. Add one above.</td></tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        client.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        client.status === 'lead' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400' : 
                        'bg-rose-100 text-red-800 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-white text-base">
                        {client.user.first_name} {client.user.last_name}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                         Added via Manual Entry
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-900 dark:text-white font-medium">{client.user.email}</div>
                      <div className="text-zinc-500 text-xs">{client.user.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{client.goal || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-zinc-400 hover:text-indigo-600 transition-colors p-2">
                        <MoreVerticalIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Add New Client</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">First Name</label>
                  <input required type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Last Name</label>
                  <input required type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Account Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                  <option value="active">Active Member</option>
                  <option value="lead">Lead / Prospect</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Primary Goal</label>
                <input type="text" placeholder="e.g. Fat Loss, Competition Prep" value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
