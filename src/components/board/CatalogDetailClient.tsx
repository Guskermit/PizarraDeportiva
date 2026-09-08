"use client";

import { addPlayToCatalog, removePlayFromCatalog } from "@/lib/actions/catalogs";
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, PLAY_TYPE_LABELS } from "@/lib/futsal/formations";
import type { Difficulty, PlayType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PlayRow = {
  id: string;
  title: string;
  play_type: string;
  difficulty: number;
  status: string;
};

export function CatalogDetailClient({
  catalogId,
  catalogPlays,
  availablePlays,
}: {
  catalogId: string;
  catalogPlays: PlayRow[];
  availablePlays: PlayRow[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function handleAdd(playId: string) {
    const res = await addPlayToCatalog(catalogId, playId);
    if (res?.error) {
      window.alert(res.error);
    } else {
      router.refresh();
    }
  }

  async function handleRemove(playId: string) {
    const res = await removePlayFromCatalog(catalogId, playId);
    if (res?.error) {
      window.alert(res.error);
    } else {
      router.refresh();
    }
  }

  function renderPlay(p: PlayRow) {
    return (
      <div
        key={p.id}
        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{p.title}</p>
          <p className="text-xs text-muted-foreground">
            {PLAY_TYPE_LABELS[p.play_type as PlayType] ?? p.play_type}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            DIFFICULTY_COLORS[p.difficulty as Difficulty] ?? DIFFICULTY_COLORS[1],
          )}
        >
          {DIFFICULTY_LABELS[p.difficulty as Difficulty] ?? "Iniciación"}
        </span>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-6">
      {/* Plays in catalog */}
      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">
          Jugadas en el catálogo ({catalogPlays.length})
        </h2>
        {catalogPlays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este catálogo está vacío. Añade jugadas del club.
          </p>
        ) : (
          <div className="grid gap-2">
            {catalogPlays.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                {renderPlay(p)}
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Quitar del catálogo"
                  aria-label="Quitar del catálogo"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add plays */}
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Añadir jugadas ({availablePlays.length} disponibles)
          </h2>
          {availablePlays.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="text-sm text-primary hover:underline"
            >
              {adding ? "Ocultar" : "Mostrar"}
            </button>
          )}
        </div>
        {adding && availablePlays.length > 0 && (
          <div className="grid gap-2">
            {availablePlays.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                {renderPlay(p)}
                <button
                  type="button"
                  onClick={() => handleAdd(p.id)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  title="Añadir al catálogo"
                  aria-label="Añadir al catálogo"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
