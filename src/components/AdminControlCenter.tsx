"use client";

import { useState } from "react";
import { Users, History } from "lucide-react";
import TeammateList from "./TeammateList";
import ActivityFeed from "./ActivityFeed";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: "Admin" | "PM";
  created_at: string;
}

export default function AdminControlCenter({ initialMembers }: { initialMembers: Member[] }) {
  const [activeTab, setActiveTab] = useState<"directory" | "audit">("directory");

  return (
    <div className="space-y-6">
      
      {/* Premium Tabs Selector */}
      <div className="flex border-b border-[#2D2D30] gap-6 text-sm">
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 pb-3.5 font-bold tracking-wide uppercase text-xs border-b-2 cursor-pointer transition-all duration-200 ${
            activeTab === "directory"
              ? "text-[#F6CF38] border-[#F6CF38]"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          <Users size={16} />
          <span>Team Directory</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 pb-3.5 font-bold tracking-wide uppercase text-xs border-b-2 cursor-pointer transition-all duration-200 ${
            activeTab === "audit"
              ? "text-[#F6CF38] border-[#F6CF38]"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          <History size={16} />
          <span>Activity Log Feed</span>
        </button>
      </div>

      {/* Dynamic Component Mounting */}
      <div className="animate-in fade-in duration-200">
        {activeTab === "directory" ? (
          <TeammateList initialMembers={initialMembers} />
        ) : (
          <ActivityFeed />
        )}
      </div>

    </div>
  );
}
