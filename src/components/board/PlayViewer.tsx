"use client";

import { TacticalBoard } from "@/components/board/TacticalBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addSequenceNote, deleteSequenceNote } from "@/lib/actions/plays";
import { clonePositions } from "@/lib/futsal/formations";
import type { BoardMove, BoardPoint, BoardPositions } from "@/lib/supabase/database.types";
import { useRef, useState } from "react";

export interface SequenceNote {
  id: string;
  sequence_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

interface Sequence {
  id: string;
  order_index: number;
  positions: BoardPositions;
  moves: BoardMove[];
  notes?: SequenceNote[];
}

function quadraticAt(p0: BoardPoint, control: BoardPoint, p1: BoardPoint, t: number): BoardPoint {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * control.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * control.y + t * t * p1.y,
  };
}

const STEP_DURATION = 900;
const SPEED_OPTIONS = [
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
  { value: "1.5", label: "1.5x" },
  { value: "2", label: "2x" },
];

export function PlayViewer({
  playId,
  initialPositions,
  sequences,
  homeColor,
  awayColor,
  currentUserId,
}: {
  playId: string;
  initialPositions: BoardPositions;
  sequences: Sequence[];
  homeColor: string;
  awayColor: string;
  currentUserId?: string | null;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animatedPositions, setAnimatedPositions] = useState<BoardPositions | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [localSequences, setLocalSequences] = useState<Sequence[]>(sequences);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  speedRef.current = speed;

  const settledPositions =
    currentStep === 0 ? initialPositions : localSequences[currentStep - 1].positions;
  const displayedPositions = animatedPositions ?? settledPositions;

  function animateToStep(targetStep: number): Promise<void> {
    return new Promise((resolve) => {
      const from = currentStep === 0 ? initialPositions : localSequences[currentStep - 1].positions;
      const seq = localSequences[targetStep - 1];
      if (!seq) {
        resolve();
        return;
      }
      const moves = seq.moves;
      const duration = STEP_DURATION / speedRef.current;
      setIsAnimating(true);
      const start = performance.now();

      function frame(now: number) {
        const t = Math.min(1, (now - start) / duration);
        const positions = clonePositions(seq.positions);
        for (const move of moves) {
          const control = move.curve ?? {
            x: (move.from.x + move.to.x) / 2,
            y: (move.from.y + move.to.y) / 2,
          };
          const point = quadraticAt(move.from, control, move.to, t);
          if (move.type === "ball") {
            positions.ball = point;
          } else {
            const arr = move.team === "home" ? positions.home : positions.away;
            const p = arr.find((pl) => pl.id === move.playerId);
            if (p) {
              p.x = point.x;
              p.y = point.y;
            }
          }
        }
        setAnimatedPositions(positions);
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          setIsAnimating(false);
          setAnimatedPositions(null);
          setCurrentStep(targetStep);
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  async function handleNext() {
    if (isAnimating || currentStep >= localSequences.length) return;
    await animateToStep(currentStep + 1);
  }

  function handlePrevious() {
    if (isAnimating || currentStep === 0) return;
    setAnimatedPositions(null);
    setCurrentStep(currentStep - 1);
  }

  function handleRestart() {
    playingRef.current = false;
    setIsPlaying(false);
    setAnimatedPositions(null);
    setCurrentStep(0);
  }

  function jumpToSequence(index: number) {
    if (isAnimating) return;
    playingRef.current = false;
    setIsPlaying(false);
    setAnimatedPositions(null);
    setCurrentStep(index + 1);
  }

  async function handlePlayPause() {
    if (isPlaying) {
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    playingRef.current = true;
    setIsPlaying(true);
    let step = currentStep;
    while (playingRef.current && step < localSequences.length) {
      await animateToStep(step + 1);
      step += 1;
    }
    playingRef.current = false;
    setIsPlaying(false);
  }

  async function handleAddNote() {
    const content = noteDraft.trim();
    if (!content) {
      setNoteError("Escribe un comentario antes de publicarlo.");
      return;
    }
    const activeSequence = localSequences[currentStep - 1];
    if (!activeSequence) {
      setNoteError("Selecciona una secuencia para comentarla.");
      return;
    }
    setNoteError(null);
    setNoteBusy(true);
    const formData = new FormData();
    formData.set("content", content);
    const result = await addSequenceNote(activeSequence.id, playId, {}, formData);
    setNoteBusy(false);
    if (result?.error) {
      setNoteError(result.error);
      return;
    }
    setLocalSequences((prev) =>
      prev.map((s) =>
        s.id === activeSequence.id
          ? {
              ...s,
              notes: [
                ...(s.notes ?? []),
                {
                  id: result.noteId ?? crypto.randomUUID(),
                  sequence_id: s.id,
                  author_id: currentUserId ?? "",
                  content,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : s,
      ),
    );
    setNoteDraft("");
  }

  async function handleDeleteNote(noteId: string) {
    setNoteError(null);
    await deleteSequenceNote(noteId, playId);
    setLocalSequences((prev) =>
      prev.map((s) => ({
        ...s,
        notes: (s.notes ?? []).filter((n) => n.id !== noteId),
      })),
    );
  }

  const activeNotes: SequenceNote[] =
    currentStep > 0 ? (localSequences[currentStep - 1].notes ?? []) : [];

  return (
    <div className="grid w-full gap-5">
      <TacticalBoard positions={displayedPositions} homeColor={homeColor} awayColor={awayColor} />

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={handleRestart} disabled={isAnimating}>
          Reiniciar
        </Button>
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={isAnimating || currentStep === 0}
        >
          Anterior
        </Button>
        <Button onClick={handlePlayPause} disabled={localSequences.length === 0}>
          {isPlaying ? "Pausa" : "Reproducir"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleNext}
          disabled={isAnimating || currentStep >= localSequences.length}
        >
          Siguiente
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <h3 className="text-sm font-semibold">Velocidad</h3>
        <Tabs value={String(speed)} onValueChange={(value) => setSpeed(Number(value))}>
          <TabsList>
            {SPEED_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Secuencias</h3>
        <div className="flex flex-wrap gap-2">
          <Badge
            onClick={() => jumpToSequence(-1)}
            variant={currentStep === 0 ? "default" : "outline"}
            className="cursor-pointer"
          >
            Posición inicial
          </Badge>
          {localSequences.map((s, i) => (
            <Badge
              key={s.id}
              onClick={() => jumpToSequence(i)}
              variant={currentStep === i + 1 ? "default" : "outline"}
              className="cursor-pointer"
            >
              Secuencia {i + 1}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">
          Comentarios {currentStep > 0 ? `· Secuencia ${currentStep}` : ""}
        </h3>
        {currentStep === 0 ? (
          <p className="text-sm text-muted-foreground">
            Selecciona una secuencia para ver y añadir comentarios.
          </p>
        ) : (
          <>
            {activeNotes.length > 0 && (
              <ul className="grid gap-1.5">
                {activeNotes.map((note) => (
                  <li
                    key={note.id}
                    className="flex items-start justify-between gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm"
                  >
                    <span className="grid gap-0.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {note.author_name ?? "Jugador"}
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
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Añade un comentario para esta secuencia…"
              />
              <Button type="button" variant="secondary" onClick={handleAddNote} disabled={noteBusy}>
                Añadir
              </Button>
            </div>
            {noteError && <p className="text-sm text-destructive">{noteError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
