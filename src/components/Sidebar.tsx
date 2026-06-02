"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  ListTodo, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  UserCog,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
          
        if (profile?.role === "Admin") {
          setIsAdmin(true);
        }
      } catch (e) {
        console.warn("Could not query user role for navigation visibility:", e);
      }
    }
    checkRole();
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      // 1. Hook Application-Layer Audit Log
      await fetch("/api/audit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "LOGOUT",
          description: "Teammate explicitly signed out of the CRM workspace."
        })
      });
    } catch (e) {
      console.warn("Could not log logout audit event:", e);
    }
    
    // 2. Perform Supabase Sign Out and redirect
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Projects", href: "/projects", icon: Briefcase },
    { name: "Tasks", href: "/tasks", icon: ListTodo },
  ];

  if (isAdmin) {
    navItems.push({ name: "Team Settings", href: "/admin/users", icon: UserCog });
  }

  return (
    <aside 
      className={`hidden md:flex flex-col h-screen sticky top-0 left-0 bg-[#161617] border-r border-[#2D2D30] text-zinc-100 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#2D2D30] justify-between overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 rounded-xl bg-[#F6CF38]/10 text-[#F6CF38]">
            <ShieldCheck size={24} className="stroke-[2]" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg tracking-wider text-white">
              JLLB <span className="text-[#F6CF38]">CRM</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? "bg-[#F6CF38]/10 text-[#F6CF38] font-semibold" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <Icon 
                size={20} 
                className={`flex-shrink-0 transition-transform duration-300 ${
                  isActive ? "stroke-[2.5]" : "stroke-[1.75] group-hover:scale-105"
                }`} 
              />
              {!isCollapsed && (
                <span className="text-sm tracking-wide">{item.name}</span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-zinc-900 border border-[#2D2D30] text-[#F6CF38] text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                  {item.name}
                </div>
              )}

              {/* Left active line accent */}
              {isActive && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#F6CF38] rounded-r-full" />
              )}
            </Link>
          );
        })}

        {/* Sign Out Trigger Button */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200 group relative text-zinc-500 hover:text-red-400 hover:bg-red-500/5 mt-6 cursor-pointer text-left"
        >
          <LogOut 
            size={20} 
            className="flex-shrink-0 transition-transform duration-300 stroke-[1.75] group-hover:scale-105" 
          />
          {!isCollapsed && (
            <span className="text-sm tracking-wide font-semibold">Sign Out</span>
          )}

          {isCollapsed && (
            <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-zinc-900 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
              Sign Out
            </div>
          )}
        </button>
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-4 border-t border-[#2D2D30] flex justify-end">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-[#F6CF38] hover:border-[#F6CF38]/50 hover:bg-[#F6CF38]/5 transition-all duration-200"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
