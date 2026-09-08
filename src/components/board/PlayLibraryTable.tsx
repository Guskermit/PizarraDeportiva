"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  PLAY_TYPE_LABELS,
} from "@/lib/futsal/formations";
import type { Difficulty, PlayType } from "@/lib/supabase/database.types";
import { cn, getInitials } from "@/lib/utils";
import { Eye, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type LibraryPlay = {
  id: string;
  title: string;
  play_type: PlayType;
  difficulty: Difficulty;
  status: string;
  owner_name: string;
  team_name: string | null;
};

const ALL = "__all__";

export function PlayLibraryTable({ plays }: { plays: LibraryPlay[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [diffFilter, setDiffFilter] = useState<string>(ALL);
  const [teamFilter, setTeamFilter] = useState<string>(ALL);

  const teams = useMemo(
    () => [...new Set(plays.map((p) => p.team_name).filter(Boolean))] as string[],
    [plays],
  );

  const filtered = useMemo(() => {
    return plays.filter((p) => {
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter !== ALL && p.play_type !== typeFilter) return false;
      if (diffFilter !== ALL && String(p.difficulty) !== diffFilter) return false;
      if (teamFilter !== ALL && p.team_name !== teamFilter) return false;
      return true;
    });
  }, [plays, query, typeFilter, diffFilter, teamFilter]);

  return (
    <div className="grid w-full gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-72 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar jugadas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? ALL)}>
          <SelectTrigger className="w-[11rem]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los tipos</SelectItem>
            {Object.entries(PLAY_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={diffFilter} onValueChange={(v) => setDiffFilter(v ?? ALL)}>
          <SelectTrigger className="w-[11rem]">
            <SelectValue placeholder="Dificultad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {teams.length > 0 && (
          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? ALL)}>
            <SelectTrigger className="w-[11rem]">
              <SelectValue placeholder="Equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "jugada" : "jugadas"}
        </span>
      </div>

      {/* List */}
      <div className="grid gap-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron jugadas con esos filtros.
          </p>
        )}
        {filtered.map((play) => (
          <div
            key={play.id}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
          >
            <Avatar size="sm">
              <AvatarFallback>{getInitials(play.title)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{play.title}</p>
              <p className="text-xs text-muted-foreground">
                {PLAY_TYPE_LABELS[play.play_type]}
                {play.team_name && ` · ${play.team_name}`}
                {` · ${play.owner_name}`}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                DIFFICULTY_COLORS[play.difficulty],
              )}
            >
              {DIFFICULTY_LABELS[play.difficulty]}
            </span>
            <Button
              variant="tertiary"
              size="icon-sm"
              render={<Link href={`/plays/${play.id}/view`} />}
              title="Ver"
              aria-label="Ver"
            >
              <Eye />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
