import { CatalogDetailClient } from "@/components/board/CatalogDetailClient";
import { createClient } from "@/lib/supabase/server";
import { getMyClubs } from "@/lib/supabase/queries";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const { catalogId } = await params;
  const supabase = await createClient();

  const { data: catalog } = await supabase
    .from("play_catalogs")
    .select("*")
    .eq("id", catalogId)
    .single();

  if (!catalog) notFound();

  // Fetch plays in this catalog.
  const { data: catalogPlays } = await supabase
    .from("play_catalog_plays")
    .select("play_id")
    .eq("catalog_id", catalogId);

  const playIds = (catalogPlays ?? []).map((cp) => cp.play_id);

  const { data: plays } = playIds.length > 0
    ? await supabase
        .from("plays")
        .select("id, title, play_type, difficulty, status")
        .in("id", playIds)
    : { data: [] };

  // Fetch all club plays (not yet in catalog) for the "add" selector.
  const { data: allClubPlays } = await supabase
    .from("plays")
    .select("id, title, play_type, difficulty, status")
    .eq("club_id", catalog.club_id)
    .order("title", { ascending: true });

  const catalogPlaySet = new Set(playIds);
  const availablePlays = (allClubPlays ?? []).filter((p) => !catalogPlaySet.has(p.id));

  return (
    <div className="grid w-full gap-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/catalogs" />}
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft />
        </Button>
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">{catalog.name}</h1>
          {catalog.description && (
            <p className="text-muted-foreground">{catalog.description}</p>
          )}
        </div>
      </div>

      <CatalogDetailClient
        catalogId={catalogId}
        catalogPlays={plays ?? []}
        availablePlays={availablePlays}
      />
    </div>
  );
}
