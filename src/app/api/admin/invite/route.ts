import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { isAdmin } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  try {
    // 1. Verify caller has Admin privileges
    const authorized = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    // 2. Parse and validate parameters
    const { email, role } = await request.json();

    if (!email || !role || (role !== "Admin" && role !== "PM")) {
      return NextResponse.json(
        { error: "Invalid parameters. Email and valid role (Admin/PM) are required." },
        { status: 400 }
      );
    }

    // 3. Initialize Admin service-role client
    const supabase = await createAdminClient();
    const redirectToUrl = `${new URL(request.url).origin}/auth/callback`;

    // 4. Invite user via Supabase Auth Admin API with pre-assigned metadata role
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email.trim(),
      {
        data: { role },
        redirectTo: redirectToUrl,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully sent invitation to ${email} as ${role}.`,
      data 
    });
  } catch (error: any) {
    console.error("Invite teammate API error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
