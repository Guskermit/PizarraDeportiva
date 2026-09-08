"use server";

import type { ActionState } from "@/components/forms/ActionForm";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/* ── Helpers ────────────────────────────────────────────────────────── */

async function requireOwnerGestor(clubId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", supabase: null, user: null };

  const { data } = await supabase
    .from("club_admins")
    .select("role")
    .eq("club_id", clubId)
    .eq("profile_id", user.id)
    .single();

  if (!data || (data.role !== "owner" && data.role !== "gestor")) {
    return { error: "No tienes permiso para gestionar catálogos.", supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

/* ── Catalog CRUD ───────────────────────────────────────────────────── */

export async function createCatalog(
  clubId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { error: "El nombre es obligatorio." };

  const { error, supabase, user } = await requireOwnerGestor(clubId);
  if (error || !supabase || !user) return { error: error! };

  const { error: insertError } = await supabase.from("play_catalogs").insert({
    club_id: clubId,
    name,
    description,
    created_by: user.id,
  });
  if (insertError) return { error: insertError.message };

  revalidatePath("/catalogs");
  return { success: true };
}

export async function updateCatalog(
  catalogId: string,
  clubId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { error: "El nombre es obligatorio." };

  const { error, supabase } = await requireOwnerGestor(clubId);
  if (error || !supabase) return { error: error! };

  const { error: updateError } = await supabase
    .from("play_catalogs")
    .update({ name, description })
    .eq("id", catalogId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/catalogs");
  revalidatePath(`/catalogs/${catalogId}`);
  return { success: true };
}

export async function deleteCatalog(catalogId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  // Verify ownership via the catalog's club.
  const { data: catalog } = await supabase
    .from("play_catalogs")
    .select("id, club_id")
    .eq("id", catalogId)
    .single();
  if (!catalog) return { error: "Catálogo no encontrado." };

  const { data: admin } = await supabase
    .from("club_admins")
    .select("role")
    .eq("club_id", catalog.club_id)
    .eq("profile_id", user.id)
    .single();
  if (!admin || (admin.role !== "owner" && admin.role !== "gestor")) {
    return { error: "No tienes permiso para eliminar este catálogo." };
  }

  const { error } = await supabase.from("play_catalogs").delete().eq("id", catalogId);
  if (error) return { error: error.message };

  revalidatePath("/catalogs");
  return { success: true };
}

/* ── Add / Remove plays from catalog ────────────────────────────────── */

export async function addPlayToCatalog(catalogId: string, playId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase
    .from("play_catalog_plays")
    .insert({ catalog_id: catalogId, play_id: playId });
  if (error) return { error: error.message };

  revalidatePath("/catalogs");
  return { success: true };
}

export async function removePlayFromCatalog(catalogId: string, playId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase
    .from("play_catalog_plays")
    .delete()
    .eq("catalog_id", catalogId)
    .eq("play_id", playId);
  if (error) return { error: error.message };

  revalidatePath("/catalogs");
  return { success: true };
}

/* ── Assign / Unassign catalog to team ──────────────────────────────── */

export async function assignCatalogToTeam(teamId: string, catalogId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("team_catalogs").upsert({
    team_id: teamId,
    catalog_id: catalogId,
    assigned_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}

export async function unassignCatalogFromTeam(teamId: string, catalogId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase
    .from("team_catalogs")
    .delete()
    .eq("team_id", teamId)
    .eq("catalog_id", catalogId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}
