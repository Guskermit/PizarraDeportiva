"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sharePlay } from "@/lib/actions/plays";
import type { ClubCoach } from "@/lib/supabase/queries";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Share2, X } from "lucide-react";
import { useId, useState } from "react";

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

  const selectedNames = selected
    .map((id) => coaches.find((c) => c.id === id)?.full_name)
    .filter(Boolean)
    .join(", ");

  return (
    <DialogPrimitive.Root open={isSharing} onOpenChange={setIsSharing}>
      <DialogPrimitive.Trigger
        render={
          <Button size="icon-sm" variant="secondary" title="Compartir" aria-label="Compartir" />
        }
      >
        <Share2 />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-5 text-popover-foreground shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <DialogPrimitive.Title className="font-heading text-base font-medium">
                Compartir jugada
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                Selecciona los entrenadores con los que quieres compartirla.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              render={<Button size="icon-sm" variant="ghost" title="Cerrar" aria-label="Cerrar" />}
            >
              <X />
            </DialogPrimitive.Close>
          </div>
          <ActionForm action={sharePlay.bind(null, playId)} onSuccess={() => setIsSharing(false)}>
            <div className="grid gap-4">
              <input type="hidden" name="targetType" value="profile" />
              {selected.map((id) => (
                <input key={id} type="hidden" name="targetValue" value={id} />
              ))}
              <div className="grid gap-1.5">
                <Label>Compartir con entrenadores del club</Label>
                <Select multiple value={selected} onValueChange={(v) => setSelected(v as string[])}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => selectedNames || "Selecciona uno o varios entrenadores..."}
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
                <Checkbox
                  id={canCopyId}
                  checked={canCopy}
                  onCheckedChange={(v) => setCanCopy(v === true)}
                />
                <Label htmlFor={canCopyId}>Permitir copiar</Label>
              </div>
              <div className="flex justify-end gap-2">
                <DialogPrimitive.Close render={<Button type="button" variant="tertiary" />}>
                  Cancelar
                </DialogPrimitive.Close>
                <SubmitButton size="sm" variant="secondary">
                  <Share2 />
                  Compartir
                </SubmitButton>
              </div>
            </div>
          </ActionForm>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
