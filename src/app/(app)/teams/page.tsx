import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTeam } from "@/lib/actions/teams";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function TeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminClubsRaw } = await supabase
    .from("club_admins")
    .select("clubs(id, name)")
    .eq("profile_id", user!.id);
  const adminClubs = adminClubsRaw as unknown as { clubs: { id: string; name: string } }[] | null;

  const club = adminClubs?.[0]?.clubs;

  const { data: teamsRaw } = club
    ? await supabase.from("teams").select("id, name, category").eq("club_id", club.id)
    : await supabase
        .from("team_coaches")
        .select("teams(id, name, category)")
        .eq("profile_id", user!.id);

  const teamList = club
    ? ((teamsRaw as { id: string; name: string; category: string | null }[] | null) ?? [])
    : (
        (teamsRaw as { teams: { id: string; name: string; category: string | null } }[] | null) ?? []
      ).map((t) => t.teams);

  return (
    <div className="grid w-full gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Equipos</h1>
        <p className="text-muted-foreground">
          {club ? `Equipos de ${club.name}` : "Equipos que entrenas"}
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {teamList.map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="min-w-48">
              <CardContent className="grid gap-2">
                <span className="font-medium">{team.name}</span>
                {team.category && (
                  <span className="text-sm text-muted-foreground">{team.category}</span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {teamList.length === 0 && <p className="text-muted-foreground">Aún no hay equipos.</p>}
      </div>

      {club && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Crear equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createTeam.bind(null, club.id)}>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Nombre del equipo</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="category">Categoría (opcional)</Label>
                  <Input id="category" name="category" />
                </div>
                <SubmitButton className="w-full">Crear equipo</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

