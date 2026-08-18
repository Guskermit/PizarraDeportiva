"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/components/forms/ActionForm";

export async function createTeam(
  clubId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!name) return { error: "El nombre del equipo es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ club_id: clubId, name, category });

  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}

async function findProfileByEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function addCoachByEmail(
  teamId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Introduce un email." };

  const supabase = await createClient();
  const profile = await findProfileByEmail(supabase, email);

  if (!profile) {
    return {
      error:
        "No existe ninguna cuenta con ese email. Pide al entrenador que se registre primero en /signup.",
    };
  }

  const { error } = await supabase
    .from("team_coaches")
    .insert({ team_id: teamId, profile_id: profile.id });

  if (error) return { error: error.message };

  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

export async function addPlayerByEmail(
  teamId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jerseyNumberRaw = formData.get("jerseyNumber");
  const jerseyNumber = jerseyNumberRaw ? Number(jerseyNumberRaw) : null;
  if (!email) return { error: "Introduce un email." };

  const supabase = await createClient();
  const profile = await findProfileByEmail(supabase, email);

  if (!profile) {
    return {
      error:
        "No existe ninguna cuenta con ese email. Pide al jugador que se registre primero en /signup.",
    };
  }

  const { error } = await supabase
    .from("team_players")
    .insert({ team_id: teamId, profile_id: profile.id, jersey_number: jerseyNumber });

  if (error) return { error: error.message };

  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

export async function removeCoach(teamId: string, profileId: string) {
  const supabase = await createClient();
  await supabase
    .from("team_coaches")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  revalidatePath(`/teams/${teamId}`);
}

export async function removePlayer(teamId: string, profileId: string) {
  const supabase = await createClient();
  await supabase
    .from("team_players")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  revalidatePath(`/teams/${teamId}`);
}
