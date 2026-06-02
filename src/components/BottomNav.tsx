"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { LayoutDashboard, Users, Briefcase, ListTodo, UserCog } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
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

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Projects", href: "/projects", icon: Briefcase },
    { name: "Tasks", href: "/tasks", icon: ListTodo },
  ];

  if (isAdmin) {
    navItems.push({ name: "Team", href: "/admin/users", icon: UserCog });
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#161617]/95 backdrop-blur-md border-t border-[#2D2D30] px-4 py-2 flex justify-around items-center h-16 safe-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative group"
          >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${
              isActive 
                ? "text-[#F6CF38] bg-[#F6CF38]/10 scale-105" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}>
              <Icon size={20} className="stroke-[2]" />
            </div>
            <span className={`text-[10px] font-medium tracking-wide transition-all duration-300 ${
              isActive ? "text-[#F6CF38]" : "text-zinc-500 group-hover:text-zinc-300"
            }`}>
              {item.name}
            </span>
            {isActive && (
              <span className="absolute -top-2 w-1.5 h-1.5 bg-[#F6CF38] rounded-full shadow-[0_0_8px_#F6CF38]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
