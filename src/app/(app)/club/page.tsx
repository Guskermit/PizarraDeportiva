import { redirect } from "next/navigation";
import Link from "next/link";
import { Ban, Crown, Eye, Trash2, Unlock, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  updateClub,
  addClubCoach,
  setClubCoachRole,
  setClubCoachBlocked,
  removeClubCoach,
} from "@/lib/actions/clubs";
import { createTeam } from "@/lib/actions/teams";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { CoachTeamsEditor } from "@/components/club/CoachTeamsEditor";
import { CoachesCard } from "@/components/club/CoachesCard";
import { TeamsCard } from "@/components/club/TeamsCard";
import { PlayersCard } from "@/components/club/PlayersCard";
import { ClubEditSection } from "@/components/club/ClubEditSection";
import { FlatTable } from "@/components/FlatTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export default async function ClubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminRaw } = await supabase
    .from("club_admins")
    .select("role, clubs(id, name, logo_url, primary_color, secondary_color)")
    .eq("profile_id", user!.id)
    .limit(1)
    .maybeSingle();

  const admin = adminRaw as unknown as
    | {
        role: string;
        clubs: {
          id: string;
          name: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
        };
      }
    | null;

  // The club window is only visible to the owner.
  if (!admin || admin.role !== "owner") redirect("/dashboard");

  const club = admin.clubs;

  const { data: teamsRaw } = await supabase
    .from("teams")
    .select("id, name, category")
    .eq("club_id", club.id);
  const teams = teamsRaw ?? [];
  const teamIds = teams.map((t) => t.id);

  type CoachRow = {
    profile_id: string;
    role: string;
    is_blocked: boolean;
    profiles: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
  };

  const [
    { data: adminsRaw },
    { data: coachTeamsRaw },
    { data: teamCoachesRaw },
    { data: teamCoachesCountRaw },
    { data: teamPlayersCountRaw },
    { data: teamPlayersRaw },
  ] = await Promise.all([
    supabase
      .from("club_admins")
      .select("profile_id, role, is_blocked, profiles(id, full_name, email, avatar_url)")
      .eq("club_id", club.id),
    teamIds.length > 0
      ? supabase.from("team_coaches").select("team_id, profile_id").in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("team_coaches")
      .select("profile_id, profiles(id, full_name, email, avatar_url), teams!inner(club_id)")
      .eq("teams.club_id", club.id),
    teamIds.length > 0
      ? supabase.from("team_coaches").select("team_id").in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length > 0
      ? supabase.from("team_players").select("team_id").in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("team_players")
      .select(
        "profile_id, jersey_number, profiles(id, full_name, email, avatar_url), teams!inner(id, name)",
      )
      .eq("teams.club_id", club.id),
  ]);

  // Los entrenadores del club son los admins del club más los entrenadores de sus
  // equipos. Los admins tienen prioridad (conservan rol y estado de bloqueo).
  const coachMap = new Map<string, CoachRow>();
  for (const a of (adminsRaw as unknown as CoachRow[] | null) ?? []) {
    coachMap.set(a.profile_id, a);
  }
  for (const tc of (teamCoachesRaw as unknown as
    | { profile_id: string; profiles: CoachRow["profiles"] }[]
    | null) ?? []) {
    if (!coachMap.has(tc.profile_id)) {
      coachMap.set(tc.profile_id, {
        profile_id: tc.profile_id,
        role: "admin",
        is_blocked: false,
        profiles: tc.profiles,
      });
    }
  }
  const coaches = [...coachMap.values()];

  const coachTeamMap = new Map<string, string[]>();
  for (const ct of (coachTeamsRaw as unknown as { team_id: string; profile_id: string }[] | null) ??
    []) {
    const arr = coachTeamMap.get(ct.profile_id) ?? [];
    arr.push(ct.team_id);
    coachTeamMap.set(ct.profile_id, arr);
  }

  const coachCountMap = new Map<string, number>();
  for (const tc of (teamCoachesCountRaw as unknown as { team_id: string }[] | null) ?? []) {
    coachCountMap.set(tc.team_id, (coachCountMap.get(tc.team_id) ?? 0) + 1);
  }
  const playerCountMap = new Map<string, number>();
  for (const tp of (teamPlayersCountRaw as unknown as { team_id: string }[] | null) ?? []) {
    playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) ?? 0) + 1);
  }

  type PlayerRow = {
    profile_id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
    teams: { id: string; name: string; jersey_number: number | null }[];
  };

  // Agrupa los jugadores por perfil, acumulando los equipos a los que pertenecen.
  const playerMap = new Map<string, PlayerRow>();
  for (const tp of (teamPlayersRaw as unknown as
    | {
        profile_id: string;
        jersey_number: number | null;
        profiles: PlayerRow["profiles"];
        teams: { id: string; name: string };
      }[]
    | null) ?? []) {
    const entry = playerMap.get(tp.profile_id) ?? {
      profile_id: tp.profile_id,
      profiles: tp.profiles,
      teams: [],
    };
    entry.teams.push({ id: tp.teams.id, name: tp.teams.name, jersey_number: tp.jersey_number });
    playerMap.set(tp.profile_id, entry);
  }
  const players = [...playerMap.values()];

  return (
    <div className="grid w-full gap-8">
      <ClubEditSection
        club={club}
        roleLabel="Propietario"
        action={updateClub.bind(null, club.id)}
        onSuccessMessage="Club actualizado."
      />

      <CoachesCard
        action={addClubCoach.bind(null, club.id)}
        onSuccessMessage="Entrenador añadido. Si no tenía cuenta, se le ha enviado un email para crear su contraseña."
      >
        <FlatTable
          columns={[
            { key: "coach", label: "Entrenador" },
            { key: "email", label: "Email" },
            { key: "role", label: "Rol", width: "7rem" },
            { key: "teams", label: "Equipos", width: "14rem" },
            { key: "actions", label: "Acciones", width: "auto" },
          ]}
          searchPlaceholder="Buscar entrenadores..."
          emptyMessage="Aún no hay entrenadores en el club."
            rows={coaches.map((c) => {
              const profile = c.profiles;
              const isSelf = profile.id === user!.id;
              const assignedTeams = coachTeamMap.get(c.profile_id) ?? [];
              return {
                id: c.profile_id,
                searchText: `${profile.full_name} ${profile.email} ${
                  c.role === "owner" ? "propietario" : "entrenador"
                } ${c.is_blocked ? "bloqueado" : ""}`,
                cells: [
                  <div key="coach" className="flex items-center gap-3">
                    <Avatar size="sm">
                      {profile.avatar_url && (
                        <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                      )}
                      <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{profile.full_name}</span>
                      {isSelf && <Badge variant="secondary">Tú</Badge>}
                      {c.is_blocked && <Badge variant="destructive">Bloqueado</Badge>}
                    </div>
                  </div>,
                  <span key="email" className="text-muted-foreground">
                    {profile.email}
                  </span>,
                  <span key="role">
                    {c.role === "owner" ? (
                      <Badge>Propietario</Badge>
                    ) : (
                      <Badge variant="outline">Entrenador</Badge>
                    )}
                  </span>,
                  <div key="teams" className="min-w-40">
                    <CoachTeamsEditor
                      clubId={club.id}
                      profileId={c.profile_id}
                      teams={teams}
                      assignedTeamIds={assignedTeams}
                    />
                  </div>,
                  !isSelf ? (
                    <div key="actions" className="flex items-center gap-1">
                      <form
                        action={setClubCoachRole.bind(
                          null,
                          club.id,
                          c.profile_id,
                          c.role === "owner" ? "admin" : "owner",
                        )}
                      >
                        <SubmitButton
                          variant="ghost"
                          size="icon-sm"
                          title={c.role === "owner" ? "Hacer entrenador" : "Hacer propietario"}
                          aria-label={c.role === "owner" ? "Hacer entrenador" : "Hacer propietario"}
                        >
                          {c.role === "owner" ? <UserCog /> : <Crown />}
                        </SubmitButton>
                      </form>
                      <form
                        action={setClubCoachBlocked.bind(null, club.id, c.profile_id, !c.is_blocked)}
                      >
                        <SubmitButton
                          variant="ghost"
                          size="icon-sm"
                          title={c.is_blocked ? "Desbloquear" : "Bloquear"}
                          aria-label={c.is_blocked ? "Desbloquear" : "Bloquear"}
                        >
                          {c.is_blocked ? <Unlock /> : <Ban />}
                        </SubmitButton>
                      </form>
                      <form action={removeClubCoach.bind(null, club.id, c.profile_id)}>
                        <SubmitButton
                          variant="ghost"
                          size="icon-sm"
                          title="Eliminar"
                          aria-label="Eliminar"
                        >
                          <Trash2 />
                        </SubmitButton>
                      </form>
                    </div>
                  ) : (
                    <span key="actions" className="text-sm text-muted-foreground">
                      —
                    </span>
                  ),
                ],
              };
            })}
          />
      </CoachesCard>

      <TeamsCard
        action={createTeam.bind(null, club.id)}
        onSuccessMessage="Equipo creado."
      >
        <FlatTable
          columns={[
            { key: "team", label: "Equipo" },
            { key: "category", label: "Categoría", width: "10rem" },
            { key: "coaches", label: "Entrenadores", width: "8rem" },
            { key: "players", label: "Jugadores", width: "8rem" },
            { key: "actions", label: "Acciones", width: "auto" },
          ]}
          searchPlaceholder="Buscar equipos..."
          emptyMessage="Aún no hay equipos en el club."
          rows={teams.map((team) => ({
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
              <span key="coaches" className="text-muted-foreground">
                {coachCountMap.get(team.id) ?? 0}
              </span>,
              <span key="players" className="text-muted-foreground">
                {playerCountMap.get(team.id) ?? 0}
              </span>,
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
      </TeamsCard>

      <PlayersCard>
        <FlatTable
          columns={[
            { key: "player", label: "Jugador" },
            { key: "email", label: "Email" },
            { key: "teams", label: "Equipos", width: "auto" },
          ]}
          searchPlaceholder="Buscar jugadores..."
          emptyMessage="Aún no hay jugadores en el club."
          rows={players.map((p) => ({
            id: p.profile_id,
            searchText: `${p.profiles.full_name} ${p.profiles.email} ${p.teams
              .map((t) => t.name)
              .join(" ")}`,
            cells: [
              <div key="player" className="flex items-center gap-3">
                <Avatar size="sm">
                  {p.profiles.avatar_url && (
                    <AvatarImage src={p.profiles.avatar_url} alt={p.profiles.full_name} />
                  )}
                  <AvatarFallback>{getInitials(p.profiles.full_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{p.profiles.full_name}</span>
              </div>,
              <span key="email" className="text-muted-foreground">
                {p.profiles.email}
              </span>,
              <div key="teams" className="flex flex-wrap gap-1.5">
                {p.teams.map((t) => (
                  <Badge key={t.id} variant="outline">
                    {t.name}
                    {t.jersey_number != null && ` (#${t.jersey_number})`}
                  </Badge>
                ))}
              </div>,
            ],
          }))}
        />
      </PlayersCard>
    </div>
  );
}

