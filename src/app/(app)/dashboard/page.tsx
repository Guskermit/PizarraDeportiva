import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlaysByMonthChart, PlaysByCoachChart } from "@/components/dashboard/AnalyticsCharts";

function StatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  color?: "primary" | "success" | "info";
  trend?: number;
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-primary/10 text-primary",
    info: "bg-accent/20 text-accent-foreground",
  };
  const up = (trend ?? 0) >= 0;
  return (
    <Card className="card-glow min-w-48 flex-1">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={cn("flex size-10 items-center justify-center rounded-lg", colorClasses[color])}>
            <Icon className="size-5" />
          </div>
          {trend !== undefined && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                up ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              )}
            >
              {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(trend)}%
            </span>
          )}
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
    supabase
      .from("plays")
      .select("owner_coach_id, created_at, profiles(full_name)")
      .eq("club_id", clubId),
  ]);

  const clubPlays = clubPlaysRaw as unknown as
    | { owner_coach_id: string; created_at: string; profiles: { full_name: string } | null }[]
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

  // Jugadas por mes (últimos 6 meses)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString("es-ES", { month: "short" }),
      count: 0,
    };
  });
  for (const play of clubPlays ?? []) {
    const d = new Date(play.created_at);
    const month = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (month) month.count += 1;
  }

  const thisMonth = months[months.length - 1].count;
  const lastMonth = months[months.length - 2].count;
  const trend =
    lastMonth === 0
      ? thisMonth > 0
        ? 100
        : 0
      : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  const coachChartData = [...playsByCoach.entries()].map(([, coach]) => coach);

  return (
    <div className="grid w-full gap-4">
      <div className="flex flex-wrap gap-4">
        <StatCard icon={Users} label="Equipos" value={teamCount ?? 0} color="primary" />
        <StatCard
          icon={ClipboardList}
          label="Jugadas totales"
          value={clubPlays?.length ?? 0}
          color="success"
          trend={trend}
        />
        <StatCard
          icon={ShieldCheck}
          label="Entrenadores activos"
          value={playsByCoach.size}
          color="info"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-glow">
          <CardContent className="grid gap-4">
            <div className="grid gap-0.5">
              <span className="text-sm font-medium">Jugadas por mes</span>
              <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
            </div>
            {clubPlays?.length ? (
              <PlaysByMonthChart data={months.map(({ month, count }) => ({ month, count }))} />
            ) : (
              <span className="text-sm text-muted-foreground">
                Todavía no se han creado jugadas.
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardContent className="grid gap-4">
            <div className="grid gap-0.5">
              <span className="text-sm font-medium">Jugadas por entrenador</span>
              <span className="text-xs text-muted-foreground">Distribución del catálogo</span>
            </div>
            {coachChartData.length ? (
              <PlaysByCoachChart data={coachChartData} />
            ) : (
              <span className="text-sm text-muted-foreground">
                Todavía no se han creado jugadas.
              </span>
            )}
          </CardContent>
        </Card>
      </div>
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
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: "var(--club-primary, var(--primary))" }}
              />
              <h2 className="text-lg font-semibold">{adminClubs![0].clubs.name}</h2>
            </div>
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

