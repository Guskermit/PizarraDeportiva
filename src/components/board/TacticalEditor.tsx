"use client";

import { TacticalBoard } from "@/components/board/TacticalBoard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addSequenceNote,
  deleteLastSequence,
  deleteSequenceNote,
  finalizePlay,
  reopenPlay,
  saveInitialPositions,
  saveSequence,
  updateSequence,
} from "@/lib/actions/plays";
import { clonePositions } from "@/lib/futsal/formations";
import type { BoardMove, BoardPoint, BoardPositions } from "@/lib/supabase/database.types";
import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

export interface SequenceNote {
  id: string;
  sequence_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

// A player/ball is considered "in possession" of the ball when within this world-unit distance.
const POSSESSION_THRESHOLD = 11;

function distance(a: BoardPoint, b: BoardPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveKey(move: Pick<BoardMove, "type" | "playerId">) {
  return move.type === "ball" ? "ball" : `player:${move.playerId}`;
}

function cloneMoves(moves: BoardMove[]) {
  return JSON.parse(JSON.stringify(moves)) as BoardMove[];
}

function getPlayerPosition(positions: BoardPositions, team: "home" | "away", playerId: string) {
  return positions[team].find((player) => player.id === playerId);
}

function prepareSequence(sequence: Sequence, startPositions: BoardPositions) {
  const moves = cloneMoves(sequence.moves);
  const positions = clonePositions(startPositions);

  for (const move of moves) {
    if (move.type === "ball") {
      move.from = { ...positions.ball };
      positions.ball = { ...move.to };
      continue;
    }

    if (!move.team || !move.playerId) continue;
    const player = getPlayerPosition(positions, move.team, move.playerId);
    if (!player) continue;
    move.from = { x: player.x, y: player.y };
    player.x = move.to.x;
    player.y = move.to.y;
    if (move.hasBall) positions.ball = { ...move.to };
  }

  return { moves, positions };
}

interface Sequence {
  id: string;
  order_index: number;
  positions: BoardPositions;
  moves: BoardMove[];
  notes?: SequenceNote[];
}

export function TacticalEditor({
  playId,
  initialPositions,
  savedSequences,
  homeColor,
  awayColor,
  status,
  currentUserId,
}: {
  playId: string;
  initialPositions: BoardPositions;
  savedSequences: Sequence[];
  homeColor: string;
  awayColor: string;
  status: "draft" | "ready";
  currentUserId?: string | null;
}) {
  const [locked, setLocked] = useState(savedSequences.length > 0);
  const [initialPos, setInitialPos] = useState(initialPositions);
  const [sequences, setSequences] = useState<Sequence[]>(savedSequences);
  const [pendingMoves, setPendingMoves] = useState<BoardMove[]>([]);
  const [editingSequenceIndex, setEditingSequenceIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playStatus, setPlayStatus] = useState(status);
  const [isPending, startTransition] = useTransition();
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);

  const sequenceStartPositions = useMemo(() => {
    if (editingSequenceIndex === null || editingSequenceIndex === 0) return initialPos;
    return sequences[editingSequenceIndex - 1]?.positions ?? initialPos;
  }, [editingSequenceIndex, initialPos, sequences]);

  const baseline = useMemo(
    () =>
      editingSequenceIndex === null
        ? sequences.length > 0
          ? sequences[sequences.length - 1].positions
          : initialPos
        : (sequences[editingSequenceIndex]?.positions ?? initialPos),
    [editingSequenceIndex, sequences, initialPos],
  );

  const [workingPositions, setWorkingPositions] = useState<BoardPositions>(
    clonePositions(baseline),
  );

  function applyPendingMove(move: BoardMove) {
    setPendingMoves((prev) => {
      const key = moveKey(move);
      const others = prev.filter((m) => moveKey(m) !== key);
      return [...others, move];
    });
  }

  function findPendingMove(move: Pick<BoardMove, "type" | "playerId">) {
    return pendingMoves.find((pending) => moveKey(pending) === moveKey(move));
  }

  function handlePlayerDragEnd(team: "home" | "away", playerId: string, pos: BoardPoint) {
    const list = team === "home" ? workingPositions.home : workingPositions.away;
    const player = list.find((p) => p.id === playerId);
    if (!player) return;

    const existingMove = findPendingMove({ type: "player", playerId });
    const from = existingMove?.from ?? { x: player.x, y: player.y };
    const startBall = sequenceStartPositions.ball;
    const hasBall = !locked ? false : distance(from, startBall) <= POSSESSION_THRESHOLD;

    setWorkingPositions((prevState) => {
      const next = clonePositions(prevState);
      const arr = team === "home" ? next.home : next.away;
      const target = arr.find((p) => p.id === playerId);
      if (!target) return prevState;
      target.x = pos.x;
      target.y = pos.y;
      if (hasBall) {
        next.ball = { x: pos.x, y: pos.y };
      }
      return next;
    });

    if (locked) {
      applyPendingMove({
        ...(existingMove ?? {}),
        type: "player",
        team,
        playerId,
        from,
        to: pos,
        curve: null,
        hasBall,
      });
    }
  }

  function handleBallDragEnd(pos: BoardPoint) {
    const existingMove = findPendingMove({ type: "ball" });
    const from = existingMove?.from ?? sequenceStartPositions.ball;
    setWorkingPositions((prevState) => ({ ...clonePositions(prevState), ball: pos }));
    if (locked) {
      applyPendingMove({
        ...(existingMove ?? {}),
        type: "ball",
        from,
        to: pos,
        curve: null,
        hasBall: false,
      });
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
      if (editingSequenceIndex !== null) {
        const sequence = sequences[editingSequenceIndex];
        const result = await updateSequence(sequence.id, playId, workingPositions, pendingMoves);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setSequences((prev) =>
          prev.map((item, index) =>
            index === editingSequenceIndex
              ? { ...item, positions: clonePositions(workingPositions), moves: pendingMoves }
              : item,
          ),
        );
        setEditingSequenceIndex(null);
        setPendingMoves([]);
        return;
      }

      const orderIndex = sequences.length;
      const result = await saveSequence(playId, orderIndex, workingPositions, pendingMoves);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSequences((prev) => [
        ...prev,
        {
          id: result.sequenceId ?? crypto.randomUUID(),
          order_index: orderIndex,
          positions: clonePositions(workingPositions),
          moves: pendingMoves,
          notes: [],
        },
      ]);
      setPendingMoves([]);
    });
  }

  function handleSelectSequence(index: number) {
    if (isPending) return;
    setError(null);
    setEditingSequenceIndex(index);
    const startPositions = index === 0 ? initialPos : sequences[index - 1].positions;
    const prepared = prepareSequence(sequences[index], startPositions);
    setPendingMoves(prepared.moves);
    setWorkingPositions(prepared.positions);
  }

  function handleNewSequence() {
    if (isPending) return;
    setError(null);
    setEditingSequenceIndex(null);
    setPendingMoves([]);
    const lastPositions = sequences[sequences.length - 1]?.positions ?? initialPos;
    setWorkingPositions(clonePositions(lastPositions));
  }

  function handleUndoLastSequence() {
    const last = sequences[sequences.length - 1];
    if (!last) return;
    setError(null);
    startTransition(async () => {
      await deleteLastSequence(last.id, playId);
      const remaining = sequences.slice(0, -1);
      setSequences(remaining);
      const newBaseline =
        remaining.length > 0 ? remaining[remaining.length - 1].positions : initialPos;
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

  async function handleSaveNote(sequenceId: string) {
    const content = (noteDraft[sequenceId] ?? "").trim();
    if (!content) {
      setNoteError("Escribe un comentario antes de guardarlo.");
      return;
    }
    setNoteError(null);
    setNoteBusy(true);
    const formData = new FormData();
    formData.set("content", content);
    const result = await addSequenceNote(sequenceId, playId, {}, formData);
    setNoteBusy(false);
    if (result?.error) {
      setNoteError(result.error);
      return;
    }
    setSequences((prev) =>
      prev.map((s) =>
        s.id === sequenceId
          ? {
              ...s,
              notes: [
                ...(s.notes ?? []),
                {
                  id: result.noteId ?? crypto.randomUUID(),
                  sequence_id: sequenceId,
                  author_id: currentUserId ?? "",
                  content,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : s,
      ),
    );
    setNoteDraft((prev) => ({ ...prev, [sequenceId]: "" }));
  }

  async function handleDeleteNote(noteId: string) {
    setNoteError(null);
    await deleteSequenceNote(noteId, playId);
    setSequences((prev) =>
      prev.map((s) => ({
        ...s,
        notes: (s.notes ?? []).filter((n) => n.id !== noteId),
      })),
    );
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

      <div className="relative aspect-[21/10] w-full overflow-hidden rounded-lg">
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
      </div>

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
                {editingSequenceIndex === null
                  ? `Guardar secuencia (${sequences.length + 1})`
                  : `Guardar cambios · Secuencia ${editingSequenceIndex + 1}`}
              </Button>
              {editingSequenceIndex !== null && (
                <Button variant="secondary" onClick={handleNewSequence} disabled={isPending}>
                  Nueva secuencia
                </Button>
              )}
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
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold">Secuencias guardadas</h3>
          <div className="grid gap-3">
            {sequences.map((s) => {
              const notes = (s.notes ?? []) as SequenceNote[];
              return (
                <div
                  key={s.id}
                  className={`grid gap-2 rounded-lg border p-3 ${
                    editingSequenceIndex === sequences.indexOf(s) ? "border-primary" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-fit items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={() => handleSelectSequence(sequences.indexOf(s))}
                    aria-label={`Editar secuencia ${s.order_index + 1}`}
                  >
                    <Badge variant="secondary">Secuencia {s.order_index + 1}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {s.moves.length} movimiento{s.moves.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  <div className="grid gap-2">
                    {notes.length > 0 && (
                      <ul className="grid gap-1.5">
                        {notes.map((note) => (
                          <li
                            key={note.id}
                            className="flex items-start justify-between gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm"
                          >
                            <span className="grid gap-0.5">
                              <span className="text-xs font-medium text-muted-foreground">
                                {note.author_name ?? "Entrenador"}
                              </span>
                              <span>{note.content}</span>
                            </span>
                            {note.author_id === currentUserId && (
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-xs text-muted-foreground hover:text-destructive"
                              >
                                Eliminar
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={noteDraft[s.id] ?? ""}
                        onChange={(e) =>
                          setNoteDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        placeholder="Añade un comentario para esta secuencia…"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleSaveNote(s.id)}
                        disabled={noteBusy}
                      >
                        {noteBusy && <Loader2 className="animate-spin" />}
                        Añadir
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {noteError && <p className="text-sm text-destructive">{noteError}</p>}
        </div>
      )}

      {locked && (
        <p className="text-sm text-muted-foreground">
          Arrastra jugadores o el balón para dibujar los movimientos de esta secuencia. Las líneas
          discontinuas indican desplazamiento sin balón; las líneas continuas indican que el jugador
          se desplaza con el balón. Arrastra el punto central de una línea para curvarla.
        </p>
      )}
    </div>
  );
}
