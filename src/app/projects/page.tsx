"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  Briefcase, 
  FolderPlus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertTriangle,
  X,
  Edit2,
  DollarSign
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
  status: string;
  budget: number;
  created_at: string;
  client: {
    name: string;
    company: string | null;
  } | null;
}

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Transaction banner
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cell edit state trackers
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add Project Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newStatus, setNewStatus] = useState("Planning");
  const [newBudget, setNewBudget] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Grid Sorting
  const [sortField, setSortField] = useState<"name" | "budget">("name");
  const [sortAsc, setSortAsc] = useState(true);

  const fetchProjects = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/projects?page=${page}&limit=25`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load projects.");
      setProjects(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients?limit=100");
      const result = await res.json();
      if (res.ok) setClients(result.data);
    } catch (e) {
      console.error("Could not load clients directory:", e);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [page]);

  // Compute total budget pipeline of all active loaded projects
  const totalBudgetPipeline = projects.reduce((sum, proj) => sum + (Number(proj.budget) || 0), 0);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId) {
      setErrorMsg("Please select a client.");
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          client_id: newClientId,
          status: newStatus,
          budget: parseFloat(newBudget) || 0
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create project.");

      setProjects([result.data, ...projects]);
      setTotalCount(prev => prev + 1);
      setIsAddOpen(false);
      setNewName("");
      setNewClientId("");
      setNewStatus("Planning");
      setNewBudget("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Optimistic cell updates with automatic cached rollback safety
  const handleCellUpdate = async (rowId: string, field: "name" | "budget" | "status" | "client_id", originalValue: string | number | null) => {
    if (editValue.toString().trim() === (originalValue || "").toString()) {
      setEditRowId(null);
      setEditField(null);
      return;
    }

    // 1. Cache the old state for transaction rollback safety
    const previousState = [...projects];

    // 2. Perform optimistic update instantly
    const parsedValue = field === "budget" ? (parseFloat(editValue) || 0) : editValue;
    setProjects(prev => prev.map(p => {
      if (p.id === rowId) {
        let updated = { ...p, [field]: parsedValue };
        if (field === "client_id") {
          const clientData = clients.find(c => c.id === editValue);
          updated.client = clientData ? { name: clientData.name, company: null } : null;
        }
        return updated;
      }
      return p;
    }));
    setEditRowId(null);
    setEditField(null);
    setErrorMsg(null);

    try {
      const targetProj = previousState.find(p => p.id === rowId);
      const updatedProj = {
        ...targetProj,
        [field]: parsedValue
      };

      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rowId,
          name: updatedProj.name,
          client_id: updatedProj.client_id,
          status: updatedProj.status,
          budget: updatedProj.budget,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Database sync failed.");
    } catch (err: any) {
      // 3. Rollback instantly to cached state on fail
      setProjects(previousState);
      setErrorMsg(`Sync aborted. Rolled back change to ${field}. Error: ${err.message}`);
    }
  };

  const handleSort = (field: "name" | "budget") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.client?.name.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortField === "budget") {
      return sortAsc ? a.budget - b.budget : b.budget - a.budget;
    } else {
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Projects Grid
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
            High-density spreadsheet. Double-click or select edit on any cell to update budgets and statuses instantly.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_4px_12px_rgba(246,207,56,0.15)] active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <FolderPlus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* KPI Pipeline Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Active Pipeline Total</span>
            <span className="text-2xl font-black text-[#F6CF38] tracking-tight block">
              ${totalBudgetPipeline.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>
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
            placeholder="Search projects by name, client, status..."
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
      ) : sortedProjects.length === 0 ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-xs space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <p className="font-bold text-white text-sm">No Projects Listed</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Launch your first project to associate tasks, calculate metrics, and monitor logs.
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
                    <span>Project Name</span>
                    {sortField === "name" && (sortAsc ? "▲" : "▼")}
                  </div>
                </th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Associated Client</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Status</th>
                <th 
                  onClick={() => handleSort("budget")}
                  className="px-4 py-3 border-r border-[#2D2D30] cursor-pointer hover:bg-zinc-800/40 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Budget ($)</span>
                    {sortField === "budget" && (sortAsc ? "▲" : "▼")}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D30]/40 text-sm text-zinc-300">
              {sortedProjects.map((project) => (
                <tr key={project.id} className="hover:bg-zinc-900/30 group">
                  
                  {/* Name Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(project.id);
                      setEditField("name");
                      setEditValue(project.name);
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[200px]"
                  >
                    {editRowId === project.id && editField === "name" ? (
                      <input
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(project.id, "name", project.name)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(project.id, "name", project.name);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-white">{project.name}</span>
                        <button 
                          onClick={() => {
                            setEditRowId(project.id);
                            setEditField("name");
                            setEditValue(project.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Client Selector Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(project.id);
                      setEditField("client_id");
                      setEditValue(project.client_id);
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[200px]"
                  >
                    {editRowId === project.id && editField === "client_id" ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(project.id, "client_id", project.client_id)}
                        onChangeCapture={(e) => handleCellUpdate(project.id, "client_id", project.client_id)}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none cursor-pointer"
                      >
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>{project.client?.name || "—"}</span>
                        <button 
                          onClick={() => {
                            setEditRowId(project.id);
                            setEditField("client_id");
                            setEditValue(project.client_id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Status Dropdown Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(project.id);
                      setEditField("status");
                      setEditValue(project.status);
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[150px]"
                  >
                    {editRowId === project.id && editField === "status" ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={async (e) => {
                          const newValue = e.target.value;
                          setEditValue(newValue);
                          
                          // 1. Cache the old state for transaction rollback safety
                          const previousState = [...projects];
                          
                          // 2. Perform optimistic update instantly
                          setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: newValue } : p));
                          setEditRowId(null);
                          setEditField(null);
                          setErrorMsg(null);
                          
                          try {
                            const { error } = await supabase
                              .from("projects")
                              .update({ status: newValue })
                              .eq("id", project.id);
                            
                            if (error) throw error;
                            
                            // Successful API response: refresh to keep the data locked and in sync
                            router.refresh();
                          } catch (err: any) {
                            // Rollback instantly to cached state on fail
                            setProjects(previousState);
                            setErrorMsg(`Sync aborted. Rolled back change to status. Error: ${err.message}`);
                          }
                        }}
                        onBlur={() => {
                          setEditRowId(null);
                          setEditField(null);
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="Planning">Planning</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          project.status === "Completed" ? "bg-green-500/10 text-green-400" :
                          project.status === "Active" ? "bg-[#F6CF38]/10 text-[#F6CF38]" :
                          project.status === "On Hold" ? "bg-red-500/10 text-red-400" :
                          "bg-zinc-800 text-zinc-400"
                        }`}>
                          {project.status}
                        </span>
                        <button 
                          onClick={() => {
                            setEditRowId(project.id);
                            setEditField("status");
                            setEditValue(project.status);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Budget Cell (Optimistic budget updates) */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(project.id);
                      setEditField("budget");
                      setEditValue(project.budget.toString());
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[150px]"
                  >
                    {editRowId === project.id && editField === "budget" ? (
                      <input
                        type="number"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(project.id, "budget", project.budget)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(project.id, "budget", project.budget);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-white">
                          ${Number(project.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          onClick={() => {
                            setEditRowId(project.id);
                            setEditField("budget");
                            setEditValue(project.budget.toString());
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3 text-right text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] select-none">Double-click Cell to Edit</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Project Slideout / Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161617] border border-[#2D2D30] rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl border border-[#F6CF38]/20">
                <Briefcase size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">Launch New Project</h3>
            </div>
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Project Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Website Redesign"
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Select Client</label>
                <select
                  required
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-sm focus:outline-none focus:border-[#F6CF38] transition-colors cursor-pointer"
                >
                  <option value="">-- Choose Colleague Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Initial Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-sm focus:outline-none focus:border-[#F6CF38] transition-colors cursor-pointer"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Budget ($)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g. 5000"
                    className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || !newClientId}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <span>Initialize Project</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
