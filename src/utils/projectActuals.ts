import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calculates total hours and cost from tasks table and updates the parent project record.
 * This serves as a server-side programmatic fallback in case database triggers are not present.
 */
export async function updateProjectActuals(supabase: SupabaseClient, projectId: string) {
  if (!projectId) return;
  try {
    // 1. Fetch all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("hours_spent, cost_per_hour")
      .eq("project_id", projectId);

    if (tasksError) throw tasksError;

    // 2. Compute aggregate values
    const actualHours = (tasks || []).reduce((sum, t) => sum + (Number(t.hours_spent) || 0), 0);
    const actualCost = (tasks || []).reduce((sum, t) => sum + ((Number(t.hours_spent) || 0) * (Number(t.cost_per_hour) || 0)), 0);

    // 3. Update the projects table
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        actual_hours: actualHours,
        actual_cost: actualCost
      })
      .eq("id", projectId);

    if (updateError) throw updateError;
    console.log(`Programmatic fallback sync: Updated Project ${projectId} with actual_hours=${actualHours}, actual_cost=${actualCost}`);
  } catch (error) {
    console.error(`Failed to update project actuals for project ${projectId}:`, error);
  }
}
