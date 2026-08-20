"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setCoachTeams } from "@/lib/actions/clubs";

export function CoachTeamsEditor({
  clubId,
  profileId,
  teams,
  assignedTeamIds,
}: {
  clubId: string;
  profileId: string;
  teams: { id: string; name: string }[];
  assignedTeamIds: string[];
}) {
  const [value, setValue] = useState<string[]>(assignedTeamIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string[]) {
    setValue(next);
    setSaving(true);
    setError(null);
    const result = await setCoachTeams(clubId, profileId, next);
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="grid gap-1">
      <Select multiple value={value} onValueChange={(v) => handleChange(v as string[])}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {(v) => {
              const arr = Array.isArray(v) ? v : [];
              return arr.length === 0
                ? "Sin equipos"
                : `${arr.length} equipo${arr.length > 1 ? "s" : ""}`;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <span className="text-xs text-muted-foreground">Guardando…</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}