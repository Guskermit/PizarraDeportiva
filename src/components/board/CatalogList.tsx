"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCatalog, deleteCatalog } from "@/lib/actions/catalogs";
import { cn } from "@/lib/utils";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type CatalogRow = {
  id: string;
  name: string;
  description: string | null;
  play_count: number;
};

export function CatalogList({
  clubId,
  catalogs,
}: {
  clubId: string;
  catalogs: CatalogRow[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar el catálogo "${name}"?`)) return;
    deleteCatalog(id).then((res) => {
      if (res?.error) window.alert(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid w-full gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {catalogs.length} {catalogs.length === 1 ? "catálogo" : "catálogos"}
        </p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus />
          Nuevo catálogo
        </Button>
      </div>

      {showForm && (
        <ActionForm
          action={createCatalog.bind(null, clubId)}
          onSuccess={() => {
            setShowForm(false);
            router.refresh();
          }}
          className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        >
          <div className="grid gap-1.5">
            <label htmlFor="cat-name" className="text-xs font-medium">
              Nombre
            </label>
            <Input
              id="cat-name"
              name="name"
              placeholder="Ej. Nivel iniciación"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="cat-desc" className="text-xs font-medium">
              Descripción (opcional)
            </label>
            <Input
              id="cat-desc"
              name="description"
              placeholder="Grupo de jugadas para nuevos jugadores"
            />
          </div>
          <SubmitButton size="sm">Crear</SubmitButton>
        </ActionForm>
      )}

      {catalogs.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aún no hay catálogos. Crea uno para agrupar jugadas.
        </p>
      )}

      <div className="grid gap-2">
        {catalogs.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
          >
            <FolderOpen className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/catalogs/${cat.id}`}
                className="text-sm font-medium hover:text-primary"
              >
                {cat.name}
              </Link>
              {cat.description && (
                <p className="truncate text-xs text-muted-foreground">
                  {cat.description}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {cat.play_count} {cat.play_count === 1 ? "jugada" : "jugadas"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(cat.id, cat.name)}
              title="Eliminar"
              aria-label="Eliminar"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
