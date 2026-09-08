"use client";

import { ShareForm } from "@/components/forms/ShareForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClubCoach } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { Edit3, Eye, Play, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

export type PlayRow = {
  id: string;
  title: string;
  typeLabel: string;
  status: string;
  clubId: string;
};

export function PlaysSelectTable({
  plays,
  selected,
  onToggle,
  onPlayLoop,
  coachesByClub,
  onDelete,
}: {
  plays: PlayRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onPlayLoop: () => void;
  coachesByClub?: Record<string, ClubCoach[]>;
  onDelete?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const filtered = useMemo(() => {
    if (!query.trim()) return plays;
    const q = query.toLowerCase();
    return plays.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.typeLabel.toLowerCase().includes(q),
    );
  }, [plays, query]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleAll() {
    if (allVisibleSelected) {
      // Deselect all visible
      for (const p of filtered) onToggle(p.id);
    } else {
      // Select all visible
      for (const p of filtered) {
        if (!selected.has(p.id)) onToggle(p.id);
      }
    }
  }

  return (
    <div className="grid w-full gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchId}
            placeholder="Buscar jugadas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {selected.size} {selected.size === 1 ? "seleccionada" : "seleccionadas"}
          </span>
          <Button
            variant="default"
            size="sm"
            disabled={selected.size < 2}
            onClick={onPlayLoop}
            title={
              selected.size < 2
                ? "Selecciona al menos 2 jugadas"
                : "Reproducir en bucle"
            }
          >
            <Play />
            <span className="hidden sm:inline">Reproducir bucle</span>
          </Button>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Seleccionar todas"
                />
              </TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden sm:table-cell" style={{ width: "12rem" }}>
                Tipo
              </TableHead>
              <TableHead className="hidden sm:table-cell" style={{ width: "8rem" }}>
                Estado
              </TableHead>
              <TableHead style={{ width: "auto" }}>
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No se encontraron jugadas.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((play) => (
                <TableRow
                  key={play.id}
                  className={cn(
                    "cursor-pointer",
                    selected.has(play.id) && "bg-primary/5",
                  )}
                  onClick={() => onToggle(play.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(play.id)}
                      onCheckedChange={() => onToggle(play.id)}
                      aria-label={`Seleccionar ${play.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{play.title}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {play.typeLabel}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                        play.status === "ready"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {play.status === "ready" ? "Finalizada" : "Borrador"}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        render={<Link href={`/plays/${play.id}/edit`} />}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Edit3 />
                      </Button>
                      <Button
                        variant="tertiary"
                        size="icon-sm"
                        render={<Link href={`/plays/${play.id}/view`} />}
                        title="Ver"
                        aria-label="Ver"
                      >
                        <Eye />
                      </Button>
                      {coachesByClub && (
                        <ShareForm
                          playId={play.id}
                          coaches={coachesByClub[play.clubId] ?? []}
                        />
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => onDelete(play.id)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
