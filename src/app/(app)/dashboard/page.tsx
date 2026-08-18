import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, ClipboardList, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  color?: "primary" | "success" | "info";
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-primary/10 text-primary",
    info: "bg-accent/20 text-accent-foreground",
  };
  return (
    <Card className="min-w-48 flex-1">
      <CardContent className="flex flex-col gap-4">
        <div className={cn("flex size-10 items-center justify-center rounded-md", colorClasses[color])}>
          <Icon className="size-5" />
        </div>
        <div className="grid gap-1">
          <span className="text-2xl font-semibold">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

async function ClubStats({ clubId }: { clubId: string }) {
  const supabase = await createClient();

  const [{ count: teamCount }, { data: clubPlaysRaw }] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("club_id", clubId),
    supabase.from("plays").select("owner_coach_id, profiles(full_name)").eq("club_id", clubId),
  ]);

  const clubPlays = clubPlaysRaw as unknown as
    | { owner_coach_id: string; profiles: { full_name: string } | null }[]
    | null;

  const playsByCoach = new Map<string, { name: string; count: number }>();
  for (const play of clubPlays ?? []) {
    const entry = playsByCoach.get(play.owner_coach_id) ?? {
      name: play.profiles?.full_name ?? "Entrenador",
      count: 0,
    };
    entry.count += 1;
    playsByCoach.set(play.owner_coach_id, entry);
  }

  return (
    <div className="grid w-full gap-4">
      <div className="flex flex-wrap gap-4">
        <StatCard icon={Users} label="Equipos" value={teamCount ?? 0} color="primary" />
        <StatCard
          icon={ClipboardList}
          label="Jugadas totales"
          value={clubPlays?.length ?? 0}
          color="success"
        />
        <StatCard icon={ShieldCheck} label="Entrenadores activos" value={playsByCoach.size} color="info" />
      </div>

      <Card>
        <CardContent className="grid gap-3">
          <span className="text-sm text-muted-foreground">Jugadas por entrenador</span>
          {playsByCoach.size === 0 && (
            <span className="text-sm text-muted-foreground">Todavía no se han creado jugadas.</span>
          )}
          {[...playsByCoach.entries()].map(([coachId, coach]) => (
            <div key={coachId} className="flex items-center justify-between gap-2">
              <span>{coach.name}</span>
              <span className="font-medium">{coach.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: adminClubsRaw }, { data: coachTeamsRaw }, { data: playerTeamsRaw }] =
    await Promise.all([
      supabase
        .from("club_admins")
        .select("role, clubs(id, name, logo_url)")
        .eq("profile_id", user!.id),
      supabase
        .from("team_coaches")
        .select("teams(id, name, category, club_id)")
        .eq("profile_id", user!.id),
      supabase
        .from("team_players")
        .select("teams(id, name, category)")
        .eq("profile_id", user!.id),
    ]);

  const adminClubs = adminClubsRaw as unknown as
    | { role: string; clubs: { id: string; name: string; logo_url: string | null } }[]
    | null;
  const coachTeams = coachTeamsRaw as unknown as
    | { teams: { id: string; name: string; category: string | null; club_id: string } }[]
    | null;
  const playerTeams = playerTeamsRaw as unknown as
    | { teams: { id: string; name: string; category: string | null } }[]
    | null;

  const isClubAdmin = (adminClubs?.length ?? 0) > 0;
  const isCoach = (coachTeams?.length ?? 0) > 0;

  return (
    <div className="grid w-full gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Panel</h1>
        <p className="text-muted-foreground">
          Gestiona tu club, equipos y catálogo de jugadas de fútbol sala.
        </p>
      </div>

      {isClubAdmin && (
        <div className="grid w-full gap-4">
          <div className="flex w-full items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{adminClubs![0].clubs.name}</h2>
            <div className="flex gap-3">
              <Button variant="secondary" render={<Link href="/club" />}>
                <ShieldCheck />
                Editar club
              </Button>
              <Button variant="secondary" render={<Link href="/teams" />}>
                <Users />
                Gestionar equipos
              </Button>
            </div>
          </div>

          <ClubStats clubId={adminClubs![0].clubs.id} />
        </div>
      )}

      {isCoach && (
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Equipos que entrenas</h2>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" render={<Link href="/plays" />}>
                  Ver catálogo
                </Button>
                <Button size="sm" render={<Link href="/plays/new" />}>
                  Nueva jugada
                  <ArrowRight />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {coachTeams!.map((t) => {
                const team = t.teams as unknown as { id: string; name: string; category: string | null };
                return (
                  <Link key={team.id} href={`/teams/${team.id}`}>
                    <Card className="min-w-48">
                      <CardContent className="grid gap-2">
                        <Users className="size-4 text-primary" />
                        <span className="font-medium">{team.name}</span>
                        {team.category && (
                          <span className="text-sm text-muted-foreground">{team.category}</span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {playerTeams && playerTeams.length > 0 && (
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tus equipos como jugador</h2>
              <Button variant="secondary" size="sm" render={<Link href="/plays" />}>
                Ver jugadas compartidas
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              {playerTeams.map((t, i) => {
                const team = t.teams as unknown as { id: string; name: string };
                return (
                  <Card key={team?.id ?? i} className="min-w-48">
                    <CardContent>
                      <span className="font-medium">{team?.name}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!isClubAdmin && !isCoach && (!playerTeams || playerTeams.length === 0) && (
        <Card>
          <CardContent className="grid gap-3">
            <p>
              Todavía no perteneces a ningún club. Pide a tu entrenador que te añada a un equipo, o
              registra un nuevo club.
            </p>
            <div>
              <Button variant="secondary" render={<Link href="/register-club" />}>
                Registrar club
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

