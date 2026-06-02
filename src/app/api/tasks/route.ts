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
    
    // Joint query to retrieve Project details dynamically
    let query = supabase
      .from("tasks")
      .select("*, project:projects(name)", { count: "exact" });

    // Scoped Data Isolation: PMs only read tasks they created
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
    console.error("Tasks GET API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, project_id, status, hours_spent } = await request.json();
    if (!name || !project_id) {
      return NextResponse.json({ error: "Task name and Project ID are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        name,
        project_id,
        status: status || "To Do",
        hours_spent: parseFloat(hours_spent) || 0,
        created_by: profile.id,
      })
      .select("*, project:projects(name)")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Tasks POST API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, project_id, status, hours_spent } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // PM Ownership check
    if (profile.role !== "Admin") {
      const { data: ownership } = await supabase
        .from("tasks")
        .select("created_by")
        .eq("id", id)
        .single();
      if (ownership?.created_by !== profile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (project_id !== undefined) updateFields.project_id = project_id;
    if (status !== undefined) updateFields.status = status;
    if (hours_spent !== undefined) updateFields.hours_spent = parseFloat(hours_spent) || 0;

    const { data, error } = await supabase
      .from("tasks")
      .update(updateFields)
      .eq("id", id)
      .select("*, project:projects(name)")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Tasks PATCH API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
