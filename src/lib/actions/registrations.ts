"use server";

import type { ActionState } from "@/components/forms/ActionForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// Comprueba que el jugador pueda unirse al equipo: no formar ya parte de él
// y no tener ninguna otra solicitud pendiente.
async function checkJoinEligibility(
  admin: SupabaseAdmin,
  profileId: string,
  teamId: string,
): Promise<string | null> {
  const { data: membership } = await admin
    .from("team_players")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (membership) return "Ya formas parte de este equipo.";

  const { data: pending } = await admin
    .from("player_registrations")
    .select("team_id")
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    return pending.team_id === teamId
      ? "Ya enviaste una solicitud para este equipo. Espera a que el entrenador la revise."
      : "Ya tienes una solicitud pendiente para otro equipo. Espera a que la revisen.";
  }

  return null;
}

async function teamExists(admin: SupabaseAdmin, teamId: string): Promise<boolean> {
  const { data } = await admin.from("teams").select("id").eq("id", teamId).maybeSingle();
  return !!data;
}

// Alta pública de jugador (/register-player): crea la cuenta ya confirmada
// (sin verificación de email) y deja la solicitud de unión al equipo en
// estado 'pending' para que la apruebe el entrenador.
export async function registerPlayer(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const teamId = String(formData.get("teamId") ?? "").trim();

  if (!fullName || !email || !password || !teamId) {
    return { error: "Todos los campos son obligatorios." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const admin = createAdminClient();
  if (!(await teamExists(admin, teamId))) {
    return { error: "El equipo seleccionado no existe." };
  }

  // Cuenta creada ya confirmada (email_confirm): no se pide verificación del email.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    const message = createError.message.toLowerCase();
    const isDuplicate =
      createError.code === "email_exists" ||
      message.includes("already been registered") ||
      message.includes("already registered");
    if (isDuplicate) return { error: "Ya existe una cuenta con ese email. Inicia sesión." };
    return { error: createError.message };
  }

  const userId = created.user?.id;
  if (!userId) {
    return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }

  const eligibilityError = await checkJoinEligibility(admin, userId, teamId);
  if (eligibilityError) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return { error: eligibilityError };
  }

  const { error: insertError } = await admin.from("player_registrations").insert({
    team_id: teamId,
    profile_id: userId,
    status: "pending",
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return { error: insertError.message };
  }

  // Entrada directa al panel: la cuenta ya está confirmada.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // Cuenta y solicitud creadas; solo queda iniciar sesión manualmente.
    return { success: true };
  }

  redirect("/dashboard");
}

// Solicitud de unión para usuarios ya registrados (/join-team).
export async function requestTeamEntry(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = String(formData.get("teamId") ?? "").trim();
  if (!teamId) return { error: "Selecciona un equipo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión para solicitar unirte a un equipo." };

  const admin = createAdminClient();
  if (!(await teamExists(admin, teamId))) {
    return { error: "El equipo seleccionado no existe." };
  }

  const eligibilityError = await checkJoinEligibility(admin, user.id, teamId);
  if (eligibilityError) return { error: eligibilityError };

  // RLS "insert own pending registration" limita el insert al propio usuario.
  const { error } = await supabase.from("player_registrations").insert({
    team_id: teamId,
    profile_id: user.id,
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/join-team");
  return { success: true };
}

type ReviewableRegistration = {
  id: string;
  team_id: string;
  profile_id: string;
  status: "pending" | "approved" | "rejected";
};

// Verifica que el usuario pueda gestionar la solicitud (entrenador del equipo o
// admin del club) y que siga pendiente.
async function loadRegistrationForReview(
  registrationId: string,
  userId: string,
): Promise<{ error?: string; registration?: ReviewableRegistration }> {
  const supabase = await createClient();

  const { data: registration } = await supabase
    .from("player_registrations")
    .select("id, team_id, profile_id, status")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration) return { error: "Solicitud no encontrada." };

  const { data: team } = await supabase
    .from("teams")
    .select("club_id")
    .eq("id", registration.team_id)
    .maybeSingle();
  if (!team) return { error: "No tienes permiso para gestionar esta solicitud." };

  const [{ data: coachRow }, { data: adminRow }] = await Promise.all([
    supabase
      .from("team_coaches")
      .select("team_id")
      .eq("team_id", registration.team_id)
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("club_admins")
      .select("role")
      .eq("club_id", team.club_id)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);
  if (!coachRow && !adminRow) {
    return {
      error:
        "Solo los entrenadores del equipo o los administradores del club pueden gestionar solicitudes.",
    };
  }

  if (registration.status !== "pending") {
    return { error: "Esta solicitud ya fue gestionada." };
  }

  return { registration };
}

// Añade al jugador a team_players y marca la solicitud como aprobada.
export async function approveRegistration(
  registrationId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const review = await loadRegistrationForReview(registrationId, user.id);
  if (review.error || !review.registration) {
    return { error: review.error ?? "Solicitud no encontrada." };
  }
  const { registration } = review;

  // Cliente service-role: el insert en team_players está restringido por RLS a
  // admins del club, no a entrenadores de equipo.
  const admin = createAdminClient();
  const { error: insertError } = await admin.from("team_players").insert({
    team_id: registration.team_id,
    profile_id: registration.profile_id,
  });
  // 23505 = duplicado (ya era jugador): se ignora para que el flujo termine bien.
  if (insertError && insertError.code !== "23505") {
    return { error: insertError.message };
  }

  const { error: updateError } = await admin
    .from("player_registrations")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", registrationId)
    .eq("status", "pending");
  if (updateError) return { error: updateError.message };

  revalidatePath(`/teams/${registration.team_id}`);
  revalidatePath("/club");
  revalidatePath("/dashboard");
  return { success: true };
}

// Marca la solicitud como rechazada.
export async function rejectRegistration(
  registrationId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const review = await loadRegistrationForReview(registrationId, user.id);
  if (review.error || !review.registration) {
    return { error: review.error ?? "Solicitud no encontrada." };
  }
  const { registration } = review;

  const { error } = await supabase
    .from("player_registrations")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", registrationId)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath(`/teams/${registration.team_id}`);
  revalidatePath("/club");
  revalidatePath("/dashboard");
  return { success: true };
}
