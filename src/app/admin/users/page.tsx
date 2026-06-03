import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAdmin, getCurrentProfile } from "@/utils/supabase/admin";
import AdminControlCenter from "@/components/AdminControlCenter";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // 1. Server-side role protection guard
  const authorized = await isAdmin();
  if (!authorized) {
    redirect("/");
  }

  const profile = await getCurrentProfile();

  // 2. Fetch all CRM team members for the directory mapping
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading team members from database:", error);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Admin Control Center
        </h1>
        <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
          Secure portal to manage database permissions, invite team members, and view the immutable security activity log feed.
        </p>
      </div>

      {/* Render the dual-tab directory and activity feeds log panels */}
      <AdminControlCenter initialMembers={members || []} currentUserId={profile?.id} />
    </div>
  );
}
