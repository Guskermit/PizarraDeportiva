import { PlayLibraryTable } from "@/components/board/PlayLibraryTable";
import type { LibraryPlay } from "@/components/board/PlayLibraryTable";
import { DIFFICULTY_LABELS } from "@/lib/futsal/formations";
import type { Difficulty, PlayType } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { BookOpen } from "lucide-react";

export default async function LibraryPage() {
  const supabase = await createClient();

  const { data: plays } = await supabase
    .from("plays")
    .select(
      "id, title, play_type, difficulty, status, owner_coach_id, assigned_team_id",
    )
    .order("updated_at", { ascending: false });

  // Fetch owner names and team names in bulk.
  const ownerIds = [...new Set((plays ?? []).map((p) => p.owner_coach_id))];
  const teamIds = [...new Set((plays ?? []).map((p) => p.assigned_team_id).filter(Boolean))];

  const [{ data: profiles }, { data: teams }] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] as any[] }),
    teamIds.length > 0
      ? supabase.from("teams").select("id, name").in("id", teamIds as string[])
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
  const teamMap = new Map((teams ?? []).map((t: any) => [t.id, t.name]));

  const mapped: LibraryPlay[] = (plays ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    play_type: p.play_type as PlayType,
    difficulty: (p.difficulty ?? 1) as Difficulty,
    status: p.status,
    owner_name: nameMap.get(p.owner_coach_id) ?? "Desconocido",
    team_name: p.assigned_team_id ? (teamMap.get(p.assigned_team_id) ?? null) : null,
  }));

  return (
    <div className="grid w-full gap-6">
      <div className="flex items-center gap-3">
        <BookOpen className="size-6 text-muted-foreground" />
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Biblioteca de jugadas</h1>
          <p className="text-muted-foreground">
            Todas las jugadas del club, filtrables por tipo, dificultad y equipo.
          </p>
        </div>
      </div>

      <PlayLibraryTable plays={mapped} />
    </div>
  );
}
