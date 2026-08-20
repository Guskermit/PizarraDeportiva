import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type MyClub = {
  role: "owner" | "admin";
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
