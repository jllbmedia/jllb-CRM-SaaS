import { createAdminClient, createClient } from "./server";

export async function syncUserProfile(userId: string, email: string, metadataRole?: string) {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@jllbmedia.com";

  // Attempt to use service-role client for secure profile writes (RLS bypass)
  // Fall back to standard server client if service-role key is unconfigured
  let supabase;
  const hasAdminKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY && 
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-private-key";

  if (hasAdminKey) {
    supabase = await createAdminClient();
  } else {
    supabase = await createClient();
  }

  // If role is not explicitly passed, attempt to extract it from user's auth metadata
  let assignedRole = metadataRole;
  if (!assignedRole && hasAdminKey) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.user_metadata?.role) {
        assignedRole = authUser.user.user_metadata.role;
      }
    } catch (e) {
      console.warn("Could not query auth metadata for role extraction:", e);
    }
  }

  // Precedence: Admin email env variable > Pre-assigned metadata role > Default PM role
  const role = email.toLowerCase() === adminEmail.toLowerCase() 
    ? "Admin" 
    : (assignedRole === "Admin" ? "Admin" : "PM");

  // Derive a friendly display name from the email prefix if not already present
  const defaultName = email.split("@")[0]
    .split(".")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { 
        id: userId, 
        email, 
        role,
        full_name: defaultName // Sets initial default name from email
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error syncing user profile in database:", error);
    return null;
  }

  return data;
}
