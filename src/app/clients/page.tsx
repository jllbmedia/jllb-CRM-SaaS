"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertTriangle,
  X,
  Edit2
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cell edit state trackers
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Slideout Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Local Grid Sorting state
  const [sortField, setSortField] = useState<"name" | "company">("name");
  const [sortAsc, setSortAsc] = useState(true);

  const fetchClients = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/clients?page=${page}&limit=25`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load clients.");
      setClients(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, company: newCompany, email: newEmail }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create client.");

      setClients([result.data, ...clients]);
      setTotalCount(prev => prev + 1);
      setIsAddOpen(false);
      setNewName("");
      setNewCompany("");
      setNewEmail("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Optimistic UI updates with cache-state rollback logic
  const handleCellUpdate = async (rowId: string, field: "name" | "company" | "email", originalValue: string | null) => {
    if (editValue.trim() === (originalValue || "")) {
      setEditRowId(null);
      setEditField(null);
      return;
    }

    // 1. Cache the old state
    const previousState = [...clients];

    // 2. Optimistically update local state immediately
    setClients(prev => prev.map(c => c.id === rowId ? { ...c, [field]: editValue } : c));
    setEditRowId(null);
    setEditField(null);
    setErrorMsg(null);

    try {
      const targetClient = previousState.find(c => c.id === rowId);
      const updatedClient = {
        ...targetClient,
        [field]: editValue
      };

      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rowId,
          name: updatedClient.name,
          company: updatedClient.company,
          email: updatedClient.email,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Database update failed.");
    } catch (err: any) {
      // 3. Rollback UI on fail
      setClients(previousState);
      setErrorMsg(`Sync aborted. Rolled back change to ${field}. Error: ${err.message}`);
    }
  };

  const handleSort = (field: "name" | "company") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => {
    const valA = (a[sortField] || "").toLowerCase();
    const valB = (b[sortField] || "").toLowerCase();
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Clients Grid
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
            High-density spreadsheet. Double-click or select edit on any cell to update values instantly.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_4px_12px_rgba(246,207,56,0.15)] active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus size={16} />
          <span>Add Client</span>
        </button>
      </div>

      {/* Amber Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm animate-in fade-in duration-200">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Database Transaction Alert</p>
            <p className="mt-1 text-xs opacity-90">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-amber-500/15 rounded-md text-amber-500 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search spreadsheet by name, company, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-[#161617] border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
          />
        </div>

        {/* Server-Side Pagination */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-400">
            Rows: <strong className="text-white">{totalCount}</strong> (Page {page} of {totalPages})
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-[#F6CF38] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages || totalPages === 0}
              className="p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-[#F6CF38] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid Panel */}
      {isLoading ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#F6CF38]" size={28} />
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Syncing spreadsheet records...</span>
          </div>
        </div>
      ) : sortedClients.length === 0 ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-xs space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <Users size={20} />
            </div>
            <p className="font-bold text-white text-sm">No Clients Registered</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Add your first client to start project logs and pipeline analytics.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#161617] border border-[#2D2D30] rounded-xl shadow-xl">
          <table className="min-w-full divide-y divide-[#2D2D30] text-left border-collapse">
            <thead className="bg-zinc-900/60 font-semibold text-xs text-zinc-400 uppercase tracking-wider">
              <tr>
                <th 
                  onClick={() => handleSort("name")}
                  className="px-4 py-3 border-r border-[#2D2D30] cursor-pointer hover:bg-zinc-800/40 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    {sortField === "name" && (sortAsc ? "▲" : "▼")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("company")}
                  className="px-4 py-3 border-r border-[#2D2D30] cursor-pointer hover:bg-zinc-800/40 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Company</span>
                    {sortField === "company" && (sortAsc ? "▲" : "▼")}
                  </div>
                </th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Email Address</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D30]/40 text-sm text-zinc-300">
              {sortedClients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-900/30 group">
                  
                  {/* Name Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(client.id);
                      setEditField("name");
                      setEditValue(client.name);
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[200px]"
                  >
                    {editRowId === client.id && editField === "name" ? (
                      <input
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(client.id, "name", client.name)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(client.id, "name", client.name);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-white">{client.name}</span>
                        <button 
                          onClick={() => {
                            setEditRowId(client.id);
                            setEditField("name");
                            setEditValue(client.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Company Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(client.id);
                      setEditField("company");
                      setEditValue(client.company || "");
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[200px]"
                  >
                    {editRowId === client.id && editField === "company" ? (
                      <input
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(client.id, "company", client.company)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(client.id, "company", client.company);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>{client.company || "—"}</span>
                        <button 
                          onClick={() => {
                            setEditRowId(client.id);
                            setEditField("company");
                            setEditValue(client.company || "");
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Email Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(client.id);
                      setEditField("email");
                      setEditValue(client.email || "");
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[250px]"
                  >
                    {editRowId === client.id && editField === "email" ? (
                      <input
                        type="email"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(client.id, "email", client.email)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(client.id, "email", client.email);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>{client.email || "—"}</span>
                        <button 
                          onClick={() => {
                            setEditRowId(client.id);
                            setEditField("email");
                            setEditValue(client.email || "");
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] select-none">Double-click cell to edit</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Slideout / Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161617] border border-[#2D2D30] rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl border border-[#F6CF38]/20">
                <UserPlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">Add New Client</h3>
            </div>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Johnathan Doe"
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Company</label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Acme Industries"
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. john@acme.com"
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <span>Create Client Record</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
