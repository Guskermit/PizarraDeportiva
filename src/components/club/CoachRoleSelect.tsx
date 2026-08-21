"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setClubCoachRole } from "@/lib/actions/clubs";
import type { ClubAdminRole } from "@/lib/supabase/database.types";

const ROLE_LABELS: Record<ClubAdminRole, string> = {
  owner: "Propietario",
  gestor: "Gestor",
  entrenador: "Entrenador",
};

export function CoachRoleSelect({
  clubId,
  profileId,
  role,
}: {
  clubId: string;
  profileId: string;
  role: ClubAdminRole;
}) {
  const [value, setValue] = useState<ClubAdminRole>(role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza el estado local si el rol cambia en el servidor.
  useEffect(() => {
    setValue(role);
  }, [role]);

  async function handleChange(next: ClubAdminRole) {
    setValue(next);
    setSaving(true);
    setError(null);
    await setClubCoachRole(clubId, profileId, next);
    setSaving(false);
  }

  return (
    <div className="grid gap-1">
      <Select value={value} onValueChange={(v) => handleChange(v as ClubAdminRole)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {(v) => ROLE_LABELS[(v as ClubAdminRole) ?? value] ?? "Seleccionar"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABELS) as ClubAdminRole[]).map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <span className="text-xs text-muted-foreground">Guardando…</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}