"use client";

import { CommentOverlay } from "@/components/board/CommentOverlay";
import { PlaybackControls } from "@/components/board/PlaybackControls";
import { Button } from "@/components/ui/button";
import { clonePositions } from "@/lib/futsal/formations";
import type { BoardMove, BoardPoint, BoardPositions } from "@/lib/supabase/database.types";
import { Maximize, Minimize, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const TacticalBoard = dynamic(
  () => import("@/components/board/TacticalBoard").then((m) => m.TacticalBoard),
  { ssr: false },
);

/* ── Types ──────────────────────────────────────────────────────────── */

export interface LoopNote {
  id: string;
  sequence_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export interface LoopSequence {
  id: string;
  order_index: number;
  positions: BoardPositions;
  moves: BoardMove[];
  notes?: LoopNote[];
}

export interface LoopPlay {
  id: string;
  title: string;
  initial_positions: BoardPositions;
  sequences: LoopSequence[];
  home_color: string;
  away_color: string;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

const STEP_MS = 900;
const TITLE_WAIT_MS = 3000;

function quadraticAt(
  p0: BoardPoint,
  ctrl: BoardPoint,
  p1: BoardPoint,
  t: number,
): BoardPoint {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * ctrl.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * ctrl.y + t * t * p1.y,
  };
}

/* ── Component ──────────────────────────────────────────────────────── */

export function PlayLoopPlayer({
  plays,
  startIndex = 0,
  courtColor,
  logoUrl,
  onClose,
}: {
  plays: LoopPlay[];
  startIndex?: number;
  courtColor?: string;
  logoUrl?: string | null;
  onClose: () => void;
}) {
  const [currentPlay, setCurrentPlay] = useState(startIndex);
  const [step, setStep] = useState(0); // 0 = title, 1..N = sequence
  const [positions, setPositions] = useState<BoardPositions | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loopRef = useRef(false);
  const speedRef = useRef(speed);
  const playIndexRef = useRef(currentPlay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Keep playIndexRef in sync.
  playIndexRef.current = currentPlay;

  speedRef.current = speed;

  const play = plays[currentPlay];
  const seqs = play?.sequences ?? [];
  const displayed = positions ?? (step > 0 ? seqs[step - 1]?.positions : play?.initial_positions);

  /* ── Fullscreen tracking ─────────────────────────────────────────── */

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await boardRef.current?.requestFullscreen();
    }
  }

  /* ── Cleanup timers ──────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      loopRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  /* ── Animation ───────────────────────────────────────────────────── */

  const animateStep = useCallback(
    (from: BoardPositions, seq: LoopSequence): Promise<void> =>
      new Promise((resolve) => {
        const duration = STEP_MS / speedRef.current;
        setIsAnimating(true);
        const start = performance.now();

        function frame(now: number) {
          const t = Math.min(1, (now - start) / duration);
          const pos = clonePositions(seq.positions);
          for (const m of seq.moves) {
            const ctrl = m.curve ?? {
              x: (m.from.x + m.to.x) / 2,
              y: (m.from.y + m.to.y) / 2,
            };
            const pt = quadraticAt(m.from, ctrl, m.to, t);
            if (m.type === "ball") {
              pos.ball = pt;
            } else {
              const arr = m.team === "home" ? pos.home : pos.away;
              const pl = arr.find((p) => p.id === m.playerId);
              if (pl) { pl.x = pt.x; pl.y = pt.y; }
            }
          }
          setPositions(pos);
          if (t < 1) {
            requestAnimationFrame(frame);
          } else {
            setIsAnimating(false);
            setPositions(null);
            resolve();
          }
        }
        requestAnimationFrame(frame);
      }),
    [],
  );

  /* ── Playback controls ───────────────────────────────────────────── */

  function clearTimers() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countRef.current) { clearInterval(countRef.current); countRef.current = null; }
  }

  /** Wait N seconds showing the title card, resolved when done. */
  function waitWithTitle(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      let remaining = seconds;
      setCountdown(remaining);
      countRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countRef.current) clearInterval(countRef.current);
          countRef.current = null;
          setCountdown(null);
          resolve();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    });
  }

  /** Animate all sequences of a single play. Returns when done or paused. */
  async function animatePlay(p: LoopPlay) {
    const allSeqs = p.sequences;
    let from = p.initial_positions;
    for (let i = 0; i < allSeqs.length; i++) {
      if (!loopRef.current) return;
      // Pre-set positions to the starting state BEFORE advancing step.
      // This prevents a flash where displayed falls back to seqs[i].positions
      // (the destination) because positions is still null during the re-render.
      setPositions(clonePositions(from));
      setStep(i + 1);
      await animateStep(from, allSeqs[i]);
      from = allSeqs[i].positions;
    }
  }

  /**
   * Master loop: for each play → show title → animate sequences → next.
   * Wraps around infinitely until paused.
   */
  async function runLoop(startIndex: number) {
    let idx = startIndex;
    let isFirst = true;
    while (loopRef.current) {
      const p = plays[idx];
      if (!p) break;

      // Set the current play (triggers re-render with new board data).
      setCurrentPlay(idx);

      // Show title card before every play (including the first).
      if (isFirst) {
        // First title: show briefly then start.
        await waitWithTitle(Math.ceil(TITLE_WAIT_MS / 1000));
        isFirst = false;
      } else {
        await waitWithTitle(Math.ceil(TITLE_WAIT_MS / 1000));
      }

      if (!loopRef.current) return;

      // Animate all sequences of this play.
      await animatePlay(p);

      if (!loopRef.current) return;

      // Move to the next play. setCurrentPlay must happen first so that
      // the board renders the new play's initial positions immediately
      // (the title card covers it, hiding any brief transition).
      idx = (idx + 1) % plays.length;
      setCurrentPlay(idx);
      setStep(0);
      setPositions(null);
    }
  }

  /** Start or pause the loop. */
  function handlePlayPause() {
    if (isPlaying) {
      loopRef.current = false;
      setIsPlaying(false);
      clearTimers();
      setCountdown(null);
      return;
    }
    loopRef.current = true;
    setIsPlaying(true);
    setCountdown(null);
    runLoop(playIndexRef.current);
  }

  // Auto-start the loop as soon as the component mounts.
  useEffect(() => {
    loopRef.current = true;
    setIsPlaying(true);
    runLoop(0);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRestart() {
    loopRef.current = false;
    setIsPlaying(false);
    clearTimers();
    setCountdown(null);
    setStep(0);
    setPositions(null);
  }

  function handlePrevious() {
    if (isAnimating) return;
    clearTimers();
    setCountdown(null);
    loopRef.current = false;
    setIsPlaying(false);
    if (step > 1) {
      setStep(step - 1);
    } else {
      // Go to title
      setStep(0);
    }
    setPositions(null);
  }

  function handleNext() {
    if (isAnimating) return;
    const p = plays[playIndexRef.current];
    const allSeqs = p?.sequences ?? [];
    if (step >= allSeqs.length) return;
    clearTimers();
    setCountdown(null);
    loopRef.current = false;
    setIsPlaying(false);
    const from = step === 0 ? p?.initial_positions : allSeqs[step - 1]?.positions;
    if (!from || !allSeqs[step]) return;
    animateStep(from, allSeqs[step]).then(() => {
      setStep(step + 1);
    });
  }

  function jumpToStep(idx: number) {
    if (isAnimating) return;
    clearTimers();
    setCountdown(null);
    loopRef.current = false;
    setIsPlaying(false);
    setPositions(null);
    setStep(idx + 1);
  }

  function selectPlay(index: number) {
    if (isAnimating) return;
    clearTimers();
    setCountdown(null);
    loopRef.current = false;
    setIsPlaying(false);
    setCurrentPlay(index);
    setStep(0);
    setPositions(null);
  }

  /* ── Keyboard shortcuts ──────────────────────────────────────────── */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isPlaying) {
          handlePlayPause();
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isPlaying]);

  if (!play) return null;

  /* ── Active notes for current step ───────────────────────────────── */

  const activeNotes: LoopNote[] =
    step > 0 ? (seqs[step - 1]?.notes ?? []) : [];

  /* ── Render ──────────────────────────────────────────────────────── */

  const showTitle = step === 0 && countdown !== null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Cerrar reproductor"
            aria-label="Cerrar reproductor"
          >
            <X />
          </Button>
          <h1 className="truncate text-sm font-semibold sm:text-base">
            Bucle de jugadas
          </h1>
          <span className="text-xs text-muted-foreground">
            {currentPlay + 1}/{plays.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </header>

      {/* Board area */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-5">
        <div ref={boardRef} className="play-viewer-shell relative aspect-[21/10] w-full overflow-hidden rounded-lg">
          {showTitle && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
              <h2 className="mb-3 text-center text-3xl font-bold sm:text-5xl">
                {play.title}
              </h2>
              <p className="text-lg text-muted-foreground">
                {currentPlay + 1} / {plays.length}
              </p>
            </div>
          )}

          {!showTitle && displayed && (
            <TacticalBoard
              positions={displayed}
              homeColor={play.home_color}
              awayColor={play.away_color}
              courtColor={courtColor}
              logoUrl={logoUrl}
            />
          )}

          <PlaybackControls
            currentStep={step}
            totalSequences={seqs.length}
            isAnimating={isAnimating}
            isPlaying={isPlaying}
            onRestart={handleRestart}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onPlayPause={handlePlayPause}
            onSelectStep={jumpToStep}
            speed={speed}
            onSpeedChange={setSpeed}
            containerRef={boardRef}
          />

          {!showTitle && (
            <CommentOverlay
              containerRef={boardRef}
              title={`Comentarios${step > 0 ? ` · Seq ${step}` : ""}`}
            >
              {activeNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {step === 0
                    ? "Inicia la reproducción para ver los comentarios."
                    : "Sin comentarios en esta secuencia."}
                </p>
              ) : (
                <ul className="grid gap-1.5">
                  {activeNotes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-md bg-muted px-2.5 py-1.5 text-sm"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {n.author_name ?? "Jugador"}
                      </span>
                      <span className="ml-1">{n.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CommentOverlay>
          )}
        </div>

        {/* Play selector strip */}
        {plays.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-background/90 p-1.5 shadow-lg backdrop-blur sm:bottom-5">
            {plays.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPlay(i)}
                className={`max-w-[8rem] truncate rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  i === currentPlay
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                title={p.title}
              >
                {p.title}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
