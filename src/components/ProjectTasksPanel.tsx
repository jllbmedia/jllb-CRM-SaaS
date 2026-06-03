"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { X, Loader2, ListTodo } from "lucide-react";
import { logInteraction } from "@/utils/logger";

interface Task {
  id: string;
  name: string;
  status: string;
  hours_spent: number;
  cost_per_hour: number;
}

interface ProjectTasksPanelProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectTasksPanel({
  projectId,
  isOpen,
  onClose,
}: ProjectTasksPanelProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "To Do" | "In Progress" | "In Review" | "Completed">("All");

  // Edit states
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleCellUpdate = async (taskId: string, field: "name" | "status" | "hours_spent", originalValue: any, explicitValue?: any) => {
    const valueToUse = explicitValue !== undefined ? explicitValue : editValue;
    if (valueToUse.toString().trim() === (originalValue ?? "").toString()) {
      setEditRowId(null);
      setEditField(null);
      return;
    }

    const previousTasks = [...tasks];
    const isNumeric = field === "hours_spent";
    const parsedValue = isNumeric ? (parseFloat(valueToUse) || 0) : valueToUse;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: parsedValue } : t));
    setEditRowId(null);
    setEditField(null);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ [field]: parsedValue })
        .eq("id", taskId);

      if (error) throw error;

      await logInteraction(supabase, "UPDATE", `Updated task ${field} to: "${parsedValue}"`);

      await fetchProjectTasks();
      router.refresh();
    } catch (err) {
      console.error("Failed to update task cell:", err);
      setTasks(previousTasks);
    }
  };

  // Create Task states
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("To Do");
  const [newTaskHours, setNewTaskHours] = useState("");
  const [newTaskRate, setNewTaskRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProjectTasks = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, hours_spent, cost_per_hour")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching project tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjectTasks();
      setIsAdding(false);
    }
  }, [projectId, isOpen]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        name: newTaskName,
        project_id: projectId,
        hours_spent: parseFloat(newTaskHours) || 0,
        status: newTaskStatus,
        cost_per_hour: parseFloat(newTaskRate) || 0,
        created_by: user?.id || null,
        task_date: new Date().toISOString().split("T")[0],
      };

      const { error } = await supabase.from("tasks").insert(payload);
      if (error) throw error;

      await logInteraction(supabase, "CREATE", `Task created successfully: ${newTaskName}`);

      setNewTaskName("");
      setNewTaskStatus("To Do");
      setNewTaskHours("");
      setNewTaskRate("");
      setIsAdding(false);

      await fetchProjectTasks();
      router.refresh();
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (statusFilter === "All") return tasks;
    return tasks.filter((t) => t.status.toLowerCase() === statusFilter.toLowerCase());
  }, [tasks, statusFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[50vw] sm:max-w-[50%] bg-[#161617] border-l border-[#2D2D30] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Panel Header */}
      <div className="p-5 border-b border-[#2D2D30] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl">
            <ListTodo size={18} />
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">
            Project Tasks
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F6CF38]/10 text-[#F6CF38] border border-[#F6CF38]/20 hover:bg-[#F6CF38]/20 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all duration-200 cursor-pointer"
          >
            {isAdding ? "Cancel" : "+ New Task"}
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Inline Create Form */}
      {isAdding && (
        <form onSubmit={handleCreateTask} className="p-5 bg-[#1a1a1c] border-b border-[#2D2D30] space-y-4 animate-in slide-in-from-top duration-250">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Create New Task</h4>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Description / Action Name</label>
            <input
              type="text"
              required
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="e.g. Implement API route guards"
              className="block w-full px-3 py-2 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#F6CF38] transition-colors"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Status</label>
              <select
                value={newTaskStatus}
                onChange={(e) => setNewTaskStatus(e.target.value)}
                className="block w-full px-2 py-2 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-xs focus:outline-none focus:border-[#F6CF38] transition-colors cursor-pointer"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Hours Spent</label>
              <input
                type="number"
                step="0.1"
                value={newTaskHours}
                onChange={(e) => setNewTaskHours(e.target.value)}
                placeholder="e.g. 5"
                className="block w-full px-3 py-2 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#F6CF38] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Cost / Hr ($)</label>
              <input
                type="number"
                value={newTaskRate}
                onChange={(e) => setNewTaskRate(e.target.value)}
                placeholder="e.g. 75"
                className="block w-full px-3 py-2 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#F6CF38] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <span>Create Task</span>}
          </button>
        </form>
      )}

      {/* Filter Badges Row */}
      <div className="p-4 border-b border-[#2D2D30]/60 flex gap-2 overflow-x-auto scrollbar-none">
        {(["All", "To Do", "In Progress", "In Review", "Completed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
              statusFilter === status
                ? "bg-[#F6CF38] text-zinc-950 shadow-[0_2px_8px_rgba(246,207,56,0.25)]"
                : "bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#F6CF38]" size={24} />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#2D2D30] rounded-xl text-zinc-500 space-y-2">
            <ListTodo size={20} />
            <p className="text-xs font-semibold">No Tasks Found</p>
            <p className="text-[10px] text-zinc-600">
              There are no tasks for this project matching the filter.
            </p>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const calculatedCost = t.hours_spent * t.cost_per_hour;
            return (
              <div
                key={t.id}
                className="p-4 bg-zinc-900/50 border border-[#2D2D30]/60 rounded-xl hover:border-[#F6CF38]/20 transition-all duration-200 space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  {editRowId === t.id && editField === "name" ? (
                    <input
                      type="text"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellUpdate(t.id, "name", t.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCellUpdate(t.id, "name", t.name);
                        if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                      }}
                      className="bg-zinc-900 border border-[#F6CF38] rounded px-2 py-0.5 text-white text-xs focus:outline-none w-full"
                    />
                  ) : (
                    <h4 
                      onDoubleClick={() => {
                        setEditRowId(t.id);
                        setEditField("name");
                        setEditValue(t.name);
                      }}
                      className="font-bold text-sm text-white leading-tight hover:text-[#F6CF38] cursor-pointer transition-colors"
                    >
                      {t.name}
                    </h4>
                  )}
                  {editRowId === t.id && editField === "status" ? (
                    <select
                      autoFocus
                      value={editValue}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setEditValue(newValue);
                        await handleCellUpdate(t.id, "status", t.status, newValue);
                      }}
                      onBlur={() => {
                        setEditRowId(null);
                        setEditField(null);
                      }}
                      className="bg-zinc-900 border border-[#F6CF38] rounded px-2 py-0.5 text-white text-[10px] focus:outline-none cursor-pointer"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  ) : (
                    <span
                      onDoubleClick={() => {
                        setEditRowId(t.id);
                        setEditField("status");
                        setEditValue(t.status);
                      }}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap cursor-pointer hover:border-[#F6CF38]/30 border border-transparent transition-all ${
                        t.status.toLowerCase() === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : t.status.toLowerCase() === "in progress"
                          ? "bg-blue-500/10 text-blue-400"
                          : t.status.toLowerCase() === "in review"
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold border-t border-[#2D2D30]/40 pt-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                      Hours Spent
                    </span>
                    {editRowId === t.id && editField === "hours_spent" ? (
                      <input
                        type="number"
                        step="0.5"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(t.id, "hours_spent", t.hours_spent)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(t.id, "hours_spent", t.hours_spent);
                          if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                        }}
                        className="bg-zinc-900 border border-[#F6CF38] rounded px-2 py-0.5 text-white text-xs focus:outline-none w-20"
                      />
                    ) : (
                      <span 
                        onDoubleClick={() => {
                          setEditRowId(t.id);
                          setEditField("hours_spent");
                          setEditValue(t.hours_spent.toString());
                        }}
                        className="text-zinc-300 hover:text-[#F6CF38] cursor-pointer transition-colors block"
                      >
                        {Number(t.hours_spent).toFixed(1)} hrs
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                      Calculated Cost
                    </span>
                    <span className="text-zinc-300">
                      ${Number(calculatedCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
