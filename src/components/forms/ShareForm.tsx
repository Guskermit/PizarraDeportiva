"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { sharePlay } from "@/lib/actions/plays";
import type { ClubCoach } from "@/lib/supabase/queries";

export function ShareForm({
  playId,
  coaches,
}: {
  playId: string;
  coaches: ClubCoach[];
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [canCopy, setCanCopy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const canCopyId = useId();

  if (!isSharing) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setIsSharing(true)}>
        Compartir
      </Button>
    );
  }

  const selectedNames = selected
    .map((id) => coaches.find((c) => c.id === id)?.full_name)
    .filter(Boolean)
    .join(", ");

  return (
    <ActionForm action={sharePlay.bind(null, playId)}>
      <div className="grid gap-2">
        <input type="hidden" name="targetType" value="profile" />
        {selected.map((id) => (
          <input key={id} type="hidden" name="targetValue" value={id} />
        ))}
        <div className="grid gap-1.5">
          <Label>Compartir con entrenadores del club</Label>
          <Select
            multiple
            value={selected}
            onValueChange={(v) => setSelected(v as string[])}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {() =>
                  selectedNames ||
                  "Selecciona uno o varios entrenadores..."
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {coaches.map((coach) => (
                <SelectItem key={coach.id} value={coach.id}>
                  {coach.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {coaches.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay otros entrenadores en tu club.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input type="hidden" name="canCopy" value={canCopy ? "on" : ""} />
          <Checkbox id={canCopyId} checked={canCopy} onCheckedChange={(v) => setCanCopy(v === true)} />
          <Label htmlFor={canCopyId}>Permitir copiar</Label>
        </div>
        <div className="flex gap-2">
          <SubmitButton size="sm" variant="secondary">
            Compartir
          </SubmitButton>
          <Button size="sm" variant="tertiary" onClick={() => setIsSharing(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    </ActionForm>
  );
}

