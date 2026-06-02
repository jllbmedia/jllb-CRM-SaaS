import { createClient } from "./server";

export async function getCurrentProfile() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return null;

    return profile;
  } catch (error) {
    console.error("Error retrieving current user profile:", error);
    return null;
  }
}

export async function isAdmin() {
  const profile = await getCurrentProfile();
  return profile?.role === "Admin";
}
