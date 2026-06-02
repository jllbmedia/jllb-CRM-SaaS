import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { syncUserProfile } from "@/utils/supabase/profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Sync profile to database with secure immutable roles check
      const profile = await syncUserProfile(data.user.id, data.user.email!);

      // Server-Side OAuth LOGIN Application Log hook
      try {
        const adminSupabase = await createAdminClient();
        await adminSupabase.from("audit_logs").insert({
          user_id: data.user.id,
          user_email: data.user.email!,
          user_role: profile?.role || "PM",
          action_type: "LOGIN",
          description: "Teammate successfully authenticated via Social OAuth magic link."
        });
      } catch (e) {
        console.warn("Could not log oauth authentication success:", e);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
