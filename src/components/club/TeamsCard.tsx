"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { ActionForm, type ActionState } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function TeamsCard({
  action,
  onSuccessMessage,
  children,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onSuccessMessage?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir equipos del club" : "Contraer equipos del club"}
        >
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              collapsed && "-rotate-90",
            )}
          />
          <CardTitle>Equipos del club</CardTitle>
        </button>
        {!collapsed &&
          (!open ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
              <Plus />
              Añadir equipo
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          ))}
      </CardHeader>
      {!collapsed && (
        <CardContent className="grid gap-5">
          {open && (
            <ActionForm
              action={action}
              onSuccessMessage={onSuccessMessage}
              onSuccess={() => setOpen(false)}
              className="grid gap-3 rounded-lg border p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="grid gap-1.5">
                  <Label htmlFor="teamName">Nombre</Label>
                  <Input id="teamName" name="name" placeholder="Nombre del equipo" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="teamCategory">Categoría (opcional)</Label>
                  <Input id="teamCategory" name="category" placeholder="Ej. Infantil A" />
                </div>
                <SubmitButton>Añadir equipo</SubmitButton>
              </div>
            </ActionForm>
          )}
          {children}
        </CardContent>
      )}
    </Card>
  );
}