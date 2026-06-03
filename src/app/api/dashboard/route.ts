import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. Fetch projects with client names and budgeting metrics (global collab for all roles)
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, status, budget, estimated_hours, estimated_cost, actual_hours, actual_cost, created_at, client:clients(id, name, company)");
    if (projectsError) throw projectsError;

    // 2. Fetch tasks with detailed logs and rates (global collab for all roles)
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, name, hours_spent, cost_per_hour, created_at, project_id");
    if (tasksError) throw tasksError;

    // 3. Compute Aggregates
    const totalRevenue = (projects || []).reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalHours = (tasks || []).reduce((sum, t) => sum + (Number(t.hours_spent) || 0), 0);
    
    const activeProjectsCount = (projects || []).filter(
      (p) => p.status === "Planning" || p.status === "Active" || p.status === "On Hold"
    ).length;
    
    const completedProjectsCount = (projects || []).filter(
      (p) => p.status === "Completed"
    ).length;

    // 4. Chart 1: Top Client Contributions to Revenue
    const clientMap: { [name: string]: number } = {};
    (projects || []).forEach((proj) => {
      let clientName = "Unassigned Client";
      if (proj.client) {
        if (Array.isArray(proj.client)) {
          if (proj.client.length > 0) {
            clientName = (proj.client[0] as any).name || "Unassigned Client";
          }
        } else {
          clientName = (proj.client as any).name || "Unassigned Client";
        }
      }
      const budget = Number(proj.budget) || 0;
      clientMap[clientName] = (clientMap[clientName] || 0) + budget;
    });

    const topClients = Object.entries(clientMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 5. Chart 2: Project Status Distribution (Pending, Ongoing, Finished)
    let pendingCount = 0;
    let ongoingCount = 0;
    let finishedCount = 0;

    (projects || []).forEach((proj) => {
      if (proj.status === "Planning" || proj.status === "Pending") {
        pendingCount++;
      } else if (proj.status === "Active" || proj.status === "Ongoing" || proj.status === "On Hold") {
        ongoingCount++;
      } else if (proj.status === "Completed") {
        finishedCount++;
      }
    });

    const statusDistribution = [
      { name: "Pending", value: pendingCount },
      { name: "Ongoing", value: ongoingCount },
      { name: "Finished", value: finishedCount },
    ];

    return NextResponse.json({
      metrics: {
        revenue: totalRevenue,
        hours: totalHours,
        activeProjects: activeProjectsCount,
        completedProjects: completedProjectsCount,
      },
      charts: {
        topClients,
        statusDistribution,
      },
      projects: projects || [],
      tasks: tasks || []
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
