"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  Briefcase, 
  CheckSquare, 
  ShieldCheck, 
  PlusCircle, 
  Database,
  ArrowRight,
  AlertTriangle,
  Activity,
  Calendar
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  budget: number;
  estimated_hours: number;
  estimated_cost: number;
  actual_hours: number;
  actual_cost: number;
  created_at: string;
  client: Client | null;
}

interface Task {
  id: string;
  name: string;
  hours_spent: number;
  cost_per_hour: number;
  created_at: string;
  project_id: string;
}

interface DashboardData {
  metrics: {
    revenue: number;
    hours: number;
    activeProjects: number;
    completedProjects: number;
  };
  charts: {
    topClients: Array<{ name: string; value: number }>;
    statusDistribution: Array<{ name: string; value: number }>;
  };
  projects: Project[];
  tasks: Task[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Timeframe / Date-Range States
  const [datePreset, setDatePreset] = useState<"all" | "30d" | "quarter" | "year" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Variance toggles
  const [varianceView, setVarianceView] = useState<"project" | "client">("project");

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load dashboard metrics.");
      setData(result);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper function to check if created_at falls inside selected timeframe
  const isWithinRange = (dateStr: string) => {
    if (datePreset === "all") return true;

    const dateVal = new Date(dateStr);
    let start: Date | null = null;
    let end: Date | null = new Date(); // Default end to today

    if (datePreset === "30d") {
      start = new Date();
      start.setDate(start.getDate() - 30);
    } else if (datePreset === "quarter") {
      const now = new Date();
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterMonth, 1);
    } else if (datePreset === "year") {
      start = new Date(new Date().getFullYear(), 0, 1);
    } else if (datePreset === "custom") {
      if (startDate) start = new Date(startDate);
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    if (start && dateVal < start) return false;
    if (end && dateVal > end) return false;
    return true;
  };

  // Memoized dynamically filtered datasets
  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    return data.projects.filter((p) => isWithinRange(p.created_at));
  }, [data?.projects, datePreset, startDate, endDate]);

  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.filter((t) => isWithinRange(t.created_at));
  }, [data?.tasks, datePreset, startDate, endDate]);

  // Dynamically compute filtered aggregates
  const dynamicRevenue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (Number(p.estimated_cost || p.budget) || 0), 0);
  }, [filteredProjects]);

  const dynamicHours = useMemo(() => {
    return filteredTasks.reduce((sum, t) => sum + (Number(t.hours_spent) || 0), 0);
  }, [filteredTasks]);

  const dynamicActiveProjects = useMemo(() => {
    return filteredProjects.filter((p) => 
      ["planning", "pending", "active", "ongoing", "on hold", "onhold"].includes(p.status.toLowerCase())
    ).length;
  }, [filteredProjects]);

  const dynamicCompletedProjects = useMemo(() => {
    return filteredProjects.filter((p) => p.status.toLowerCase() === "completed").length;
  }, [filteredProjects]);

  // Donut Colors & statuses setup
  const statusColors = ["#71717A", "#F59E0B", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6"];
  const projectStatuses = ["Planning", "Pending", "Active", "Ongoing", "On Hold", "Completed"];

  // 1. Status Distribution data
  const statusDistributionData = useMemo(() => {
    return projectStatuses.map((status) => {
      const count = filteredProjects.filter(
        (p) => p.status.toLowerCase() === status.toLowerCase()
      ).length;
      return { name: status, value: count };
    });
  }, [filteredProjects]);

  // 2. Budget vs Actual Project/Client Variance data
  const financialProjectData = useMemo(() => {
    return filteredProjects.map((p) => ({
      name: p.name.length > 18 ? p.name.substring(0, 15) + "..." : p.name,
      "Estimated Cost": Number(p.estimated_cost || p.budget || 0),
      "Actual Cost": Number(p.actual_cost || 0),
    }));
  }, [filteredProjects]);

  const financialClientData = useMemo(() => {
    const clientMap: { [name: string]: { est: number; act: number } } = {};
    filteredProjects.forEach((p) => {
      const name = p.client?.company || p.client?.name || "Unassigned Client";
      if (!clientMap[name]) {
        clientMap[name] = { est: 0, act: 0 };
      }
      clientMap[name].est += Number(p.estimated_cost || p.budget || 0);
      clientMap[name].act += Number(p.actual_cost || 0);
    });
    return Object.entries(clientMap).map(([name, val]) => ({
      name: name.length > 18 ? name.substring(0, 15) + "..." : name,
      "Estimated Cost": val.est,
      "Actual Cost": val.act,
    }));
  }, [filteredProjects]);

  // 3. Labor Variance data
  const laborProjectData = useMemo(() => {
    return filteredProjects.map((p) => ({
      name: p.name.length > 18 ? p.name.substring(0, 15) + "..." : p.name,
      "Estimated Hours": Number(p.estimated_hours || 0),
      "Actual Hours": Number(p.actual_hours || 0),
    }));
  }, [filteredProjects]);

  // 4. Proactive Risk Watchlist (Active/On Hold projects exceeding 90% budget exhaustion)
  const riskWatchlist = useMemo(() => {
    return filteredProjects.filter((p) => {
      if (p.status.toLowerCase() === "completed") return false;
      const est = Number(p.estimated_cost) || 0;
      const act = Number(p.actual_cost) || 0;
      return est > 0 && act >= 0.90 * est;
    });
  }, [filteredProjects]);

  // 5. Total number of hard cap breaches
  const hardCapBreaches = useMemo(() => {
    return filteredProjects.filter((p) => {
      const estCost = Number(p.estimated_cost) || 0;
      const actCost = Number(p.actual_cost) || 0;
      const estHours = Number(p.estimated_hours) || 0;
      const actHours = Number(p.actual_hours) || 0;
      
      const costBreached = estCost > 0 && actCost >= estCost;
      const hoursBreached = estHours > 0 && actHours >= estHours;
      return costBreached || hoursBreached;
    });
  }, [filteredProjects]);

  // Custom tooltips matching JLLB premium styles
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
          {label && <p className="font-bold text-white uppercase tracking-wider text-[10px]">{label}</p>}
          {payload.map((pld: any, idx: number) => (
            <p key={idx} className="font-semibold" style={{ color: pld.fill }}>
              {pld.name}: {typeof pld.value === "number" && pld.name.toLowerCase().includes("cost")
                ? `$${pld.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : `${pld.value} ${pld.name.toLowerCase().includes("hours") ? "hrs" : ""}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasStatusData = useMemo(() => {
    return statusDistributionData.some((item) => item.value > 0);
  }, [statusDistributionData]);

  const hasVarianceData = useMemo(() => {
    return filteredProjects.length > 0;
  }, [filteredProjects]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Interactive visual command center
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
            Executive JLLB business overview, interactive metrics, and budget variance monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#161617] border border-[#2D2D30] rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-300 self-start md:self-auto shadow-md">
          <Calendar size={14} className="text-[#F6CF38]" />
          <span>June 2, 2026</span>
        </div>
      </div>

      {/* Date-Range Selector Panel */}
      <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-2">Scope timeframe:</span>
          {(["all", "30d", "quarter", "year", "custom"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                datePreset === preset
                  ? "bg-[#F6CF38] text-zinc-950 shadow-[0_0_12px_rgba(246,207,56,0.25)]"
                  : "bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white"
              }`}
            >
              {preset === "all" ? "All Time" :
               preset === "30d" ? "Last 30 Days" :
               preset === "quarter" ? "This Quarter" :
               preset === "year" ? "This Year" :
               "Custom Range"}
            </button>
          ))}
        </div>

        {datePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 animate-in slide-in-from-right-4 duration-200 w-full md:w-auto">
            <div className="relative w-full md:w-auto flex items-center">
              <Calendar size={14} className="absolute left-3 text-neutral-100 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-400 text-xs font-semibold rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#F6CF38] w-full md:w-auto transition-colors"
              />
            </div>
            <span className="text-neutral-100 text-xs font-bold uppercase">to</span>
            <div className="relative w-full md:w-auto flex items-center">
              <Calendar size={14} className="absolute left-3 text-neutral-100 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-400 text-xs font-semibold rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#F6CF38] w-full md:w-auto transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Critical Alert Banners if hard cap breaches detected */}
      {hardCapBreaches.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm animate-in fade-in duration-200 shadow-md">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Hard Cap Budget Breach Alerts</p>
            <p className="mt-1 text-xs opacity-90">
              There are <strong className="text-white">{hardCapBreaches.length}</strong> active projects that have fully exhausted their estimated budgets or labor allocations. Ensure PM allocations are revised immediately.
            </p>
          </div>
        </div>
      )}

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Accumulated Revenue */}
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 hover:border-[#F6CF38]/30 transition-all duration-300 shadow-lg relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Accumulated Revenue</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-[#2D2D30] text-[#F6CF38]">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <span className="text-2xl font-black tracking-tight text-white block">
              ${dynamicRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Total Pipeline Value</span>
          </div>
        </div>

        {/* Total Logged Hours */}
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 hover:border-[#F6CF38]/30 transition-all duration-300 shadow-lg relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Total Logged Hours</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-[#2D2D30] text-[#F6CF38]">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <span className="text-2xl font-black tracking-tight text-white block">
              {dynamicHours.toFixed(1)} hrs
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Logged Teammate Hours</span>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 hover:border-[#F6CF38]/30 transition-all duration-300 shadow-lg relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Active Projects</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-[#2D2D30] text-[#F6CF38]">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <span className="text-2xl font-black tracking-tight text-white block">
              {dynamicActiveProjects}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Planning or ongoing</span>
          </div>
        </div>

        {/* Completed Contracts */}
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 hover:border-[#F6CF38]/30 transition-all duration-300 shadow-lg relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Completed Contracts</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-[#2D2D30] text-[#F6CF38]">
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <span className="text-2xl font-black tracking-tight text-white block">
              {dynamicCompletedProjects}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Finished deliverable agreements</span>
          </div>
        </div>

      </div>

      {/* Analytics Visualization Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Budget vs Actual Cost Variance */}
        <div className="lg:col-span-2 bg-[#161617] border border-[#2D2D30] rounded-xl p-6 shadow-xl space-y-4 flex flex-col h-[400px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-[#F6CF38]" />
              <span>Financial Budget Variance (Est vs Actual Cost)</span>
            </h2>
            <div className="flex items-center gap-1 bg-zinc-900 border border-[#2D2D30] rounded-lg p-1">
              <button
                onClick={() => setVarianceView("project")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  varianceView === "project" ? "bg-[#F6CF38] text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                By Project
              </button>
              <button
                onClick={() => setVarianceView("client")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  varianceView === "client" ? "bg-[#F6CF38] text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                By Client
              </button>
            </div>
          </div>

          <div className="flex-1 w-full relative min-h-0">
            {!hasVarianceData ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-zinc-950/20 border border-dashed border-[#2D2D30] rounded-xl">
                <div className="p-3 bg-zinc-800 text-zinc-500 rounded-xl">
                  <Database size={24} />
                </div>
                <h3 className="text-sm font-bold text-white">No Financial Variance Data</h3>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  No projects fit this date range. Adjust your timeline parameters or add projects.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={varianceView === "project" ? financialProjectData : financialClientData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2D30" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#71717A" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#71717A" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `$${val >= 1000 ? (val / 1000) + 'k' : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', opacity: 0.02 }} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', color: '#A1A1AA', paddingTop: '10px' }}
                  />
                  <Bar dataKey="Estimated Cost" fill="#F6CF38" radius={[4, 4, 0, 0]} maxBarSize={35} />
                  <Bar dataKey="Actual Cost" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart: Project Status Distribution */}
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-6 shadow-xl space-y-4 flex flex-col h-[400px]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Activity size={16} className="text-[#F6CF38]" />
            <span>Allocation Status Distribution</span>
          </h2>

          <div className="flex-1 w-full relative min-h-0">
            {!hasStatusData ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-zinc-950/20 border border-dashed border-[#2D2D30] rounded-xl">
                <div className="p-3 bg-zinc-800 text-zinc-500 rounded-xl">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-sm font-bold text-white">No Distributions Available</h3>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Assign project statuses within the selected timeframe to populate the distribution.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', color: '#A1A1AA', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Row 2: Labor Hours Variance & Proactive Risk watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Labor Hours Variance Bar Chart */}
        <div className="lg:col-span-2 bg-[#161617] border border-[#2D2D30] rounded-xl p-6 shadow-xl space-y-4 flex flex-col h-[380px]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Clock size={16} className="text-[#F6CF38]" />
            <span>Labor Hour Variance (Allocated vs Logged Actuals)</span>
          </h2>

          <div className="flex-1 w-full relative min-h-0">
            {!hasVarianceData ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-zinc-950/20 border border-dashed border-[#2D2D30] rounded-xl">
                <div className="p-3 bg-zinc-800 text-zinc-500 rounded-xl">
                  <Clock size={24} />
                </div>
                <h3 className="text-sm font-bold text-white">No Labor Variance Data</h3>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Initialize projects with estimated hours to begin monitoring labor efficiency.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={laborProjectData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2D30" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#71717A" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#71717A" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val}h`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', opacity: 0.02 }} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', color: '#A1A1AA', paddingTop: '10px' }}
                  />
                  <Bar dataKey="Estimated Hours" fill="#F6CF38" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Actual Hours" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Risk Monitoring Watchlist Card */}
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-6 shadow-xl space-y-4 flex flex-col h-[380px]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-[#F6CF38]" />
            <span>Budget Risk Watchlist (90%+)</span>
          </h2>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
            {riskWatchlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 bg-zinc-950/10 border border-dashed border-[#2D2D30] rounded-xl">
                <div className="p-2.5 bg-zinc-800 text-zinc-500 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">All Systems Clear</h3>
                <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                  No active projects are currently hovering above the 90% budget exhaustion threshold.
                </p>
              </div>
            ) : (
              riskWatchlist.map((proj) => {
                const estCost = Number(proj.estimated_cost) || 0;
                const actCost = Number(proj.actual_cost) || 0;
                const percentSpent = estCost > 0 ? (actCost / estCost) * 100 : 0;
                const isCritical = percentSpent >= 100;

                return (
                  <div 
                    key={proj.id} 
                    className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all duration-200 hover:scale-[1.01] ${
                      isCritical 
                        ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" 
                        : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <h4 className="font-bold text-sm text-white leading-tight">{proj.name}</h4>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold mt-0.5 block">
                          {proj.client?.company || proj.client?.name || "Unassigned Client"}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase flex-shrink-0 ${
                        isCritical 
                          ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {percentSpent.toFixed(0)}% Spent
                      </span>
                    </div>

                    {/* Progress slider bar */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-[#2D2D30]/40">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCritical ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(percentSpent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                        <span>Spent: <strong className="text-zinc-300">${actCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                        <span>Budget: <strong className="text-zinc-300">${estCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                      </div>
                    </div>

                    {isCritical && (
                      <span className="text-[9px] font-black text-red-400 flex items-center gap-1 uppercase tracking-wider">
                        <AlertTriangle size={10} />
                        <span>Critical Breach Event Detected</span>
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
