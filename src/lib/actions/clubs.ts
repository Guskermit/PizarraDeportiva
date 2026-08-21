"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/components/forms/ActionForm";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function registerClub(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clubName = String(formData.get("clubName") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#1d4ed8");
  const secondaryColor = String(formData.get("secondaryColor") ?? "#f97316");
  const adminName = String(formData.get("adminName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const logo = formData.get("logo") as File | null;

  if (!clubName || !adminName || !email || !password) {
    return { error: "Todos los campos obligatorios deben rellenarse." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: adminName } },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return {
      error:
        "Revisa tu correo para confirmar la cuenta antes de continuar con el alta del club.",
    };
  }

  let logoUrl: string | null = null;
  // Uses the service-role client: the caller may not have an active session yet if
  // Supabase's "confirm email" setting is enabled, which would fail these under RLS.
  const admin = createAdminClient();

  if (logo && logo.size > 0) {
    const extension = logo.name.split(".").pop() ?? "png";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("club-logos")
      .upload(path, logo, { contentType: logo.type, upsert: true });

    if (!uploadError) {
      const { data: publicUrl } = admin.storage.from("club-logos").getPublicUrl(path);
      logoUrl = publicUrl.publicUrl;
    }
  }

  const slug = `${slugify(clubName)}-${Math.random().toString(36).slice(2, 7)}`;

  const { error: clubError } = await admin.from("clubs").insert({
    name: clubName,
    slug,
    logo_url: logoUrl,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    created_by: userId,
  });

  if (clubError) {
    return { error: clubError.message };
  }

  // No active session yet means Supabase's "confirm email" setting is on: the account and
  // club were created, but the user must confirm their email before they can log in.
  if (!signUpData.session) {
    return { success: true };
  }

  redirect("/dashboard");
}

export async function updateClub(
  clubId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#1d4ed8");
  const secondaryColor = String(formData.get("secondaryColor") ?? "#f97316");
  const logo = formData.get("logo") as File | null;

  if (!name) return { error: "El nombre del club es obligatorio." };

  const supabase = await createClient();

  const update: {
    name: string;
    primary_color: string;
    secondary_color: string;
    logo_url?: string;
  } = {
    name,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
  };

  if (logo && logo.size > 0) {
    const extension = logo.name.split(".").pop() ?? "png";
    const path = `${clubId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("club-logos")
      .upload(path, logo, { contentType: logo.type, upsert: true });

    if (uploadError) return { error: uploadError.message };

    const { data: publicUrl } = supabase.storage.from("club-logos").getPublicUrl(path);
    update.logo_url = publicUrl.publicUrl;
  }

  // RLS ("club admins can update their club") restricts this to owner/admin members of clubId.
  const { error } = await supabase.from("clubs").update(update).eq("id", clubId);
  if (error) return { error: error.message };

  revalidatePath("/club");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { success: true };
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireOwner(
  supabase: SupabaseClient,
  clubId: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: admin } = await supabase
    .from("club_admins")
    .select("role")
    .eq("club_id", clubId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!admin || admin.role !== "owner") {
    return { error: "Solo el propietario del club puede gestionar entrenadores." };
  }
  return {};
}

export async function addClubCoach(
  clubId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email || !name) return { error: "Email y nombre son obligatorios." };

  const supabase = await createClient();
  const ownerCheck = await requireOwner(supabase, clubId);
  if (ownerCheck.error) return { error: ownerCheck.error };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", email)
    .maybeSingle();

  let profileId: string;
  if (profile) {
    profileId = profile.id;
  } else {
    // Create the account automatically via the service-role client.
    const admin = createAdminClient();
    const tempPassword = crypto.randomUUID();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createError) return { error: createError.message };
    profileId = created.user.id;

    // Send a recovery email so the coach can set their own password.
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email);
    if (recoveryError) {
      return {
        error:
          "Cuenta creada, pero no se pudo enviar el email de recuperación. El entrenador puede usar '¿Olvidaste tu contraseña?' en el login.",
      };
    }
  }

  const { data: existing } = await supabase
    .from("club_admins")
    .select("profile_id")
    .eq("club_id", clubId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (existing) {
    return { error: "Ese usuario ya es entrenador del club." };
  }

  const { error } = await supabase
    .from("club_admins")
    .insert({ club_id: clubId, profile_id: profileId, role: "entrenador" });
  if (error) return { error: error.message };

  revalidatePath("/club");
  return { success: true };
}

export async function setClubCoachRole(
  clubId: string,
  profileId: string,
  role: "owner" | "gestor" | "entrenador",
): Promise<ActionState> {
  const supabase = await createClient();
  const ownerCheck = await requireOwner(supabase, clubId);
  if (ownerCheck.error) return { error: ownerCheck.error };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === profileId) return { error: "No puedes cambiar tu propio rol." };

  const { data: existingCoach, error: lookupError } = await supabase
    .from("club_admins")
    .select("profile_id, role")
    .eq("club_id", clubId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };

  if (existingCoach) {
    const { data: updatedCoach, error } = await supabase
      .from("club_admins")
      .update({ role })
      .eq("club_id", clubId)
      .eq("profile_id", profileId)
      .select("profile_id, role")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!updatedCoach || updatedCoach.role !== role) {
      return { error: "No se pudo guardar el rol del entrenador." };
    }
  } else {
    const { data: createdCoach, error } = await supabase
      .from("club_admins")
      .insert({ club_id: clubId, profile_id: profileId, role })
      .select("profile_id, role")
      .single();
    if (error) return { error: error.message };
    if (!createdCoach || createdCoach.role !== role) {
      return { error: "No se pudo guardar el rol del entrenador." };
    }
  }

  revalidatePath("/club");
  return { success: true };
}

export async function setClubCoachBlocked(
  clubId: string,
  profileId: string,
  blocked: boolean,
): Promise<void> {
  const supabase = await createClient();
  const ownerCheck = await requireOwner(supabase, clubId);
  if (ownerCheck.error) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === profileId) return;

  const { error } = await supabase
    .from("club_admins")
    .update({ is_blocked: blocked })
    .eq("club_id", clubId)
    .eq("profile_id", profileId);
  if (error) return;

  revalidatePath("/club");
}

export async function removeClubCoach(
  clubId: string,
  profileId: string,
): Promise<void> {
  const supabase = await createClient();
  const ownerCheck = await requireOwner(supabase, clubId);
  if (ownerCheck.error) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === profileId) return;

  const { error } = await supabase
    .from("club_admins")
    .delete()
    .eq("club_id", clubId)
    .eq("profile_id", profileId);
  if (error) return;

  revalidatePath("/club");
}

export async function setCoachTeams(
  clubId: string,
  profileId: string,
  teamIds: string[],
): Promise<ActionState> {
  const supabase = await createClient();
  const ownerCheck = await requireOwner(supabase, clubId);
  if (ownerCheck.error) return { error: ownerCheck.error };

  // Only allow assigning teams that belong to this club.
  const { data: clubTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("club_id", clubId);
  const validIds = new Set((clubTeams ?? []).map((t) => t.id));
  const next = teamIds.filter((id) => validIds.has(id));

  if (validIds.size > 0) {
    const { error: deleteError } = await supabase
      .from("team_coaches")
      .delete()
      .eq("profile_id", profileId)
      .in("team_id", [...validIds]);
    if (deleteError) return { error: deleteError.message };
  }

  if (next.length > 0) {
    const { error: insertError } = await supabase
      .from("team_coaches")
      .insert(next.map((teamId) => ({ team_id: teamId, profile_id: profileId })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/club");
  revalidatePath("/teams");
  return { success: true };
}
