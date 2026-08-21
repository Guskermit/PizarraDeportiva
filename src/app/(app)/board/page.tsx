import { type BoardSituation, FreeBoard } from "@/components/board/FreeBoard";
import { getBoardColors } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function FreeBoardPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("board_situations")
    .select("id, name, positions")
    .order("created_at", { ascending: false });

  const situations = (data ?? []) as unknown as BoardSituation[];
  const colors = await getBoardColors();
  return <FreeBoard situations={situations} {...colors} />;
}
