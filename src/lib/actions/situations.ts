"use server";

import type { ActionState } from "@/components/forms/ActionForm";
import type { BoardPositions } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBoardSituation(
  positions: BoardPositions,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Escribe un nombre para la situación." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("board_situations").insert({
    owner_id: user.id,
    name,
    positions,
  });
  if (error) return { error: error.message };

  revalidatePath("/situations");
  return { success: true };
}

export async function deleteBoardSituation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("board_situations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/situations");
  return { success: true };
}
