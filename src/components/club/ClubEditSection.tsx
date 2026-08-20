"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ActionForm, type ActionState } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ClientColorInput } from "@/components/forms/ClientColorInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export function ClubEditSection({
  club,
  roleLabel,
  action,
  onSuccessMessage,
}: {
  club: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  };
  roleLabel: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onSuccessMessage: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar size="lg" className="size-16">
          {club.logo_url && <AvatarImage src={club.logo_url} alt={club.name} />}
          <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Tu club: {club.name}</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Rol: {roleLabel}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen((v) => !v)}
              title={open ? "Cerrar edición" : "Editar club"}
              aria-label={open ? "Cerrar edición" : "Editar club"}
            >
              <Pencil />
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <Card>
          <CardContent className="grid gap-5">
            <ActionForm action={action} onSuccessMessage={onSuccessMessage}>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Nombre del club</Label>
                    <Input id="name" name="name" defaultValue={club.name} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="logo">Logo del club</Label>
                    <Input id="logo" name="logo" type="file" accept="image/*" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ClientColorInput
                    id="primaryColor"
                    name="primaryColor"
                    label="Color principal (equipo local)"
                    defaultValue={club.primary_color}
                  />
                  <ClientColorInput
                    id="secondaryColor"
                    name="secondaryColor"
                    label="Color secundario (equipo visitante)"
                    defaultValue={club.secondary_color}
                  />
                </div>
                <div className="mt-2">
                  <SubmitButton>Guardar cambios</SubmitButton>
                </div>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </>
  );
}