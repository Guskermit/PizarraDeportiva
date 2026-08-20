import { TacticalEditorClient } from "@/components/board/TacticalEditorLoader";
import { ActionForm } from "@/components/forms/ActionForm";
import { ClientColorInput } from "@/components/forms/ClientColorInput";
import { ClientSelectField } from "@/components/forms/ClientSelectField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { updatePlayDetails } from "@/lib/actions/plays";
import { FORMATION_LABELS, PLAY_TYPE_LABELS } from "@/lib/futsal/formations";
import type { BoardMove, BoardPositions } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface EditNote {
  id: string;
  sequence_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface EditSequence {
  id: string;
  order_index: number;
  positions: BoardPositions;
  moves: BoardMove[];
  notes?: EditNote[];
}

export default async function EditPlayPage({
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

  const mappedSequences = ((sequences ?? []) as unknown as EditSequence[]).map((seq) => ({
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

  const playTypeOptions = Object.entries(PLAY_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="grid w-full gap-6">
      <ActionForm
        action={updatePlayDetails.bind(null, play.id)}
        onSuccessMessage="Cambios guardados."
      >
        <div className="grid w-full gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid gap-1">
              <h1 className="text-2xl font-semibold">{play.title}</h1>
              <p className="text-muted-foreground">
                {PLAY_TYPE_LABELS[play.play_type]} · Local: {FORMATION_LABELS[play.home_formation]} ·
                Visitante: {FORMATION_LABELS[play.away_formation]}
              </p>
            </div>
            <SubmitButton size="icon" title="Guardar cambios" aria-label="Guardar cambios">
              <Save />
            </SubmitButton>
          </div>

          <Card className="max-w-5xl">
            <CardHeader>
              <CardTitle>Detalles de la jugada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="title">Título de la jugada</Label>
                  <Input id="title" name="title" defaultValue={play.title} required />
                </div>
                <ClientSelectField
                  id="playType"
                  name="playType"
                  label="Tipo de jugada"
                  options={playTypeOptions}
                  defaultValue={play.play_type}
                />
                <ClientColorInput
                  id="homeColor"
                  name="homeColor"
                  label="Color equipo local"
                  defaultValue={play.home_color}
                />
                <ClientColorInput
                  id="awayColor"
                  name="awayColor"
                  label="Color equipo visitante"
                  defaultValue={play.away_color}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ActionForm>

      <TacticalEditorClient
        playId={play.id}
        initialPositions={play.initial_positions}
        savedSequences={mappedSequences}
        homeColor={play.home_color}
        awayColor={play.away_color}
        status={play.status}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
