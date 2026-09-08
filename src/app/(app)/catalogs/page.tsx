import { CatalogList } from "@/components/board/CatalogList";
import type { CatalogRow } from "@/components/board/CatalogList";
import { getMyClubs } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { FolderOpen } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CatalogsPage() {
  const clubs = await getMyClubs();
  const club = clubs.find((c) => c.role === "owner" || c.role === "gestor");

  if (!club) notFound();

  const supabase = await createClient();

  const { data: catalogs } = await supabase
    .from("play_catalogs")
    .select("id, name, description")
    .eq("club_id", club.clubs.id)
    .order("created_at", { ascending: true });

  // Count plays per catalog.
  const catalogIds = (catalogs ?? []).map((c) => c.id);
  let counts: Record<string, number> = {};
  if (catalogIds.length > 0) {
    const { data: cpc } = await supabase
      .from("play_catalog_plays")
      .select("catalog_id")
      .in("catalog_id", catalogIds);
    for (const row of cpc ?? []) {
      counts[row.catalog_id] = (counts[row.catalog_id] ?? 0) + 1;
    }
  }

  const rows: CatalogRow[] = (catalogs ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    play_count: counts[c.id] ?? 0,
  }));

  return (
    <div className="grid w-full gap-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="size-6 text-muted-foreground" />
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Catálogos de jugadas</h1>
          <p className="text-muted-foreground">
            Agrupa jugadas en catálogos para asignarlas a equipos.
          </p>
        </div>
      </div>

      <CatalogList clubId={club.clubs.id} catalogs={rows} />
    </div>
  );
}
