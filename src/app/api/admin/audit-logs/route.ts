import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  try {
    // 1. Verify caller has Admin privileges
    const authorized = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const supabase = await createClient();

    // 2. Fetch chronological logs from the database
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    const { data, count, error } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: data || [],
      page,
      limit,
      totalPages,
      totalCount: count || 0,
    });
  } catch (error: any) {
    console.error("Admin Audit logs GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
