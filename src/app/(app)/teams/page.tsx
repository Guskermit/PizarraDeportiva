import Link from "next/link";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createTeam } from "@/lib/actions/teams";
import { FlatTable } from "@/components/FlatTable";
import { TeamsCard } from "@/components/club/TeamsCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

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

  // Conteo de entrenadores y jugadores por equipo (solo para admins del club).
  const coachCountMap = new Map<string, number>();
  const playerCountMap = new Map<string, number>();
  if (club) {
    const teamIds = teamList.map((t) => t.id);
    const [{ data: teamCoachesRaw }, { data: teamPlayersRaw }] = await Promise.all([
      teamIds.length > 0
        ? supabase.from("team_coaches").select("team_id").in("team_id", teamIds)
        : Promise.resolve({ data: [], error: null }),
      teamIds.length > 0
        ? supabase.from("team_players").select("team_id").in("team_id", teamIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const tc of (teamCoachesRaw as unknown as { team_id: string }[] | null) ?? []) {
      coachCountMap.set(tc.team_id, (coachCountMap.get(tc.team_id) ?? 0) + 1);
    }
    for (const tp of (teamPlayersRaw as unknown as { team_id: string }[] | null) ?? []) {
      playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) ?? 0) + 1);
    }
  }

  const columns = [
    { key: "team", label: "Equipo" },
    { key: "category", label: "Categoría", width: "10rem" },
    ...(club
      ? [
          { key: "coaches", label: "Entrenadores", width: "8rem" },
          { key: "players", label: "Jugadores", width: "8rem" },
        ]
      : []),
    { key: "actions", label: "Acciones", width: "auto" },
  ];

  const teamsTable = (
    <FlatTable
      columns={columns}
      searchPlaceholder="Buscar equipos..."
      emptyMessage="Aún no hay equipos."
      rows={teamList.map((team) => ({
        id: team.id,
        searchText: `${team.name} ${team.category ?? ""}`,
        cells: [
          <div key="team" className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(team.name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{team.name}</span>
          </div>,
          <span key="category" className="text-muted-foreground">
            {team.category ?? "—"}
          </span>,
          ...(club
            ? [
                <span key="coaches" className="text-muted-foreground">
                  {coachCountMap.get(team.id) ?? 0}
                </span>,
                <span key="players" className="text-muted-foreground">
                  {playerCountMap.get(team.id) ?? 0}
                </span>,
              ]
            : []),
          <div key="actions" className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href={`/teams/${team.id}`} />}
              title="Ver equipo"
              aria-label="Ver equipo"
            >
              <Eye />
            </Button>
          </div>,
        ],
      }))}
    />
  );

  return (
    <div className="grid w-full gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Equipos</h1>
        <p className="text-muted-foreground">
          {club ? `Equipos de ${club.name}` : "Equipos que entrenas"}
        </p>
      </div>

      {club ? (
        <TeamsCard action={createTeam.bind(null, club.id)} onSuccessMessage="Equipo creado.">
          {teamsTable}
        </TeamsCard>
      ) : (
        teamsTable
      )}
    </div>
  );
}

