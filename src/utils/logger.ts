export async function logInteraction(supabase: any, actionType: string, details: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    let role = "PM";
    let email = "system@jllbmedia.com";
    
    if (user) {
      email = user.email || "system@jllbmedia.com";
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role) {
        role = profile.role;
      }
    }

    // Defensive payload mapping
    const payload = {
      user_id: user?.id || null,
      user_email: email,
      user_role: role,
      action_type: actionType,
      description: details,
      created_at: new Date().toISOString()
    };

    // Perform the insert defensively inside try/catch so RLS blocks or schema mismatches fail silently
    const { error } = await supabase.from("audit_logs").insert(payload);
    if (error) {
      console.warn("logInteraction warning (ignored):", error.message);
    }
  } catch (err: any) {
    console.warn("logInteraction failed gracefully (ignored):", err?.message || err);
  }
}
