"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { X, Loader2, Briefcase } from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  budget: number;
  actual_cost: number | null;
}

interface ClientProjectsPanelProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientProjectsPanel({
  clientId,
  isOpen,
  onClose,
}: ClientProjectsPanelProps) {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Planning" | "On Hold" | "Completed">("All");

  // Edit states
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleCellUpdate = async (projectId: string, field: "name" | "status" | "budget", originalValue: any, explicitValue?: any) => {
    const valueToUse = explicitValue !== undefined ? explicitValue : editValue;
    if (valueToUse.toString().trim() === (originalValue ?? "").toString()) {
      setEditRowId(null);
      setEditField(null);
      return;
    }

    const previousProjects = [...projects];
    const isNumeric = field === "budget";
    const parsedValue = isNumeric ? (parseFloat(valueToUse) || 0) : valueToUse;

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, [field]: parsedValue } : p));
    setEditRowId(null);
    setEditField(null);

    try {
      const { error } = await supabase
        .from("projects")
        .update({ [field]: parsedValue })
        .eq("id", projectId);

      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Failed to update project cell:", err);
      setProjects(previousProjects);
    }
  };

  useEffect(() => {
    if (!clientId || !isOpen) return;

    async function fetchClientProjects() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, status, budget, actual_cost")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error("Error fetching client projects:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClientProjects();
  }, [clientId, isOpen, supabase]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === "All") return projects;
    return projects.filter((p) => p.status.toLowerCase() === statusFilter.toLowerCase());
  }, [projects, statusFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[50vw] sm:max-w-[50%] bg-[#161617] border-l border-[#2D2D30] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Panel Header */}
      <div className="p-5 border-b border-[#2D2D30] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl">
            <Briefcase size={18} />
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">
            Client Projects
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter Badges Row */}
      <div className="p-4 border-b border-[#2D2D30]/60 flex gap-2 overflow-x-auto scrollbar-none">
        {(["All", "Active", "Planning", "On Hold", "Completed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
              statusFilter === status
                ? "bg-[#F6CF38] text-zinc-950 shadow-[0_2px_8px_rgba(246,207,56,0.2)]"
                : "bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#F6CF38]" size={24} />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#2D2D30] rounded-xl text-zinc-500 space-y-2">
            <Briefcase size={20} />
            <p className="text-xs font-semibold">No Projects Found</p>
            <p className="text-[10px] text-zinc-600">
              There are no projects for this client matching the filter.
            </p>
          </div>
        ) : (
          filteredProjects.map((p) => (
            <div
              key={p.id}
              className="p-4 bg-zinc-900/50 border border-[#2D2D30]/60 rounded-xl hover:border-[#F6CF38]/20 transition-all duration-200 space-y-3"
            >
              <div className="flex justify-between items-start gap-2">
                {editRowId === p.id && editField === "name" ? (
                  <input
                    type="text"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleCellUpdate(p.id, "name", p.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCellUpdate(p.id, "name", p.name);
                      if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                    }}
                    className="bg-zinc-900 border border-[#F6CF38] rounded px-2 py-0.5 text-white text-xs focus:outline-none"
                  />
                ) : (
                  <h4 
                    onDoubleClick={() => {
                      setEditRowId(p.id);
                      setEditField("name");
                      setEditValue(p.name);
                    }}
                    className="font-bold text-sm text-white hover:text-[#F6CF38] cursor-pointer transition-colors"
                  >
                    {p.name}
                  </h4>
                )}
                {editRowId === p.id && editField === "status" ? (
                  <select
                    autoFocus
                    value={editValue}
                    onChange={async (e) => {
                      const newValue = e.target.value;
                      setEditValue(newValue);
                      await handleCellUpdate(p.id, "status", p.status, newValue);
                    }}
                    onBlur={() => {
                      setEditRowId(null);
                      setEditField(null);
                    }}
                    className="bg-zinc-900 border border-[#F6CF38] rounded px-2 py-0.5 text-white text-[10px] focus:outline-none cursor-pointer"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : (
                  <span
                    onDoubleClick={() => {
                      setEditRowId(p.id);
                      setEditField("status");
                      setEditValue(p.status);
                    }}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer hover:border-[#F6CF38]/30 border border-transparent transition-all ${
                      p.status.toLowerCase() === "completed"
                        ? "bg-green-500/10 text-green-400"
                        : p.status.toLowerCase() === "active" || p.status.toLowerCase() === "ongoing"
                        ? "bg-[#F6CF38]/10 text-[#F6CF38]"
                        : p.status.toLowerCase() === "on hold" || p.status.toLowerCase() === "onhold"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {p.status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold border-t border-[#2D2D30]/40 pt-2.5">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                    Budget
                  </span>
                  {editRowId === p.id && editField === "budget" ? (
                    <input
                      type="number"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellUpdate(p.id, "budget", p.budget)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCellUpdate(p.id, "budget", p.budget);
                        if (e.key === "Escape") { setEditRowId(null); setEditField(null); }
                      }}
                      className="bg-zinc-900 border border-[#F6CF38] rounded px-2 py-0.5 text-white text-xs focus:outline-none w-24"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => {
                        setEditRowId(p.id);
                        setEditField("budget");
                        setEditValue(p.budget.toString());
                      }}
                      className="text-zinc-300 hover:text-[#F6CF38] cursor-pointer transition-colors block"
                    >
                      ${Number(p.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                    Actual Cost
                  </span>
                  <span className="text-zinc-300">
                    ${Number(p.actual_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
