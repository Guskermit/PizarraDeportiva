import { createClient } from "@/lib/supabase/server";
import { addCoachByEmail, addPlayerByEmail, removeCoach, removePlayer } from "@/lib/actions/teams";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, category, club_id")
    .eq("id", teamId)
    .single();

  const [{ data: coachesRaw }, { data: playersRaw }] = await Promise.all([
    supabase
      .from("team_coaches")
      .select("profile_id, profiles(id, full_name, email)")
      .eq("team_id", teamId),
    supabase
      .from("team_players")
      .select("profile_id, jersey_number, profiles(id, full_name, email)")
      .eq("team_id", teamId),
  ]);

  const coaches = coachesRaw as unknown as
    | { profile_id: string; profiles: { id: string; full_name: string; email: string } }[]
    | null;
  const players = playersRaw as unknown as
    | {
        profile_id: string;
        jersey_number: number | null;
        profiles: { id: string; full_name: string; email: string };
      }[]
    | null;

  if (!team) {
    return <p>Equipo no encontrado.</p>;
  }

  return (
    <div className="grid w-full gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        {team.category && <p className="text-muted-foreground">{team.category}</p>}
      </div>

      <div className="flex flex-wrap gap-6">
        <Card className="min-w-80 flex-1">
          <CardHeader>
            <CardTitle>Entrenadores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              {coaches?.map((c) => {
                const profile = c.profiles;
                return (
                  <div key={c.profile_id} className="flex items-center justify-between gap-2">
                    <div className="grid">
                      <span className="font-medium">{profile.full_name}</span>
                      <span className="text-sm text-muted-foreground">{profile.email}</span>
                    </div>
                    <form action={removeCoach.bind(null, teamId, c.profile_id)}>
                      <SubmitButton variant="tertiary" size="sm">
                        Quitar
                      </SubmitButton>
                    </form>
                  </div>
                );
              })}
              {(!coaches || coaches.length === 0) && (
                <p className="text-muted-foreground">Sin entrenadores asignados.</p>
              )}
            </div>
            <ActionForm action={addCoachByEmail.bind(null, teamId)}>
              <div className="flex items-end gap-2">
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="coachEmail">Email del entrenador</Label>
                  <Input id="coachEmail" name="email" type="email" required />
                </div>
                <SubmitButton>Añadir</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card className="min-w-80 flex-1">
          <CardHeader>
            <CardTitle>Jugadores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              {players?.map((p) => {
                const profile = p.profiles;
                return (
                  <div key={p.profile_id} className="flex items-center justify-between gap-2">
                    <div className="grid">
                      <span className="font-medium">
                        {p.jersey_number ? `#${p.jersey_number} ` : ""}
                        {profile.full_name}
                      </span>
                      <span className="text-sm text-muted-foreground">{profile.email}</span>
                    </div>
                    <form action={removePlayer.bind(null, teamId, p.profile_id)}>
                      <SubmitButton variant="tertiary" size="sm">
                        Quitar
                      </SubmitButton>
                    </form>
                  </div>
                );
              })}
              {(!players || players.length === 0) && (
                <p className="text-muted-foreground">Sin jugadores asignados.</p>
              )}
            </div>
            <ActionForm action={addPlayerByEmail.bind(null, teamId)}>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="playerEmail">Email del jugador</Label>
                  <Input id="playerEmail" name="email" type="email" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="jerseyNumber">Dorsal (opcional)</Label>
                  <Input id="jerseyNumber" name="jerseyNumber" type="number" />
                </div>
                <SubmitButton className="w-full">Añadir jugador</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

