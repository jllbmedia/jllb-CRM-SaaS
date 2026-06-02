import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/utils/supabase/server";
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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid parameters. User ID is required." },
        { status: 400 }
      );
    }

    // 3. Prevent self-deletion lockouts
    const supabaseUserClient = await createClient();
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    
    if (user && user.id === userId) {
      return NextResponse.json(
        { error: "Security restriction. You cannot delete your own admin account." },
        { status: 400 }
      );
    }

    // 4. Initialize Admin service-role client
    const supabaseAdmin = await createAdminClient();

    // 5. Delete user from auth (cascades to public.profiles schema table)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Successfully deleted teammate account." 
    });
  } catch (error: any) {
    console.error("Delete user API error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
