"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { sharePlay } from "@/lib/actions/plays";

export function ShareForm({ playId }: { playId: string }) {
  const [isSharing, setIsSharing] = useState(false);
  const [canCopy, setCanCopy] = useState(false);
  const emailId = useId();
  const canCopyId = useId();

  if (!isSharing) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setIsSharing(true)}>
        Compartir
      </Button>
    );
  }

  return (
    <ActionForm action={sharePlay.bind(null, playId)}>
      <div className="grid gap-2">
        <input type="hidden" name="targetType" value="profile" />
        <div className="grid gap-1.5">
          <Label htmlFor={emailId}>Compartir con (email)</Label>
          <Input id={emailId} name="targetValue" type="email" />
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

