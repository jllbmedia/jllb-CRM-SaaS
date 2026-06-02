import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    
    let query = supabase
      .from("clients")
      .select("*", { count: "exact" });

    // Scoped Data Isolation: PMs only read clients they created
    if (profile.role !== "Admin") {
      query = query.eq("created_by", profile.id);
    }

    const from = (page - 1) * limit;
    const to = page * limit - 1;
    
    const { data, count, error } = await query
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
    console.error("Clients GET API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, company, email } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name,
        company,
        email,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Clients POST API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, company, email } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // PM Ownership check
    if (profile.role !== "Admin") {
      const { data: ownership } = await supabase
        .from("clients")
        .select("created_by")
        .eq("id", id)
        .single();
      if (ownership?.created_by !== profile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("clients")
      .update({ name, company, email })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Clients PATCH API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
