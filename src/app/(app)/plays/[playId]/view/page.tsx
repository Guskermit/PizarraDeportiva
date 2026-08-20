import { PlayViewerClient } from "@/components/board/PlayViewerLoader";
import { FORMATION_LABELS, PLAY_TYPE_LABELS } from "@/lib/futsal/formations";
import type { BoardMove, BoardPositions } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface ViewNote {
  id: string;
  sequence_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface ViewSequence {
  id: string;
  order_index: number;
  positions: BoardPositions;
  moves: BoardMove[];
  notes?: ViewNote[];
}

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
    .select(
      "id, order_index, positions, moves, notes:play_sequence_notes(id, sequence_id, author_id, content, created_at, profiles:author_id(full_name))",
    )
    .eq("play_id", playId)
    .order("order_index", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mappedSequences = ((sequences ?? []) as unknown as ViewSequence[]).map((seq) => ({
    ...seq,
    notes: (seq.notes ?? []).map((note) => ({
      id: note.id,
      sequence_id: note.sequence_id,
      author_id: note.author_id,
      content: note.content,
      created_at: note.created_at,
      author_name: note.profiles?.full_name ?? undefined,
    })),
  }));

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
        playId={play.id}
        initialPositions={play.initial_positions}
        sequences={mappedSequences}
        homeColor={play.home_color}
        awayColor={play.away_color}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
