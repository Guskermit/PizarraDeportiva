"use server";

import type { ActionState } from "@/components/forms/ActionForm";
import { buildInitialPositions } from "@/lib/futsal/formations";
import type {
  BoardMove,
  BoardPositions,
  PlayType,
  TeamFormation,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPlay(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const playType = String(formData.get("playType") ?? "") as PlayType;
  const homeFormation = String(formData.get("homeFormation") ?? "") as TeamFormation;
  const awayFormation = String(formData.get("awayFormation") ?? "") as TeamFormation;
  const homeColor = String(formData.get("homeColor") ?? "#1d4ed8");
  const awayColor = String(formData.get("awayColor") ?? "#dc2626");
  const teamId = String(formData.get("teamId") ?? "");

  if (!title || !playType || !homeFormation || !awayFormation || !teamId) {
    return { error: "Rellena todos los campos para crear la jugada." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, club_id")
    .eq("id", teamId)
    .single();

  if (teamError || !team) return { error: "Equipo no encontrado." };

  const initialPositions = buildInitialPositions(homeFormation, awayFormation);
  // Generate the id client-side and insert it explicitly: chaining .select().single()
  // onto .insert() makes Postgres re-check the SELECT policy on the new row within the
  // same RETURNING statement, and can_view_play() (which re-queries plays itself) can
  // fail to see that just-inserted row in that same-statement snapshot, wrongly
  // reporting an RLS violation. A plain insert followed by a separate select avoids it.
  const playId = crypto.randomUUID();

  const { error } = await supabase.from("plays").insert({
    id: playId,
    club_id: team.club_id,
    owner_coach_id: user.id,
    assigned_team_id: team.id,
    title,
    play_type: playType,
    home_formation: homeFormation,
    away_formation: awayFormation,
    home_color: homeColor,
    away_color: awayColor,
    initial_positions: initialPositions,
  });

  if (error) return { error: error.message };

  redirect(`/plays/${playId}/edit`);
}

export async function saveInitialPositions(playId: string, positions: BoardPositions) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("plays")
    .update({ initial_positions: positions })
    .eq("id", playId);
  if (error) return { error: error.message };
  revalidatePath(`/plays/${playId}/edit`);
  return { success: true };
}

export async function updatePlayDetails(
  playId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const playType = String(formData.get("playType") ?? "") as PlayType;
  const homeColor = String(formData.get("homeColor") ?? "");
  const awayColor = String(formData.get("awayColor") ?? "");

  if (!title || !playType || !homeColor || !awayColor) {
    return { error: "Rellena todos los campos para guardar los cambios." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plays")
    .update({ title, play_type: playType, home_color: homeColor, away_color: awayColor })
    .eq("id", playId);
  if (error) return { error: error.message };

  revalidatePath(`/plays/${playId}/edit`);
  revalidatePath("/plays");
  return { success: true };
}

export async function saveSequence(
  playId: string,
  orderIndex: number,
  positions: BoardPositions,
  moves: BoardMove[],
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("play_sequences")
    .insert({ play_id: playId, order_index: orderIndex, positions, moves })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/plays/${playId}/edit`);
  return { success: true, sequenceId: data?.id };
}

export async function finalizePlay(playId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("plays").update({ status: "ready" }).eq("id", playId);
  if (error) return { error: error.message };
  redirect("/plays");
}

export async function reopenPlay(playId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("plays").update({ status: "draft" }).eq("id", playId);
  if (error) return { error: error.message };
  revalidatePath(`/plays/${playId}/edit`);
  return { success: true };
}

export async function deleteLastSequence(sequenceId: string, playId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("play_sequences").delete().eq("id", sequenceId);
  if (error) return { error: error.message };
  revalidatePath(`/plays/${playId}/edit`);
  return { success: true };
}

export async function addSequenceNote(
  sequenceId: string,
  playId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState & { noteId?: string }> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Escribe un comentario antes de publicarlo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data, error } = await supabase
    .from("play_sequence_notes")
    .insert({
      sequence_id: sequenceId,
      author_id: user.id,
      content,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/plays/${playId}/view`);
  revalidatePath(`/plays/${playId}/edit`);
  return { success: true, noteId: data?.id };
}

export async function deleteSequenceNote(noteId: string, playId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("play_sequence_notes").delete().eq("id", noteId);
  if (error) return { error: error.message };
  revalidatePath(`/plays/${playId}/view`);
  revalidatePath(`/plays/${playId}/edit`);
  return { success: true };
}

export async function sharePlay(
  playId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const targetType = String(formData.get("targetType") ?? "");
  const targetValue = String(formData.get("targetValue") ?? "").trim();
  const canCopy = formData.get("canCopy") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  if (targetType === "profile") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", targetValue.toLowerCase())
      .maybeSingle();
    if (!profile) return { error: "No existe ninguna cuenta con ese email." };

    const { error } = await supabase.from("play_shares").insert({
      play_id: playId,
      shared_by: user.id,
      shared_with_profile_id: profile.id,
      can_copy: canCopy,
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("play_shares").insert({
      play_id: playId,
      shared_by: user.id,
      shared_with_team_id: targetValue,
      can_copy: canCopy,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/plays");
  return { success: true };
}

export async function copyPlayToCatalog(playId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data: original, error: playError } = await supabase
    .from("plays")
    .select("*")
    .eq("id", playId)
    .single();
  if (playError || !original) return { error: "No se pudo acceder a la jugada." };

  const { data: sequences } = await supabase
    .from("play_sequences")
    .select("order_index, positions, moves")
    .eq("play_id", playId)
    .order("order_index", { ascending: true });

  const newPlayId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("plays").insert({
    id: newPlayId,
    club_id: original.club_id,
    owner_coach_id: user.id,
    assigned_team_id: null,
    original_play_id: original.id,
    title: `${original.title} (copia)`,
    play_type: original.play_type,
    home_formation: original.home_formation,
    away_formation: original.away_formation,
    home_color: original.home_color,
    away_color: original.away_color,
    initial_positions: original.initial_positions,
  });

  if (insertError) return { error: insertError.message };

  if (sequences && sequences.length > 0) {
    await supabase.from("play_sequences").insert(
      sequences.map((s) => ({
        play_id: newPlayId,
        order_index: s.order_index,
        positions: s.positions,
        moves: s.moves,
      })),
    );
  }

  revalidatePath("/plays");
  redirect(`/plays/${newPlayId}/edit`);
}
