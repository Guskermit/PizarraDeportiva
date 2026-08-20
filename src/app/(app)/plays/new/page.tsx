import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createPlay } from "@/lib/actions/plays";
import { PLAY_TYPE_LABELS, FORMATION_LABELS } from "@/lib/futsal/formations";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ClientColorInput } from "@/components/forms/ClientColorInput";
import { ClientSelectField } from "@/components/forms/ClientSelectField";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewPlayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: teamsRaw } = await supabase
    .from("team_coaches")
    .select("teams(id, name, clubs(primary_color, secondary_color))")
    .eq("profile_id", user!.id);
  const teams = teamsRaw as unknown as
    | {
        teams: {
          id: string;
          name: string;
          clubs: { primary_color: string; secondary_color: string } | null;
        };
      }[]
    | null;

  const teamOptions = (teams ?? []).map((t) => {
    const team = t.teams as unknown as { id: string; name: string };
    return { label: team.name, value: team.id };
  });

  const defaultHomeColor = teams?.[0]?.teams?.clubs?.primary_color ?? "#1d4ed8";
  const defaultAwayColor = teams?.[0]?.teams?.clubs?.secondary_color ?? "#dc2626";

  const playTypeOptions = Object.entries(PLAY_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  const formationOptions = Object.entries(FORMATION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="grid w-full max-w-lg gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Nueva jugada</h1>
        <p className="text-muted-foreground">
          Elige el tipo de jugada y la configuración de ambos equipos para empezar a diseñarla.
        </p>
      </div>

      {teamOptions.length === 0 ? (
        <Card>
          <CardContent>
            <p>
              No entrenas ningún equipo todavía. Pide a un administrador de tu club que te añada a
              un equipo antes de crear jugadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <ActionForm action={createPlay}>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="title">Título de la jugada</Label>
                  <Input id="title" name="title" required />
                </div>
                <ClientSelectField
                  id="teamId"
                  name="teamId"
                  label="Equipo"
                  options={teamOptions}
                />
                <ClientSelectField
                  id="playType"
                  name="playType"
                  label="Tipo de jugada"
                  options={playTypeOptions}
                />
                <ClientSelectField
                  id="homeFormation"
                  name="homeFormation"
                  label="Configuración equipo local"
                  options={formationOptions}
                />
                <ClientSelectField
                  id="awayFormation"
                  name="awayFormation"
                  label="Configuración equipo visitante"
                  options={formationOptions}
                />
                <ClientColorInput
                  id="homeColor"
                  name="homeColor"
                  label="Color equipo local"
                  defaultValue={defaultHomeColor}
                />
                <ClientColorInput
                  id="awayColor"
                  name="awayColor"
                  label="Color equipo visitante"
                  defaultValue={defaultAwayColor}
                />
                <SubmitButton className="w-full">
                  Crear jugada
                  <ArrowRight />
                </SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

