import { type BoardSituation, FreeBoard } from "@/components/board/FreeBoard";
import { getBoardColors, isStaff } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SituationsPage() {
  // Solo entrenadores y admins del club guardan/ven situaciones.
  if (!(await isStaff())) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("board_situations")
    .select("id, name, positions")
    .order("created_at", { ascending: false });

  const situations = (data ?? []) as unknown as BoardSituation[];
  const colors = await getBoardColors();
  return <FreeBoard situations={situations} {...colors} showSaveForm />;
}
