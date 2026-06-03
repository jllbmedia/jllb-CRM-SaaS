import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/admin";
import { updateProjectActuals } from "@/utils/projectActuals";

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
    
    // Joint query to retrieve Project details and parent client company dynamically
    let query = supabase
      .from("tasks")
      .select("*, project:projects(name, client:clients(company))", { count: "exact" });


    const from = (page - 1) * limit;
    const to = page * limit - 1;
    
    const { data, count, error } = await query
      .order("project_id", { ascending: true })
      .order("task_date", { ascending: false })
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

    const { name, project_id, status, hours_spent, cost_per_hour, task_date } = await request.json();
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
        cost_per_hour: parseFloat(cost_per_hour) || 0,
        task_date: task_date || null,
        created_by: profile.id,
      })
      .select("*, project:projects(name)")
      .single();

    if (error) throw error;

    // Recalculate project actuals dynamically
    await updateProjectActuals(supabase, project_id);

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

    const { id, name, project_id, status, hours_spent, cost_per_hour, task_date } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the task's existing project ID for validation and potential project reallocation
    const { data: existingTask } = await supabase
      .from("tasks")
      .select("project_id, created_by")
      .eq("id", id)
      .single();

    // PM Ownership check
    if (profile.role !== "Admin") {
      if (existingTask?.created_by !== profile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (project_id !== undefined) updateFields.project_id = project_id;
    if (status !== undefined) updateFields.status = status;
    if (hours_spent !== undefined) updateFields.hours_spent = parseFloat(hours_spent) || 0;
    if (cost_per_hour !== undefined) updateFields.cost_per_hour = parseFloat(cost_per_hour) || 0;
    if (task_date !== undefined) updateFields.task_date = task_date || null;

    const { data, error } = await supabase
      .from("tasks")
      .update(updateFields)
      .eq("id", id)
      .select("*, project:projects(name)")
      .single();

    if (error) throw error;

    // Recalculate project actuals on target projects
    const oldProjectId = existingTask?.project_id;
    const newProjectId = project_id || oldProjectId;
    
    if (newProjectId) {
      await updateProjectActuals(supabase, newProjectId);
    }
    if (oldProjectId && oldProjectId !== newProjectId) {
      await updateProjectActuals(supabase, oldProjectId);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Tasks PATCH API error:", error);
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
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Retrieve target project ID before deletion for recalculation
    const { data: targetTask } = await supabase
      .from("tasks")
      .select("project_id, created_by")
      .eq("id", id)
      .single();
    
    // PM Ownership check
    if (profile.role !== "Admin") {
      if (targetTask?.created_by !== profile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Recalculate project actuals
    if (targetTask?.project_id) {
      await updateProjectActuals(supabase, targetTask.project_id);
    }

    return NextResponse.json({ success: true, message: "Task deleted successfully." });
  } catch (error: any) {
    console.error("Tasks DELETE API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

