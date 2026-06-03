import { redirect } from "next/navigation";
import { isAdmin } from "@/utils/supabase/admin";
import AuditLogsLedger from "./AuditLogsLedger";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  // 1. Server-side role protection guard
  const authorized = await isAdmin();
  if (!authorized) {
    redirect("/");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Security Auditing Space
        </h1>
        <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
          Chronological, read-only ledger of all database mutations, teammate access events, and system session operations.
        </p>
      </div>

      {/* Read-Only Ledger Grid Container */}
      <AuditLogsLedger />
    </div>
  );
}
