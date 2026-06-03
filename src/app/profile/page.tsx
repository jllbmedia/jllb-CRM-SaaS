"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Save,
  Calendar
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "Admin" | "PM";
  phone: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated session found.");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data as UserProfile);
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load profile details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Perform direct client-side write mapping (secured by RLS policies that block altering the 'role' column)
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim()
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Update local profile state
      setProfile({
        ...profile,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim()
      });

      setSuccessMsg("Personal information successfully saved.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Database update failed. Check connection or schema integrity.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          My Account Profile
        </h1>
        <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
          Manage your personal workspace details, phone numbers, and view your permissions classification.
        </p>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm animate-in fade-in duration-200">
          <CheckCircle size={18} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Sync Completed</p>
            <p className="mt-0.5 text-xs opacity-90">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm animate-in fade-in duration-200">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Transaction Alert</p>
            <p className="mt-0.5 text-xs opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-2xl flex items-center justify-center shadow-xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#F6CF38]" size={28} />
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Syncing account profile...</span>
          </div>
        </div>
      ) : !profile ? (
        <div className="h-64 bg-[#161617] border border-[#2D2D30] rounded-2xl flex items-center justify-center p-6 text-center shadow-xl">
          <div className="max-w-xs space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <User size={20} />
            </div>
            <p className="font-bold text-white text-sm">Profile Load Failed</p>
            <p className="text-xs text-zinc-500">
              We could not find an associated teammate record for your session.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Read-Only Stats/Meta Sidebar Card */}
          <div className="md:col-span-1 bg-[#161617] border border-[#2D2D30] rounded-2xl p-5 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                <div className="w-16 h-16 rounded-2xl bg-[#F6CF38]/10 text-[#F6CF38] border border-[#F6CF38]/20 flex items-center justify-center font-black text-2xl shadow-[0_4px_16px_rgba(246,207,56,0.05)]">
                  {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-wide text-base">{fullName || "CRM Colleague"}</h3>
                  <span className="text-zinc-500 text-xs font-medium break-all">{profile.email}</span>
                </div>
              </div>

              {/* System Privilege Level - Read Only Badge */}
              <div className="space-y-1.5 pt-3 border-t border-[#2D2D30]/60">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Privilege Level</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                  profile.role === "Admin"
                    ? "bg-red-500/10 text-red-400 border-red-500/25"
                    : "bg-[#F6CF38]/10 text-[#F6CF38] border-[#F6CF38]/25"
                }`}>
                  <ShieldCheck size={14} className="stroke-[2.5]" />
                  {profile.role}
                </span>
                <p className="text-[10px] text-zinc-500 leading-normal pt-1.5">
                  {profile.role === "Admin" 
                    ? "Super-user status enabled. Workspace deletion bypass access authorized."
                    : "Project Manager authorization. Scoped data isolation rules active."
                  }
                </p>
              </div>
            </div>

            <div className="space-y-1 pt-3 border-t border-[#2D2D30]/60 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5 font-semibold">
                <Calendar size={12} />
                <span>Joined Workspace</span>
              </span>
              <span className="text-zinc-400 pl-4.5">
                {new Date(profile.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>
            </div>

          </div>

          {/* Edit Form Card */}
          <div className="md:col-span-2 bg-[#161617] border border-[#2D2D30] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-[#2D2D30]/60 pb-3 flex items-center gap-2 text-white">
              <User size={18} className="text-[#F6CF38]" />
              <h3 className="text-base font-bold tracking-wide">Personal Details Form</h3>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Full Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Johnathan Doe"
                    disabled={isSaving}
                    className="block w-full pl-10 pr-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                  />
                </div>
              </div>

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@company.com"
                    disabled={isSaving}
                    className="block w-full pl-10 pr-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                  />
                </div>
              </div>

              {/* Phone/Contact Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Phone / Contact Details</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Phone size={16} />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    disabled={isSaving}
                    className="block w-full pl-10 pr-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                  />
                </div>
              </div>

              {/* Read-Only Role Field Placeholder (Explicitly protected from input) */}
              <div className="space-y-1.5 bg-zinc-900/40 p-4 rounded-xl border border-[#2D2D30]/40 text-xs leading-relaxed text-zinc-500">
                <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">Assigned Workspace Role (Protected)</span>
                <p>
                  You are currently authenticated as a <strong className="text-white font-semibold">{profile.role}</strong> user. 
                  Role classifications are immutable and managed exclusively by workspace administrators to maintain security boundaries.
                </p>
              </div>

              {/* Submit Trigger Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_4px_12px_rgba(246,207,56,0.1)]"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Profile Details</span>
                  </>
                )}
              </button>

            </form>
          </div>

        </div>
      )}

    </div>
  );
}
