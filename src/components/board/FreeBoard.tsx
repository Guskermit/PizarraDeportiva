"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBoardSituation, deleteBoardSituation } from "@/lib/actions/situations";
import { buildInitialPositions, clonePositions } from "@/lib/futsal/formations";
import type { BoardPositions } from "@/lib/supabase/database.types";
import { ArrowLeft, RotateCcw, Save, Trash2, Undo2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TacticalBoard = dynamic(
  () => import("@/components/board/TacticalBoard").then((module) => module.TacticalBoard),
  { ssr: false },
);

export interface BoardSituation {
  id: string;
  name: string;
  positions: BoardPositions;
}

export function FreeBoard({
  situations,
  homeColor,
  awayColor,
  showSaveForm = false,
}: {
  situations: BoardSituation[];
  homeColor: string;
  awayColor: string;
  showSaveForm?: boolean;
}) {
  const router = useRouter();
  const initialPositions = buildInitialPositions("portero_4_jugadores", "portero_4_jugadores");
  const [positions, setPositions] = useState<BoardPositions>(clonePositions(initialPositions));
  const [history, setHistory] = useState<BoardPositions[]>([]);
  const [panelOpen, setPanelOpen] = useState(showSaveForm);
  const [name, setName] = useState("");

  function updatePositions(next: BoardPositions) {
    setHistory((previous) => [...previous, clonePositions(positions)]);
    setPositions(clonePositions(next));
  }

  function handlePlayerDragEnd(
    team: "home" | "away",
    playerId: string,
    pos: { x: number; y: number },
  ) {
    const next = clonePositions(positions);
    const player = next[team].find((item) => item.id === playerId);
    if (!player) return;
    player.x = pos.x;
    player.y = pos.y;
    updatePositions(next);
  }

  function handleBallDragEnd(pos: { x: number; y: number }) {
    const next = clonePositions(positions);
    next.ball = pos;
    updatePositions(next);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setPositions(clonePositions(previous));
    setHistory((items) => items.slice(0, -1));
  }

  function reset() {
    setHistory((previous) => [...previous, clonePositions(positions)]);
    setPositions(clonePositions(initialPositions));
  }

  function loadSituation(situation: BoardSituation) {
    setHistory((previous) => [...previous, clonePositions(positions)]);
    setPositions(clonePositions(situation.positions));
    setPanelOpen(false);
  }

  async function removeSituation(id: string) {
    await deleteBoardSituation(id);
    router.refresh();
  }

  const createAction = createBoardSituation.bind(null, positions);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={showSaveForm ? "/dashboard" : "/dashboard"} />}
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft />
          </Button>
          <h1 className="truncate text-sm font-semibold sm:text-base">
            {showSaveForm ? "Situaciones preconfiguradas" : "Pizarra libre"}
          </h1>
        </div>
        <Button
          variant={panelOpen ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setPanelOpen((open) => !open)}
          title={panelOpen ? "Cerrar situaciones" : "Abrir situaciones"}
          aria-label={panelOpen ? "Cerrar situaciones" : "Abrir situaciones"}
        >
          {panelOpen ? <X /> : <Save />}
        </Button>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-5">
        <div className="h-full w-full">
          <TacticalBoard
            positions={positions}
            homeColor={homeColor}
            awayColor={awayColor}
            interactivePlayers
            interactiveBall
            onPlayerDragEnd={handlePlayerDragEnd}
            onBallDragEnd={handleBallDragEnd}
          />
        </div>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-background/90 p-1.5 shadow-lg backdrop-blur sm:bottom-5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={history.length === 0}
            title="Deshacer último movimiento"
            aria-label="Deshacer último movimiento"
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={reset}
            title="Volver a la posición inicial"
            aria-label="Volver a la posición inicial"
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPanelOpen(true)}
            title="Cargar situación"
            aria-label="Cargar situación"
          >
            <Save />
          </Button>
        </div>

        {panelOpen && (
          <aside className="absolute top-3 right-3 bottom-16 w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border bg-background/95 p-4 shadow-xl backdrop-blur sm:top-5 sm:right-5 sm:bottom-20">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Situaciones</h2>
                <p className="text-xs text-muted-foreground">
                  Carga una posición o guarda la actual.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPanelOpen(false)}
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X />
              </Button>
            </div>

            <div className="grid gap-2">
              {situations.map((situation) => (
                <div key={situation.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-primary"
                    onClick={() => loadSituation(situation)}
                  >
                    {situation.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeSituation(situation.id)}
                    title={`Eliminar ${situation.name}`}
                    aria-label={`Eliminar ${situation.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {situations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay situaciones guardadas.
                </p>
              )}
            </div>

            <ActionForm
              action={createAction}
              onSuccess={() => {
                setName("");
                router.refresh();
              }}
              className="mt-5 grid gap-2 border-t pt-4"
            >
              <label htmlFor="situation-name" className="text-sm font-medium">
                Guardar posición actual
              </label>
              <Input
                id="situation-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Saque de esquina"
                required
              />
              <SubmitButton>
                <Save />
                Guardar situación
              </SubmitButton>
            </ActionForm>
          </aside>
        )}
      </main>
    </div>
  );
}
