import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TacticalEditorClient } from "@/components/board/TacticalEditorLoader";
import { updatePlayDetails } from "@/lib/actions/plays";
import { PLAY_TYPE_LABELS, FORMATION_LABELS } from "@/lib/futsal/formations";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ClientColorInput } from "@/components/forms/ClientColorInput";
import { ClientSelectField } from "@/components/forms/ClientSelectField";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    .select("id, order_index, positions, moves")
    .eq("play_id", playId)
    .order("order_index", { ascending: true });

  const playTypeOptions = Object.entries(PLAY_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
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

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Detalles de la jugada</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={updatePlayDetails.bind(null, play.id)}
            onSuccessMessage="Cambios guardados."
          >
            <div className="grid gap-4">
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
              <div>
                <SubmitButton>Guardar cambios</SubmitButton>
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <TacticalEditorClient
        playId={play.id}
        initialPositions={play.initial_positions}
        savedSequences={sequences ?? []}
        homeColor={play.home_color}
        awayColor={play.away_color}
        status={play.status}
      />
    </div>
  );
}

