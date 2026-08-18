import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlayViewerClient } from "@/components/board/PlayViewerLoader";
import { PLAY_TYPE_LABELS, FORMATION_LABELS } from "@/lib/futsal/formations";

export default async function ViewPlayPage({
  params,
}: {
  params: Promise<{ playId: string }>;
}) {
  const { playId } = await params;
  const supabase = await createClient();

  const { data: play } = await supabase.from("plays").select("*").eq("id", playId).single();
  if (!play) notFound();

  const { data: sequences } = await supabase
    .from("play_sequences")
    .select("id, order_index, positions, moves")
    .eq("play_id", playId)
    .order("order_index", { ascending: true });

  return (
    <div className="grid w-full gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">{play.title}</h1>
        <p className="text-muted-foreground">
          {PLAY_TYPE_LABELS[play.play_type]} · Local: {FORMATION_LABELS[play.home_formation]} ·
          Visitante: {FORMATION_LABELS[play.away_formation]}
        </p>
      </div>

      <PlayViewerClient
        initialPositions={play.initial_positions}
        sequences={sequences ?? []}
        homeColor={play.home_color}
        awayColor={play.away_color}
      />
    </div>
  );
}

