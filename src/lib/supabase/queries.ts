import { createClient } from "@/lib/supabase/server";

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
