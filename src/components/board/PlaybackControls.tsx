"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GripVertical, Maximize, Minimize, Pause, Play, RotateCcw, SkipBack } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 1, 1.5, 2];

export function PlaybackControls({
  currentStep,
  totalSequences,
  isAnimating,
  isPlaying,
  onRestart,
  onPrevious,
  onNext,
  onPlayPause,
  onSelectStep,
  speed,
  onSpeedChange,
  containerRef,
}: {
  currentStep: number;
  totalSequences: number;
  isAnimating: boolean;
  isPlaying: boolean;
  onRestart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onSelectStep: (step: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState({ x: 12, y: 12 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );

  useEffect(() => {
    function onChange() {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (!fs) {
        const orientation = screen.orientation as ScreenOrientation & {
          unlock?: () => void;
        };
        try {
          orientation.unlock?.();
        } catch {
          // ignore
        }
      }
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current?.requestFullscreen();
      // On mobile/tablet, lock to landscape for a better tactical view.
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (orientation.lock) {
        try {
          await orientation.lock("landscape");
        } catch {
          // ignore (desktop or unsupported)
        }
      }
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const container = containerRef.current;
    const controls = controlsRef.current;
    const maxX = container
      ? Math.max(0, container.clientWidth - (controls?.offsetWidth ?? 56))
      : Number.POSITIVE_INFINITY;
    const maxY = container
      ? Math.max(0, container.clientHeight - (controls?.offsetHeight ?? 56))
      : Number.POSITIVE_INFINITY;
    setPos({
      x: Math.min(Math.max(0, drag.originX + (e.clientX - drag.startX)), maxX),
      y: Math.min(Math.max(0, drag.originY + (e.clientY - drag.startY)), maxY),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  const label =
    currentStep === 0 ? "Posición inicial" : `Secuencia ${currentStep} de ${totalSequences}`;

  return (
    <div
      ref={controlsRef}
      className="playback-controls absolute z-10 flex w-12 flex-col items-center gap-1 rounded-xl border bg-background/50 p-1.5 shadow-lg backdrop-blur"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex w-full cursor-grab touch-none items-center justify-center rounded-md py-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title="Arrastrar el reproductor"
      >
        <GripVertical className="size-4" />
      </div>

      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          title={label}
          className="w-full rounded-md px-0.5 pb-1 text-center text-[10px] font-semibold leading-tight text-foreground transition-colors hover:bg-muted"
        >
          {currentStep}/{totalSequences}
        </button>
        {menuOpen && (
          <div className="absolute left-full top-0 z-20 ml-1 grid min-w-32 gap-0.5 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={() => {
                onSelectStep(0);
                setMenuOpen(false);
              }}
              className={cn(
                "rounded px-2 py-1 text-left text-xs transition-colors",
                currentStep === 0
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              Posición inicial
            </button>
            {Array.from({ length: totalSequences }, (_, i) => i + 1).map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  onSelectStep(step);
                  setMenuOpen(false);
                }}
                className={cn(
                  "rounded px-2 py-1 text-left text-xs transition-colors",
                  currentStep === step
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                Secuencia {step}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRestart}
        disabled={isAnimating}
        title="Reiniciar"
      >
        <RotateCcw />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onPrevious}
        disabled={isAnimating || currentStep === 0}
        title="Volver atrás"
      >
        <SkipBack />
      </Button>
      <Button
        size="icon-sm"
        onClick={onNext}
        disabled={isAnimating || currentStep >= totalSequences}
        title="Reproducir en secuencia"
      >
        <Play />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onPlayPause}
        disabled={totalSequences === 0}
        title={isPlaying ? "Pausa" : "Reproducir todo"}
      >
        {isPlaying ? <Pause /> : <Play />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {isFullscreen ? <Minimize /> : <Maximize />}
      </Button>

      <div className="playback-speed-controls mt-1 flex w-full flex-col items-center gap-0.5 border-t pt-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeedChange(s)}
            title={`Velocidad ${s}x`}
            className={cn(
              "w-full rounded px-1 py-0.5 text-[10px] font-medium transition-colors",
              speed === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}