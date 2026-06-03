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
    
    // Joint query to retrieve Client names and details dynamically
    let query = supabase
      .from("projects")
      .select("*, client:clients(name, company)", { count: "exact" });


    const from = (page - 1) * limit;
    const to = page * limit - 1;
    
    const { data, count, error } = await query
      .order("start_date", { ascending: false })
      .order("name", { ascending: false })
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
    console.error("Projects GET API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, client_id, status, budget, estimated_hours, estimated_cost, start_date, end_date } = await request.json();
    if (!name || !client_id) {
      return NextResponse.json({ error: "Project name and Client ID are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        client_id,
        status: status || "Planning",
        budget: parseFloat(budget) || 0,
        estimated_hours: parseFloat(estimated_hours) || 0,
        estimated_cost: parseFloat(estimated_cost) || 0,
        actual_hours: 0,
        actual_cost: 0,
        start_date: start_date || null,
        end_date: end_date || null,
        created_by: profile.id,
      })
      .select("*, client:clients(name, company)")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Projects POST API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, client_id, status, budget, estimated_hours, estimated_cost, actual_hours, actual_cost, start_date, end_date } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // PM Ownership check
    if (profile.role !== "Admin") {
      const { data: ownership } = await supabase
        .from("projects")
        .select("created_by")
        .eq("id", id)
        .single();
      if (ownership?.created_by !== profile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (client_id !== undefined) updateFields.client_id = client_id;
    if (status !== undefined) updateFields.status = status;
    if (budget !== undefined) updateFields.budget = parseFloat(budget) || 0;
    if (estimated_hours !== undefined) updateFields.estimated_hours = parseFloat(estimated_hours) || 0;
    if (estimated_cost !== undefined) updateFields.estimated_cost = parseFloat(estimated_cost) || 0;
    if (actual_hours !== undefined) updateFields.actual_hours = parseFloat(actual_hours) || 0;
    if (actual_cost !== undefined) updateFields.actual_cost = parseFloat(actual_cost) || 0;
    if (start_date !== undefined) updateFields.start_date = start_date || null;
    if (end_date !== undefined) updateFields.end_date = end_date || null;

    const { data, error } = await supabase
      .from("projects")
      .update(updateFields)
      .eq("id", id)
      .select("*, client:clients(name, company)")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Projects PATCH API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // PM Ownership check
    if (profile.role !== "Admin") {
      const { data: ownership } = await supabase
        .from("projects")
        .select("created_by")
        .eq("id", id)
        .single();
      if (ownership?.created_by !== profile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Project deleted successfully." });
  } catch (error: any) {
    console.error("Projects DELETE API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
