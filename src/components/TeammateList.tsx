"use client";

import { useState } from "react";
import { 
  UserPlus, 
  Trash2, 
  Search, 
  Mail, 
  User, 
  Calendar, 
  ShieldAlert, 
  Loader2, 
  X,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: "Admin" | "PM";
  created_at: string;
}

export default function TeammateList({ initialMembers, currentUserId }: { initialMembers: Member[], currentUserId?: string }) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchTerm, setSearchTerm] = useState("");

  // Invite states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "PM">("PM");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Delete states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter members based on search
  const filteredMembers = members.filter(member => 
    (member.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to invite teammate.");

      setInviteSuccess(result.message);
      setInviteEmail("");
      
      // Update local client list with a pending member placeholder
      const newMember: Member = {
        id: Math.random().toString(),
        email: inviteEmail.trim(),
        full_name: "Invitation Pending",
        role: inviteRole,
        created_at: new Date().toISOString()
      };
      setMembers([newMember, ...members]);

      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember) return;

    if (confirmEmail.trim().toLowerCase() !== targetMember.email.toLowerCase()) {
      setDeleteError("Confirmation email does not match.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetMember.id }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete teammate.");

      setMembers(members.filter(m => m.id !== targetMember.id));
      setIsDeleteOpen(false);
      setTargetMember(null);
      setConfirmEmail("");
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Bar (Search & Invite) */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search team members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-[#161617] border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
          />
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center gap-2 w-full sm:w-auto justify-center px-4 py-2.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_4px_12px_rgba(246,207,56,0.15)] active:scale-95 cursor-pointer"
        >
          <UserPlus size={16} />
          <span>Invite Teammate</span>
        </button>
      </div>

      {/* Members Registry */}
      {filteredMembers.length === 0 ? (
        <div className="bg-[#161617] border border-[#2D2D30] rounded-xl p-12 text-center shadow-lg space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
            <User size={24} />
          </div>
          <h3 className="text-lg font-bold text-white">No Team Members Found</h3>
          <p className="text-zinc-400 max-w-sm mx-auto text-sm">
            Try adjusting your search criteria or invite a new teammate to expand the team.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto bg-[#161617] border border-[#2D2D30] rounded-xl shadow-xl">
            <table className="min-w-full divide-y divide-[#2D2D30] text-left">
              <thead className="bg-zinc-900/60">
                <tr>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Teammate</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Join Date</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2D30]/40">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F6CF38]/10 text-[#F6CF38] flex items-center justify-center font-bold text-sm">
                          {member.full_name ? member.full_name.charAt(0) : "?"}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {member.full_name || "Unknown Name"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-zinc-300">
                      {member.email}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-sm text-zinc-400">
                      {new Date(member.created_at).toLocaleDateString(undefined, { 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric" 
                      })}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wider uppercase ${
                        member.role === "Admin" 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : "bg-[#F6CF38]/10 text-[#F6CF38] border border-[#F6CF38]/20"
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => {
                          setTargetMember(member);
                          setIsDeleteOpen(true);
                        }}
                        disabled={member.id === currentUserId}
                        className="p-2 bg-zinc-900 border border-[#2D2D30] hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-400 text-zinc-400 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#2D2D30] disabled:hover:bg-zinc-900 disabled:hover:text-zinc-400"
                        title={member.id === currentUserId ? "You cannot delete yourself" : "Delete Teammate"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid/Card View */}
          <div className="md:hidden space-y-4">
            {filteredMembers.map((member) => (
              <div 
                key={member.id} 
                className="bg-[#161617] border border-[#2D2D30] rounded-xl p-5 shadow-lg space-y-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F6CF38]/10 text-[#F6CF38] flex items-center justify-center font-bold text-sm">
                      {member.full_name ? member.full_name.charAt(0) : "?"}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {member.full_name || "Unknown Name"}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                        member.role === "Admin" 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : "bg-[#F6CF38]/10 text-[#F6CF38] border border-[#F6CF38]/20"
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTargetMember(member);
                      setIsDeleteOpen(true);
                    }}
                    disabled={member.id === currentUserId}
                    className="p-2.5 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-red-400 hover:border-red-500/30 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:border-[#2D2D30]"
                    title={member.id === currentUserId ? "You cannot delete yourself" : "Delete Teammate"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="pt-3 border-t border-[#2D2D30]/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Email</span>
                    <span className="text-zinc-300 font-medium break-all">{member.email}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Join Date</span>
                    <span className="text-zinc-300 font-medium">
                      {new Date(member.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Invite Teammate Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161617] border border-[#2D2D30] rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-4 right-4 p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F6CF38]/10 text-[#F6CF38] rounded-xl border border-[#F6CF38]/20">
                <UserPlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Invite Teammate
              </h3>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              
              {inviteError && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-in fade-in duration-200">
                  <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              {inviteSuccess && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm animate-in fade-in duration-200">
                  <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="invite-email" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Colleague Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail size={16} />
                  </div>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    disabled={isInviting}
                    className="block w-full pl-10 pr-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F6CF38] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Workspace Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  disabled={isInviting}
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white text-sm focus:outline-none focus:border-[#F6CF38] transition-colors cursor-pointer"
                >
                  <option value="PM">Project Manager (PM) - General Access</option>
                  <option value="Admin">Administrator (Admin) - Management Bypass</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isInviting}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#F6CF38] hover:bg-[#e2bd2f] text-zinc-950 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isInviting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Inviting...</span>
                  </>
                ) : (
                  <>
                    <span>Send Secure Invitation</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Teammate Safety Confirmation Modal */}
      {isDeleteOpen && targetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161617] border border-red-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => {
                setIsDeleteOpen(false);
                setConfirmEmail("");
                setDeleteError(null);
              }}
              className="absolute top-4 right-4 p-2 bg-zinc-900 border border-[#2D2D30] text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Absolute Safety Deletion
              </h3>
            </div>

            <div className="space-y-3 bg-red-500/5 border border-red-500/15 rounded-xl p-4 text-xs leading-relaxed text-zinc-400">
              <p className="text-red-400 font-bold uppercase tracking-wider text-[10px]">Critical Security Warning</p>
              <p>
                You are about to permanently delete <strong className="text-white">{targetMember.full_name || targetMember.email}</strong>. 
                This action is irreversible. All associated database records, project logs, and access credentials will be aborted.
              </p>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              
              {deleteError && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-in fade-in duration-200">
                  <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Type teammate email to confirm
                </p>
                <p className="text-xs text-[#F6CF38] font-semibold break-all select-none">
                  {targetMember.email}
                </p>
                <input
                  type="text"
                  required
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Verify colleague email..."
                  disabled={isDeleting}
                  className="block w-full px-4 py-3 bg-zinc-900 border border-[#2D2D30] rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setConfirmEmail("");
                    setDeleteError(null);
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-[#2D2D30] text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || confirmEmail.trim().toLowerCase() !== targetMember.email.toLowerCase()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
