import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { actionType, description } = await request.json();

    if (!actionType || (actionType !== "LOGIN" && actionType !== "LOGOUT")) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("id", user.id)
      .single();

    const email = profile?.email || user.email || "unknown@jllbmedia.com";
    const role = profile?.role || "PM";

    // Write application event securely to immutable audit logs using the service-role client
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase
      .from("audit_logs")
      .insert({
        user_id: user.id,
        user_email: email,
        user_role: role,
        action_type: actionType,
        description: description || `Authentication ${actionType.toLowerCase()} event completed.`
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Audit logging API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
