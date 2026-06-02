"use client";

import { useEffect, useState } from "react";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertTriangle,
  User,
  Database,
  History
} from "lucide-react";

interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  user_role: string;
  action_type: string;
  table_name: string | null;
  row_id: string | null;
  description: string;
}

export default function ActivityFeed() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&limit=15`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load audit logs.");
      setLogs(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "LOGIN":
        return "bg-green-500/10 text-green-400 border border-green-500/20";
      case "LOGOUT":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "INSERT":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "UPDATE":
        return "bg-[#F6CF38]/10 text-[#F6CF38] border border-[#F6CF38]/20";
      case "DELETE":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Feed Controls Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/30 border border-[#2D2D30] rounded-xl p-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#F6CF38]" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Immutable Audit Trail ({totalCount} entries)
          </span>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-semibold">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="p-1.5 bg-zinc-950 border border-[#2D2D30] text-zinc-400 hover:text-[#F6CF38] disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 bg-zinc-950 border border-[#2D2D30] text-zinc-400 hover:text-[#F6CF38] disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-in fade-in duration-200">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <span>Error loading audit logs: {errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#F6CF38]" size={28} />
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Loading transaction logs...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-xs space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <History size={20} />
            </div>
            <p className="font-bold text-white text-sm">Clear Audit Records</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              No authenticated activities have been written to the logs.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-6 shadow-xl relative overflow-hidden">
          
          {/* Vertical central timeline line */}
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-zinc-800"></div>

          <div className="space-y-8 relative">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-6 animate-in fade-in duration-300">
                
                {/* Timeline Dot Indicator */}
                <div className={`z-10 flex-shrink-0 w-4 h-4 rounded-full border-4 border-[#161617] shadow-lg ${
                  log.action_type === "LOGIN" ? "bg-green-400" :
                  log.action_type === "LOGOUT" ? "bg-blue-400" :
                  log.action_type === "INSERT" ? "bg-purple-400" :
                  log.action_type === "DELETE" ? "bg-red-500" :
                  "bg-[#F6CF38]"
                } ml-1`}></div>

                {/* Content Box */}
                <div className="flex-1 bg-zinc-900/40 border border-[#2D2D30]/60 hover:border-[#F6CF38]/20 rounded-xl p-4.5 space-y-3 hover:bg-zinc-900/60 transition-all duration-200">
                  
                  {/* Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D2D30]/40 pb-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <User size={13} className="text-zinc-500" />
                      <span className="font-semibold text-white">{log.user_email}</span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                        log.user_role === "Admin" ? "bg-red-500/10 text-red-400" : "bg-[#F6CF38]/10 text-[#F6CF38]"
                      }`}>
                        {log.user_role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium">
                      <Clock size={12} />
                      <span>
                        {new Date(log.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Description / Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
                    <p className="text-sm font-semibold text-zinc-200">
                      {log.description}
                    </p>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${getActionBadgeColor(log.action_type)}`}>
                        {log.action_type}
                      </span>
                      {log.table_name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-[#2D2D30] text-zinc-400 rounded text-[10px] font-semibold">
                          <Database size={10} />
                          <span>{log.table_name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
