import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Super_admin (nivel plataforma): gestiona el panel de control y la plataforma.
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  return !!data;
}

export type MyClub = {
  role: "owner" | "gestor" | "entrenador";
  clubs: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  };
};

export async function getMyClubs(): Promise<MyClub[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("club_admins")
    .select("role, clubs(id, name, slug, logo_url, primary_color, secondary_color)")
    .eq("profile_id", user.id);

  return (data ?? []) as unknown as MyClub[];
}

export type MyCoachedTeam = {
  teams: { id: string; name: string; category: string | null; club_id: string };
};

export async function getMyTeams(): Promise<MyCoachedTeam[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("team_coaches")
    .select("teams(id, name, category, club_id)")
    .eq("profile_id", user.id);

  return (data ?? []) as unknown as MyCoachedTeam[];
}

export async function getBoardColors() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { homeColor: "#1d4ed8", awayColor: "#f97316" };

  const { data: adminMembership } = await adminSupabase
    .from("club_admins")
    .select("club_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  let clubId = adminMembership?.club_id;
  if (!clubId) {
    const { data: coachMembership } = await adminSupabase
      .from("team_coaches")
      .select("team_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();
    clubId = coachMembership?.team_id
      ? (
          await adminSupabase
            .from("teams")
            .select("club_id")
            .eq("id", coachMembership.team_id)
            .single()
        ).data?.club_id
      : undefined;
  }
  if (!clubId) {
    const { data: playerMembership } = await adminSupabase
      .from("team_players")
      .select("team_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();
    clubId = playerMembership?.team_id
      ? (
          await adminSupabase
            .from("teams")
            .select("club_id")
            .eq("id", playerMembership.team_id)
            .single()
        ).data?.club_id
      : undefined;
  }

  if (!clubId) return { homeColor: "#1d4ed8", awayColor: "#f97316" };
  const { data: club } = await adminSupabase
    .from("clubs")
    .select("primary_color, secondary_color")
    .eq("id", clubId)
    .single();

  return {
    homeColor: club?.primary_color ?? "#1d4ed8",
    awayColor: club?.secondary_color ?? "#f97316",
  };
}

export type ClubCoach = {
  id: string;
  full_name: string;
  email: string;
};

// Lista los entrenadores de un club: admins del club + entrenadores de sus equipos.
// Usa el cliente admin (service role) porque las políticas RLS actuales solo permiten
// a los admins del club leer la lista completa de entrenadores.
export async function getClubCoaches(clubId: string): Promise<ClubCoach[]> {
  const supabase = createAdminClient();

  const { data: admins } = await supabase
    .from("club_admins")
    .select("profile_id, profiles(id, full_name, email)")
    .eq("club_id", clubId);

  const { data: coaches } = await supabase
    .from("team_coaches")
    .select("profile_id, profiles(id, full_name, email), teams!inner(club_id)")
    .eq("teams.club_id", clubId);

  const map = new Map<string, ClubCoach>();
  for (const row of (admins ?? []) as unknown as { profiles: ClubCoach | null }[]) {
    if (row.profiles) map.set(row.profiles.id, row.profiles);
  }
  for (const row of (coaches ?? []) as unknown as { profiles: ClubCoach | null }[]) {
    if (row.profiles) map.set(row.profiles.id, row.profiles);
  }
  return [...map.values()];
}
