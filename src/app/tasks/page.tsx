"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  ListTodo, 
  PlusCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertTriangle,
  X,
  Edit2,
  Clock
} from "lucide-react";

interface ProjectRef {
  id: string;
  name: string;
}

interface Task {
  id: string;
  name: string;
  project_id: string;
  status: string;
  hours_spent: number;
  created_at: string;
  project: {
    name: string;
  } | null;
}

export default function TasksPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Transaction alert banner
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cell edit state trackers
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add Task Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newStatus, setNewStatus] = useState("To Do");
  const [newHoursSpent, setNewHoursSpent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<"name" | "hours_spent">("name");
  const [sortAsc, setSortAsc] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tasks?page=${page}&limit=25`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load tasks.");
      setTasks(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects?limit=100");
      const result = await res.json();
      if (res.ok) setProjects(result.data);
    } catch (e) {
      console.error("Could not load projects directory:", e);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [page]);

  // Compute total hours of all loaded tasks
  const totalHoursLogged = tasks.reduce((sum, task) => sum + (Number(task.hours_spent) || 0), 0);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectId) {
      setErrorMsg("Please select a project.");
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          project_id: newProjectId,
          status: newStatus,
          hours_spent: parseFloat(newHoursSpent) || 0
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create task.");

      setTasks([result.data, ...tasks]);
      setTotalCount(prev => prev + 1);
      setIsAddOpen(false);
      setNewName("");
      setNewProjectId("");
      setNewStatus("To Do");
      setNewHoursSpent("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Optimistic cell updates & transaction rollback safety
  const handleCellUpdate = async (rowId: string, field: "name" | "hours_spent" | "status" | "project_id", originalValue: string | number | null) => {
    if (editValue.toString().trim() === (originalValue || "").toString()) {
      setEditRowId(null);
      setEditField(null);
      return;
    }

    // 1. Cache the old state for transaction rollback
    const previousState = [...tasks];

    // 2. Perform optimistic update instantly
    const parsedValue = field === "hours_spent" ? (parseFloat(editValue) || 0) : editValue;
    setTasks(prev => prev.map(t => {
      if (t.id === rowId) {
        let updated = { ...t, [field]: parsedValue };
        if (field === "project_id") {
          const projData = projects.find(p => p.id === editValue);
          updated.project = projData ? { name: projData.name } : null;
        }
        return updated;
      }
      return t;
    }));
    setEditRowId(null);
    setEditField(null);
    setErrorMsg(null);

    try {
      const targetTask = previousState.find(t => t.id === rowId);
      const updatedTask = {
        ...targetTask,
        [field]: parsedValue
      };

      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rowId,
          name: updatedTask.name,
          project_id: updatedTask.project_id,
          status: updatedTask.status,
          hours_spent: updatedTask.hours_spent,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Database sync failed.");
    } catch (err: any) {
      // 3. Rollback UI instantly on failure
      setTasks(previousState);
      setErrorMsg(`Sync aborted. Rolled back change to ${field}. Error: ${err.message}`);
    }
  };

  const handleSort = (field: "name" | "hours_spent") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.project?.name.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortField === "hours_spent") {
      return sortAsc ? a.hours_spent - b.hours_spent : b.hours_spent - a.hours_spent;
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
            Tasks Grid
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
            High-density spreadsheet. Double-click or select edit on any cell to update task descriptions, status, and log hours instantly.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_4px_12px_rgba(246,207,56,0.15)] active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle size={16} />
          <span>New Task</span>
        </button>
      </div>

      {/* KPI Hours Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Total Active Logged Hours</span>
            <span className="text-2xl font-black text-[#F6CF38] tracking-tight block">
              {totalHoursLogged.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs
            </span>
          </div>
          <div className="p-3 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl">
            <Clock size={20} />
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
            placeholder="Search tasks by name, project, status..."
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
      ) : sortedTasks.length === 0 ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-xs space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <ListTodo size={20} />
            </div>
            <p className="font-bold text-white text-sm">No Action Items Listed</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Create a new task, assign it to projects, and start logging hours spent.
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
                    <span>Task Action Item</span>
                    {sortField === "name" && (sortAsc ? "▲" : "▼")}
                  </div>
                </th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Associated Project</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Status</th>
                <th 
                  onClick={() => handleSort("hours_spent")}
                  className="px-4 py-3 border-r border-[#2D2D30] cursor-pointer hover:bg-zinc-800/40 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Hours Logged</span>
                    {sortField === "hours_spent" && (sortAsc ? "▲" : "▼")}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D30]/40 text-sm text-zinc-300">
              {sortedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-zinc-900/30 group">
                  
                  {/* Name Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(task.id);
                      setEditField("name");
                      setEditValue(task.name);
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[200px]"
                  >
                    {editRowId === task.id && editField === "name" ? (
                      <input
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task.id, "name", task.name)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(task.id, "name", task.name);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-white">{task.name}</span>
                        <button 
                          onClick={() => {
                            setEditRowId(task.id);
                            setEditField("name");
                            setEditValue(task.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Project Selector Cell */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(task.id);
                      setEditField("project_id");
                      setEditValue(task.project_id);
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[200px]"
                  >
                    {editRowId === task.id && editField === "project_id" ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task.id, "project_id", task.project_id)}
                        onChangeCapture={(e) => handleCellUpdate(task.id, "project_id", task.project_id)}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none cursor-pointer"
                      >
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>{task.project?.name || "—"}</span>
                        <button 
                          onClick={() => {
                            setEditRowId(task.id);
                            setEditField("project_id");
                            setEditValue(task.project_id);
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
                      setEditRowId(task.id);
                      setEditField("status");
                      setEditValue(task.status);
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[150px]"
                  >
                    {editRowId === task.id && editField === "status" ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={async (e) => {
                          const newValue = e.target.value;
                          setEditValue(newValue);
                          
                          // 1. Cache the old state for transaction rollback safety
                          const previousState = [...tasks];
                          
                          // 2. Perform optimistic update instantly
                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newValue } : t));
                          setEditRowId(null);
                          setEditField(null);
                          setErrorMsg(null);
                          
                          try {
                            const { error } = await supabase
                              .from("tasks")
                              .update({ status: newValue })
                              .eq("id", task.id);
                            
                            if (error) throw error;
                            
                            // Successful API response: refresh to keep the data locked and in sync
                            router.refresh();
                          } catch (err: any) {
                            // Rollback instantly to cached state on fail
                            setTasks(previousState);
                            setErrorMsg(`Sync aborted. Rolled back change to status. Error: ${err.message}`);
                          }
                        }}
                        onBlur={() => {
                          setEditRowId(null);
                          setEditField(null);
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Done">Done</option>
                      </select>
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          task.status === "Done" ? "bg-green-500/10 text-green-400" :
                          task.status === "In Progress" ? "bg-[#F6CF38]/10 text-[#F6CF38]" :
                          task.status === "Under Review" ? "bg-purple-500/10 text-purple-400" :
                          "bg-zinc-800 text-zinc-400"
                        }`}>
                          {task.status}
                        </span>
                        <button 
                          onClick={() => {
                            setEditRowId(task.id);
                            setEditField("status");
                            setEditValue(task.status);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Hours Spent Cell (Optimistic UI updates) */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(task.id);
                      setEditField("hours_spent");
                      setEditValue(task.hours_spent.toString());
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[120px]"
                  >
                    {editRowId === task.id && editField === "hours_spent" ? (
                      <input
                        type="number"
                        step="0.5"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task.id, "hours_spent", task.hours_spent)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(task.id, "hours_spent", task.hours_spent);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-white">
                          {Number(task.hours_spent).toFixed(1)} hrs
                        </span>
                        <button 
                          onClick={() => {
                            setEditRowId(task.id);
                            setEditField("hours_spent");
                            setEditValue(task.hours_spent.toString());
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

      {/* Add Task Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161617] border border-[#2D2D30] rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl border border-[#F6CF38]/20">
                <ListTodo size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">Assign New Task</h3>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Action Item Description</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Design Branding Mockups"
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Select Project</label>
                <select
                  required
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-sm focus:outline-none focus:border-[#F6CF38] transition-colors cursor-pointer"
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-sm focus:outline-none focus:border-[#F6CF38] transition-colors cursor-pointer"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Hours Logged</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newHoursSpent}
                    onChange={(e) => setNewHoursSpent(e.target.value)}
                    placeholder="e.g. 4.5"
                    className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || !newProjectId}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <span>Create Task Record</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
