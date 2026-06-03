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
  History,
  Search
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

export default function AuditLogsLedger() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&limit=25`);
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

  // Local filtering search scan (across actor email, action type, target table, or description)
  const filteredLogs = logs.filter(log => 
    log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.table_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    log.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search auditing log by actor, action, table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-[#161617] border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
          />
        </div>

        {/* Server-Side Pagination info */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-400">
            Entries: <strong className="text-white">{totalCount}</strong> (Page {page} of {totalPages})
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

      {errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm animate-in fade-in duration-200">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Database Transaction Alert</p>
            <p className="mt-1 text-xs opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Spreadsheet Auditing Ledger Table Grid */}
      {isLoading ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center shadow-xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#F6CF38]" size={28} />
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Syncing chronological records...</span>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-xl flex items-center justify-center p-6 text-center shadow-xl">
          <div className="max-w-xs space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <History size={20} />
            </div>
            <p className="font-bold text-white text-sm">No Auditing Activities Found</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              No transactions match your filter criteria or have been written to the audit ledger.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#161617] border border-[#2D2D30] rounded-xl shadow-xl">
          <table className="min-w-full divide-y divide-[#2D2D30] text-left border-collapse">
            <thead className="bg-zinc-900/60 font-semibold text-xs text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Timestamp</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Active Actor</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Clearance</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Action</th>
                <th className="px-4 py-3 border-r border-[#2D2D30]">Database Target</th>
                <th className="px-4 py-3">Transaction Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D30]/40 text-sm text-zinc-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                  
                  {/* Timestamp Cell */}
                  <td className="px-4 py-3 border-r border-[#2D2D30] whitespace-nowrap text-zinc-400 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-zinc-500" />
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
                  </td>

                  {/* Actor Cell */}
                  <td className="px-4 py-3 border-r border-[#2D2D30] font-semibold text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-zinc-500" />
                      <span>{log.user_email}</span>
                    </div>
                  </td>

                  {/* Clearance Role Badge Cell */}
                  <td className="px-4 py-3 border-r border-[#2D2D30] whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                      log.user_role === "Admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[#F6CF38]/10 text-[#F6CF38] border border-[#F6CF38]/20"
                    }`}>
                      {log.user_role}
                    </span>
                  </td>

                  {/* Action Badge Cell */}
                  <td className="px-4 py-3 border-r border-[#2D2D30] whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${getActionBadgeColor(log.action_type)}`}>
                      {log.action_type}
                    </span>
                  </td>

                  {/* Database Target Cell */}
                  <td className="px-4 py-3 border-r border-[#2D2D30] whitespace-nowrap font-medium text-zinc-400">
                    {log.table_name ? (
                      <div className="flex items-center gap-1">
                        <Database size={10} className="text-zinc-500" />
                        <span>{log.table_name}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Transaction Details Description Cell (Completely Read-Only) */}
                  <td className="px-4 py-3 font-semibold text-zinc-200">
                    {log.description}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
