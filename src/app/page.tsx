"use client";

import { useEffect, useState } from "react";
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
  ArrowRight
} from "lucide-react";

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
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const donutColors = ["#F6CF38", "#D97706", "#10B981"]; // Gold (Pending), Amber (Ongoing), Emerald (Finished)

  // Custom tooltips matching JLLB premium visual styles
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-3 shadow-2xl text-xs space-y-1">
          {label && <p className="font-bold text-white uppercase tracking-wider text-[10px]">{label}</p>}
          <p className="font-semibold text-[#F6CF38]">
            {payload[0].name}: {typeof payload[0].value === 'number' && payload[0].value > 100 
              ? `$${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
              : `${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Rendering shimmering loader skeletons
  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="space-y-2">
          <div className="h-9 w-48 bg-zinc-800 rounded-lg animate-pulse"></div>
          <div className="h-5 w-96 bg-zinc-800/60 rounded-lg animate-pulse"></div>
        </div>

        {/* 4 Shimmering Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-9 w-9 bg-zinc-800 rounded-xl animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-3.5 w-32 bg-zinc-800/60 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Shimmering Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#161617] border border-[#2D2D30] rounded-xl p-6 h-96 flex flex-col justify-between">
            <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-64 w-full bg-zinc-800/40 rounded-xl animate-pulse"></div>
          </div>
          <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-6 h-96 flex flex-col justify-between">
            <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-64 w-full bg-zinc-800/40 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Fallbacks if data returns empty or unconfigured
  const hasRevenueData = data?.charts.topClients && data.charts.topClients.length > 0;
  const hasStatusData = data?.charts.statusDistribution && data.charts.statusDistribution.some(item => item.value > 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Dashboard
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
            Executive JLLB business overview, visual analytics, and multi-tenant scoped metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#161617] border border-[#2D2D30] rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-300 self-start md:self-auto">
          <Clock size={14} className="text-[#F6CF38]" />
          <span>June 2, 2026</span>
        </div>
      </div>

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
              ${(data?.metrics.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              {(data?.metrics.hours || 0).toFixed(1)} hrs
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
              {data?.metrics.activeProjects || 0}
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
              {data?.metrics.completedProjects || 0}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Finished deliverable agreements</span>
          </div>
        </div>

      </div>

      {/* Analytics Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Client Revenue Contributions */}
        <div className="lg:col-span-2 bg-[#161617] border border-[#2D2D30] rounded-xl p-6 shadow-xl space-y-4 flex flex-col h-96">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Top Client Contributions to Revenue
          </h2>

          <div className="flex-1 w-full relative min-h-0">
            {!hasRevenueData ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-zinc-950/20 border border-dashed border-[#2D2D30] rounded-xl">
                <div className="p-3 bg-zinc-800 text-zinc-500 rounded-xl">
                  <Database size={24} />
                </div>
                <h3 className="text-sm font-bold text-white">No Revenue Contributions</h3>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  No active projects found. Create a client and assign a project budget to begin tracking contributions.
                </p>
                <Link
                  href="/clients"
                  className="flex items-center gap-1.5 text-xs font-bold text-[#F6CF38] hover:text-white transition-colors"
                >
                  <span>Build your directory</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.charts.topClients}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2D30" opacity={0.5} />
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', opacity: 0.03 }} />
                  <Bar 
                    dataKey="value" 
                    name="Contribution" 
                    fill="#F6CF38" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={45} 
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart: Project Status Distribution */}
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-6 shadow-xl space-y-4 flex flex-col h-96">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Project Status Distribution
          </h2>

          <div className="flex-1 w-full relative min-h-0">
            {!hasStatusData ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-zinc-950/20 border border-dashed border-[#2D2D30] rounded-xl">
                <div className="p-3 bg-zinc-800 text-zinc-500 rounded-xl">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-sm font-bold text-white">No Project Metrics</h3>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  No status distributions found. Initialize a project record to track distribution metrics.
                </p>
                <Link
                  href="/projects"
                  className="flex items-center gap-1.5 text-xs font-bold text-[#F6CF38] hover:text-white transition-colors"
                >
                  <span>Launch projects</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.charts.statusDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data?.charts.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', color: '#A1A1AA', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
