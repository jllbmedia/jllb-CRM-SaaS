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

    const { name, company, email, phone, website_url, primary_contact_name, notes } = await request.json();
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
        phone,
        website_url,
        primary_contact_name,
        notes,
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

    const { id, name, company, email, phone, website_url, primary_contact_name, notes } = await request.json();
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

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (company !== undefined) updateFields.company = company;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (website_url !== undefined) updateFields.website_url = website_url;
    if (primary_contact_name !== undefined) updateFields.primary_contact_name = primary_contact_name;
    if (notes !== undefined) updateFields.notes = notes;

    const { data, error } = await supabase
      .from("clients")
      .update(updateFields)
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

export async function DELETE(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
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

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Client deleted successfully." });
  } catch (error: any) {
    console.error("Clients DELETE API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
