"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { TacticalBoard } from "@/components/board/TacticalBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clonePositions } from "@/lib/futsal/formations";
import { saveInitialPositions, saveSequence, finalizePlay, reopenPlay, deleteLastSequence } from "@/lib/actions/plays";
import type { BoardMove, BoardPoint, BoardPositions } from "@/lib/supabase/database.types";

// A player/ball is considered "in possession" of the ball when within this world-unit distance.
const POSSESSION_THRESHOLD = 11;

function distance(a: BoardPoint, b: BoardPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveKey(move: Pick<BoardMove, "type" | "playerId">) {
  return move.type === "ball" ? "ball" : `player:${move.playerId}`;
}

interface Sequence {
  id: string;
  order_index: number;
  positions: BoardPositions;
  moves: BoardMove[];
}

export function TacticalEditor({
  playId,
  initialPositions,
  savedSequences,
  homeColor,
  awayColor,
  status,
}: {
  playId: string;
  initialPositions: BoardPositions;
  savedSequences: Sequence[];
  homeColor: string;
  awayColor: string;
  status: "draft" | "ready";
}) {
  const [locked, setLocked] = useState(savedSequences.length > 0);
  const [initialPos, setInitialPos] = useState(initialPositions);
  const [sequences, setSequences] = useState<Sequence[]>(savedSequences);
  const [pendingMoves, setPendingMoves] = useState<BoardMove[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playStatus, setPlayStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  const baseline = useMemo(
    () => (sequences.length > 0 ? sequences[sequences.length - 1].positions : initialPos),
    [sequences, initialPos],
  );

  const [workingPositions, setWorkingPositions] = useState<BoardPositions>(clonePositions(baseline));

  function applyPendingMove(move: BoardMove) {
    setPendingMoves((prev) => {
      const key = moveKey(move);
      const others = prev.filter((m) => moveKey(m) !== key);
      return [...others, move];
    });
  }

  function handlePlayerDragEnd(team: "home" | "away", playerId: string, pos: BoardPoint) {
    const list = team === "home" ? workingPositions.home : workingPositions.away;
    const player = list.find((p) => p.id === playerId);
    if (!player) return;

    const from = { x: player.x, y: player.y };
    const hasBall = !locked ? false : distance(from, workingPositions.ball) <= POSSESSION_THRESHOLD;

    setWorkingPositions((prevState) => {
      const next = clonePositions(prevState);
      const arr = team === "home" ? next.home : next.away;
      const target = arr.find((p) => p.id === playerId)!;
      target.x = pos.x;
      target.y = pos.y;
      if (hasBall) {
        next.ball = { x: pos.x, y: pos.y };
      }
      return next;
    });

    if (locked) {
      applyPendingMove({ type: "player", team, playerId, from, to: pos, curve: null, hasBall });
    }
  }

  function handleBallDragEnd(pos: BoardPoint) {
    const from = { x: workingPositions.ball.x, y: workingPositions.ball.y };
    setWorkingPositions((prevState) => ({ ...clonePositions(prevState), ball: pos }));
    if (locked) {
      applyPendingMove({ type: "ball", from, to: pos, curve: null, hasBall: false });
    }
  }

  function handleCurveChange(index: number, point: BoardPoint) {
    setPendingMoves((prev) => prev.map((m, i) => (i === index ? { ...m, curve: point } : m)));
  }

  function handleSaveInitial() {
    setError(null);
    startTransition(async () => {
      const result = await saveInitialPositions(playId, workingPositions);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setInitialPos(clonePositions(workingPositions));
      setLocked(true);
    });
  }

  function handleSaveSequence() {
    if (pendingMoves.length === 0) {
      setError("Mueve al menos un jugador o el balón antes de guardar la secuencia.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const orderIndex = sequences.length;
      const result = await saveSequence(playId, orderIndex, workingPositions, pendingMoves);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSequences((prev) => [
        ...prev,
        { id: crypto.randomUUID(), order_index: orderIndex, positions: clonePositions(workingPositions), moves: pendingMoves },
      ]);
      setPendingMoves([]);
    });
  }

  function handleUndoLastSequence() {
    const last = sequences[sequences.length - 1];
    if (!last) return;
    setError(null);
    startTransition(async () => {
      await deleteLastSequence(last.id, playId);
      const remaining = sequences.slice(0, -1);
      setSequences(remaining);
      const newBaseline = remaining.length > 0 ? remaining[remaining.length - 1].positions : initialPos;
      setWorkingPositions(clonePositions(newBaseline));
      setPendingMoves([]);
    });
  }

  function handleFinalize() {
    setError(null);
    startTransition(async () => {
      if (pendingMoves.length > 0) {
        const orderIndex = sequences.length;
        const result = await saveSequence(playId, orderIndex, workingPositions, pendingMoves);
        if (result?.error) {
          setError(result.error);
          return;
        }
      }
      await finalizePlay(playId);
    });
  }

  function handleReopen() {
    setError(null);
    startTransition(async () => {
      const result = await reopenPlay(playId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPlayStatus("draft");
    });
  }

  return (
    <div className="grid w-full gap-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!locked && <Badge variant="secondary">Paso 1 · Coloca la posición inicial</Badge>}
        {locked && <Badge variant="secondary">Paso 2 · Crea las secuencias de movimiento</Badge>}
        {playStatus === "ready" && <Badge>Jugada finalizada</Badge>}
        {playStatus === "ready" && (
          <Button variant="secondary" size="sm" onClick={handleReopen} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Editar de nuevo
          </Button>
        )}
      </div>

      <TacticalBoard
        positions={workingPositions}
        moves={locked ? pendingMoves : []}
        homeColor={homeColor}
        awayColor={awayColor}
        interactivePlayers={playStatus === "draft"}
        interactiveBall={playStatus === "draft"}
        interactiveCurves={locked && playStatus === "draft"}
        onPlayerDragEnd={handlePlayerDragEnd}
        onBallDragEnd={handleBallDragEnd}
        onCurveChange={handleCurveChange}
      />

      {playStatus === "draft" && (
        <div className="flex flex-wrap gap-3">
          {!locked && (
            <Button onClick={handleSaveInitial} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Guardar posición inicial
            </Button>
          )}
          {locked && (
            <>
              <Button onClick={handleSaveSequence} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Guardar secuencia ({sequences.length + 1})
              </Button>
              {sequences.length > 0 && (
                <Button variant="secondary" onClick={handleUndoLastSequence} disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  Deshacer última secuencia
                </Button>
              )}
              <Button variant="success" onClick={handleFinalize} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Finalizar jugada
              </Button>
            </>
          )}
        </div>
      )}

      {sequences.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Secuencias guardadas</h3>
          <div className="flex flex-wrap gap-2">
            {sequences.map((s) => (
              <Badge key={s.id} variant="secondary">
                Secuencia {s.order_index + 1}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {locked && (
        <p className="text-sm text-muted-foreground">
          Arrastra jugadores o el balón para dibujar los movimientos de esta secuencia. Las líneas
          discontinuas indican desplazamiento sin balón; las líneas continuas indican que el
          jugador se desplaza con el balón. Arrastra el punto central de una línea para curvarla.
        </p>
      )}
    </div>
  );
}
