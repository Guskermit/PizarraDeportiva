"use client";

import { useRef, useState } from "react";
import { TacticalBoard } from "@/components/board/TacticalBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clonePositions } from "@/lib/futsal/formations";
import type { BoardPoint, BoardPositions, BoardMove } from "@/lib/supabase/database.types";

interface Sequence {
  id: string;
  order_index: number;
  positions: BoardPositions;
  moves: BoardMove[];
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
  initialPositions,
  sequences,
  homeColor,
  awayColor,
}: {
  initialPositions: BoardPositions;
  sequences: Sequence[];
  homeColor: string;
  awayColor: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animatedPositions, setAnimatedPositions] = useState<BoardPositions | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  speedRef.current = speed;

  const settledPositions =
    currentStep === 0 ? initialPositions : sequences[currentStep - 1].positions;
  const displayedPositions = animatedPositions ?? settledPositions;

  function animateToStep(targetStep: number): Promise<void> {
    return new Promise((resolve) => {
      const from = currentStep === 0 ? initialPositions : sequences[currentStep - 1].positions;
      const seq = sequences[targetStep - 1];
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
    if (isAnimating || currentStep >= sequences.length) return;
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
    while (playingRef.current && step < sequences.length) {
      await animateToStep(step + 1);
      step += 1;
    }
    playingRef.current = false;
    setIsPlaying(false);
  }

  return (
    <div className="grid w-full gap-5">
      <TacticalBoard
        positions={displayedPositions}
        homeColor={homeColor}
        awayColor={awayColor}
      />

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={handleRestart} disabled={isAnimating}>
          Reiniciar
        </Button>
        <Button variant="secondary" onClick={handlePrevious} disabled={isAnimating || currentStep === 0}>
          Anterior
        </Button>
        <Button onClick={handlePlayPause} disabled={sequences.length === 0}>
          {isPlaying ? "Pausa" : "Reproducir"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleNext}
          disabled={isAnimating || currentStep >= sequences.length}
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
          {sequences.map((s, i) => (
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
    </div>
  );
}
