"use client";

import {
  assignCatalogToTeam,
  unassignCatalogFromTeam,
} from "@/lib/actions/catalogs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen, Link2, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type CatalogInfo = {
  id: string;
  name: string;
  description: string | null;
  play_count: number;
};

export function TeamCatalogsSection({
  teamId,
  assignedCatalogs,
  allCatalogs,
}: {
  teamId: string;
  assignedCatalogs: CatalogInfo[];
  allCatalogs: CatalogInfo[];
}) {
  const router = useRouter();
  const [selectedCatalog, setSelectedCatalog] = useState<string>("");

  const unassigned = allCatalogs.filter(
    (c) => !assignedCatalogs.some((a) => a.id === c.id),
  );

  async function handleAssign() {
    if (!selectedCatalog) return;
    const res = await assignCatalogToTeam(teamId, selectedCatalog);
    if (res?.error) {
      window.alert(res.error);
    } else {
      setSelectedCatalog("");
      router.refresh();
    }
  }

  async function handleUnassign(catalogId: string, name: string) {
    if (!window.confirm(`¿Desasignar el catálogo "${name}" de este equipo?`)) return;
    const res = await unassignCatalogFromTeam(teamId, catalogId);
    if (res?.error) {
      window.alert(res.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold">Catálogos asignados</h3>

      {assignedCatalogs.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No hay catálogos asignados a este equipo.
        </p>
      ) : (
        <div className="grid gap-2">
          {assignedCatalogs.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 rounded-lg border p-2"
            >
              <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.play_count} {cat.play_count === 1 ? "jugada" : "jugadas"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleUnassign(cat.id, cat.name)}
                title="Desasignar"
                aria-label="Desasignar"
              >
                <Unlink />
              </Button>
            </div>
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedCatalog} onValueChange={(v) => setSelectedCatalog(v ?? "")}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar catálogo…" />
            </SelectTrigger>
            <SelectContent>
              {unassigned.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name} ({cat.play_count} jugadas)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectedCatalog}
            onClick={handleAssign}
          >
            <Link2 />
            Asignar
          </Button>
        </div>
      )}
    </div>
  );
}
