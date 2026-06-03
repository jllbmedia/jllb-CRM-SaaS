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
  Clock,
  Trash2,
  Calendar
} from "lucide-react";
import { logInteraction } from "@/utils/logger";

interface ProjectRef {
  id: string;
  name: string;
  client?: {
    company: string | null;
  } | null;
}

interface Task {
  id: string;
  name: string;
  project_id: string;
  status: string;
  hours_spent: number;
  cost_per_hour: number;
  created_at: string;
  created_by: string | null;
  project: {
    name: string;
    client?: {
      company: string | null;
    } | null;
  } | null;
  task_date?: string | null;
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
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transaction alert banner
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Current user state
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

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
  const [newCostPerHour, setNewCostPerHour] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete safety state trackers
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<"name" | "hours_spent">("name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .single();
          if (profile) setCurrentUser(profile);
        }
      } catch (err) {
        console.error("Error loading current user:", err);
      }
    }
    loadCurrentUser();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTargetId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete task.");

      // Log interaction upon task deletion completion
      await logInteraction(supabase, "DELETE", `Task removed from tracking grid.`);

      setTasks(prev => prev.filter(t => t.id !== deleteTargetId));
      setTotalCount(prev => Math.max(prev - 1, 0));
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetName(null);

      // Refresh to pull updated project actuals fallback calculations
      router.refresh();
    } catch (err: any) {
      setErrorMsg(`Deletion failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tasks?page=${page}&limit=25`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load tasks.");
      
      // Align status terminology from DB values
      const mappedTasks = (result.data || []).map((t: Task) => ({
        ...t,
        status: t.status === "Done" ? "Completed" : t.status === "Under Review" ? "In Review" : t.status
      }));

      setTasks(mappedTasks);
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
          hours_spent: parseFloat(newHoursSpent) || 0,
          cost_per_hour: parseFloat(newCostPerHour) || 0,
          task_date: newTaskDate || null
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create task.");

      const mappedNewTask = {
        ...result.data,
        status: result.data.status === "Done" ? "Completed" : result.data.status === "Under Review" ? "In Review" : result.data.status
      };

      setTasks([mappedNewTask, ...tasks]);
      setTotalCount(prev => prev + 1);
      setIsAddOpen(false);
      setNewName("");
      setNewProjectId("");
      setNewStatus("To Do");
      setNewHoursSpent("");
      setNewCostPerHour("");
      setNewTaskDate("");

      // Log interaction upon task creation completion
      await logInteraction(supabase, "CREATE", `Task created successfully: ${newName}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Optimistic cell updates & transaction rollback safety
  const handleCellUpdate = async (rowId: string, field: "name" | "hours_spent" | "status" | "project_id" | "cost_per_hour" | "task_date", originalValue: string | number | null) => {
    if (editValue.toString().trim() === (originalValue || "").toString()) {
      setEditRowId(null);
      setEditField(null);
      return;
    }

    // 1. Cache the old state for transaction rollback
    const previousState = [...tasks];

    // 2. Perform optimistic update instantly
    const isNumeric = ["hours_spent", "cost_per_hour"].includes(field);
    const parsedValue = isNumeric ? (parseFloat(editValue) || 0) : (field === "task_date" && !editValue ? null : editValue);
    setTasks(prev => prev.map(t => {
      if (t.id === rowId) {
        let updated = { ...t, [field]: parsedValue };
        if (field === "project_id") {
          const projData = projects.find(p => p.id === editValue);
          updated.project = projData ? { name: projData.name, client: projData.client || null } : null;
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
          [field]: parsedValue,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Database sync failed.");

      // Log interaction upon task update completion
      await logInteraction(supabase, "UPDATE", `Updated task ${field} to: "${parsedValue}"`);

      // Refresh to pull updated project actuals fallback calculations
      router.refresh();
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

  const filteredTasks = tasks.filter(t => {
    const searchMatch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.project?.name.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (t.project?.client?.company?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    if (selectedStatuses.length > 0) {
      return searchMatch && selectedStatuses.some(s => s.toLowerCase() === t.status.toLowerCase());
    }
    return searchMatch;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortField === "hours_spent") {
      return sortAsc ? a.hours_spent - b.hours_spent : b.hours_spent - a.hours_spent;
    } else {
      const projA = a.project?.name || "";
      const projB = b.project?.name || "";
      if (projA !== projB) {
        return sortAsc ? projA.localeCompare(projB) : projB.localeCompare(projA);
      }
      const dateA = a.task_date || "";
      const dateB = b.task_date || "";
      return dateB.localeCompare(dateA); // descending task_date order
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
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:max-w-3xl">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search tasks by name, project, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-[#161617] border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#F6CF38] transition-colors"
            />
          </div>

          {/* Status Checkbox Filter Row */}
          <div className="flex flex-wrap items-center gap-3 bg-[#161617] border border-[#2D2D30] px-3.5 py-2 rounded-xl text-xs">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Filter Status:</span>
            {["To Do", "In Progress", "In Review", "Completed"].map((status) => {
              const checked = selectedStatuses.includes(status);
              return (
                <label key={status} className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                      } else {
                        setSelectedStatuses([...selectedStatuses, status]);
                      }
                    }}
                    className="accent-[#F6CF38] rounded border-[#2D2D30] bg-zinc-950 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <span className="font-semibold text-[11px]">{status}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Server-Side Pagination */}
        <div className="flex items-center gap-3 flex-shrink-0 self-end lg:self-auto">
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
                <th className="px-4 py-3 border-r border-[#2D2D30]">Date Happened</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Associated Project</th>
                <th 
                  onClick={() => handleSort("name")}
                  className="px-4 py-3 border-r border-[#2D2D30] cursor-pointer hover:bg-zinc-800/40 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Task Action / Description</span>
                    {sortField === "name" && (sortAsc ? "▲" : "▼")}
                  </div>
                </th>
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
                <th className="px-4 py-3 border-r border-[#2D2D30]">Cost/Hour ($)</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Calculated Cost ($)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D30]/40 text-sm text-zinc-300">
              {sortedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-zinc-900/30 group">
                  
                  {/* Date Happened Cell (Double-click to edit) */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(task.id);
                      setEditField("task_date");
                      setEditValue(task.task_date || "");
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[150px]"
                  >
                    {editRowId === task.id && editField === "task_date" ? (
                      <input
                        type="date"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task.id, "task_date", task.task_date ?? null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(task.id, "task_date", task.task_date ?? null);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-zinc-300">
                          {task.task_date ? new Date(task.task_date + "T00:00:00").toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : "—"}
                        </span>
                        <button 
                          onClick={() => {
                            setEditRowId(task.id);
                            setEditField("task_date");
                            setEditValue(task.task_date || "");
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
                            const res = await fetch("/api/tasks", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                id: task.id,
                                status: newValue
                              }),
                            });
                            
                            const result = await res.json();
                            if (!res.ok) throw new Error(result.error || "Failed to update task status.");
                            
                            // Log interaction upon task update completion
                            await logInteraction(supabase, "UPDATE", `Updated task status to: "${newValue}"`);

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
                        <option value="In Review">In Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          task.status === "Completed" ? "bg-green-500/10 text-green-400" :
                          task.status === "In Progress" ? "bg-[#F6CF38]/10 text-[#F6CF38]" :
                          task.status === "In Review" ? "bg-purple-500/10 text-purple-400" :
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

                  {/* Cost/Hour Cell (Double-click to edit) */}
                  <td 
                    onDoubleClick={() => {
                      setEditRowId(task.id);
                      setEditField("cost_per_hour");
                      setEditValue((task.cost_per_hour || 0).toString());
                    }}
                    className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[120px]"
                  >
                    {editRowId === task.id && editField === "cost_per_hour" ? (
                      <input
                        type="number"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task.id, "cost_per_hour", task.cost_per_hour || 0)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(task.id, "cost_per_hour", task.cost_per_hour || 0);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-zinc-300">
                          ${Number(task.cost_per_hour || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          onClick={() => {
                            setEditRowId(task.id);
                            setEditField("cost_per_hour");
                            setEditValue((task.cost_per_hour || 0).toString());
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Calculated Cost Cell (Read-Only) */}
                  <td className="px-4 py-3 border-r border-[#2D2D30] relative min-w-[140px]">
                    <span className="font-bold text-white">
                      ${(Number(task.hours_spent || 0) * Number(task.cost_per_hour || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] select-none hidden lg:inline">Double-click Cell to Edit</span>
                      {(() => {
                        const isDeleteAllowed = currentUser?.role === "Admin" || task.created_by === currentUser?.id;
                        return (
                          <button
                            onClick={() => {
                              setDeleteTargetId(task.id);
                              setDeleteTargetName(task.name);
                              setIsDeleteOpen(true);
                            }}
                            disabled={!isDeleteAllowed}
                            className="p-1.5 bg-zinc-900 border border-[#2D2D30] hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-400 text-zinc-400 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#2D2D30] disabled:hover:bg-zinc-900 disabled:hover:text-zinc-400"
                            title={isDeleteAllowed ? "Delete Task" : "Only creators or admins can delete this task"}
                          >
                            <Trash2 size={14} />
                          </button>
                        );
                      })()}
                    </div>
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Task Date</label>
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full px-3 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-xs focus:outline-none focus:border-[#F6CF38] transition-colors cursor-pointer"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newHoursSpent}
                    onChange={(e) => setNewHoursSpent(e.target.value)}
                    placeholder="e.g. 4.5"
                    className="block w-full px-3 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#F6CF38] transition-colors"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Rate ($/hr)</label>
                  <input
                    type="number"
                    required
                    value={newCostPerHour}
                    onChange={(e) => setNewCostPerHour(e.target.value)}
                    placeholder="e.g. 50"
                    className="block w-full px-3 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#F6CF38] transition-colors"
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

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161617] border border-red-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteTargetId(null);
                setDeleteTargetName(null);
              }}
              className="absolute top-4 right-4 p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Confirm Deletion
              </h3>
            </div>

            <div className="space-y-3 bg-red-500/5 border border-red-500/15 rounded-xl p-4 text-xs leading-relaxed text-zinc-400">
              <p className="text-red-400 font-bold uppercase tracking-wider text-[10px]">Critical Security Warning</p>
              <p>
                You are about to permanently delete <strong className="text-white">{deleteTargetName}</strong>. 
                This action is irreversible and the task log will be lost.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeleteTargetId(null);
                  setDeleteTargetName(null);
                }}
                className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-[#2D2D30] text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Delete Record</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
