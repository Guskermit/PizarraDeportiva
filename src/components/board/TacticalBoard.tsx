"use client";

import { BallToken } from "@/components/board/BallToken";
import { DrawingLayer } from "@/components/board/DrawingLayer";
import type { DrawingStroke, PencilTool } from "@/components/board/DrawingLayer";
import { FutsalCourt } from "@/components/board/FutsalCourt";
import { MoveLine } from "@/components/board/MoveLine";
import { PlayerToken } from "@/components/board/PlayerToken";
import { findStrokeAt } from "@/components/board/strokeHit";
import { COURT_HEIGHT, COURT_WIDTH, GOAL_DEPTH } from "@/lib/futsal/formations";
import type { BoardMove, BoardPoint, BoardPositions } from "@/lib/supabase/database.types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Layer, Stage } from "react-konva";

export interface TacticalBoardProps {
  positions: BoardPositions;
  moves?: BoardMove[];
  homeColor: string;
  awayColor: string;
  courtColor?: string;
  logoUrl?: string | null;
  interactivePlayers?: boolean;
  interactiveBall?: boolean;
  interactiveCurves?: boolean;
  onPlayerDragEnd?: (team: "home" | "away", playerId: string, pos: BoardPoint) => void;
  onBallDragEnd?: (pos: BoardPoint) => void;
  onCurveChange?: (moveIndex: number, point: BoardPoint) => void;
  // Pencil mode props
  pencilMode?: boolean;
  drawingStrokes?: DrawingStroke[];
  activePencilTool?: PencilTool;
  pencilColor?: string;
  pencilWidth?: number;
  onDrawingStrokesChange?: (strokes: DrawingStroke[]) => void;
  onStrokePositionChange?: (id: string, pos: BoardPoint) => void;
}

function strokeId(): string {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeScale(scale: number): number {
  return scale > 0 && Number.isFinite(scale) ? scale : 1;
}

export function TacticalBoard({
  positions,
  moves = [],
  homeColor,
  awayColor,
  courtColor,
  logoUrl,
  interactivePlayers,
  interactiveBall,
  interactiveCurves,
  onPlayerDragEnd,
  onBallDragEnd,
  onCurveChange,
  pencilMode = false,
  drawingStrokes = [],
  activePencilTool = "freehand",
  pencilColor = "#ef4444",
  pencilWidth = 2,
  onDrawingStrokesChange,
  onStrokePositionChange,
}: TacticalBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: COURT_WIDTH * 2, height: COURT_HEIGHT });

  const [tempLine, setTempLine] = useState<{ from: BoardPoint; to: BoardPoint } | null>(null);
  const [tempFreehand, setTempFreehand] = useState<BoardPoint[] | null>(null);

  // Latest values for the imperative pointer handlers (bound once per pencil mode).
  const scaleRef = useRef(1);
  const toolRef = useRef<PencilTool>(activePencilTool);
  const colorRef = useRef(pencilColor);
  const widthRef = useRef(pencilWidth);
  const strokesRef = useRef<DrawingStroke[]>(drawingStrokes);
  const strokesChangeRef = useRef(onDrawingStrokesChange);
  const positionChangeRef = useRef(onStrokePositionChange);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) setSize({ width: el.clientWidth, height: el.clientHeight });
  }, []);

  // Sync cursor on the Konva canvas container (Konva manages cursor on the canvas, not the div)
  useEffect(() => {
    if (!pencilMode) return;
    const canvasEl = containerRef.current?.querySelector("canvas");
    const stageContainer = canvasEl?.parentElement;
    if (stageContainer) {
      stageContainer.style.cursor = activePencilTool === "pointer" ? "default" : "crosshair";
    }
  }, [pencilMode, activePencilTool]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);

    function onFullscreenChange() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (el) setSize({ width: el.clientWidth, height: el.clientHeight });
        });
      });
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const scale = Math.min(
    size.width / (COURT_WIDTH + GOAL_DEPTH * 2),
    size.height > 0 ? size.height / COURT_HEIGHT : Number.POSITIVE_INFINITY,
  );
  const width = (COURT_WIDTH + GOAL_DEPTH * 2) * scale;
  const height = COURT_HEIGHT * scale;

  // Keep refs in sync on every render so the bound handlers always read fresh values.
  useEffect(() => {
    scaleRef.current = scale;
    toolRef.current = activePencilTool;
    colorRef.current = pencilColor;
    widthRef.current = pencilWidth;
    strokesRef.current = drawingStrokes;
    strokesChangeRef.current = onDrawingStrokesChange;
    positionChangeRef.current = onStrokePositionChange;
  });

  // Drawing input: standard Pointer Events attached directly to the stage canvas.
  // This works identically in every browser (no mouse/touch duality, no canvas
  // hit-detection readback) and survives multi-touch and pointers leaving the court.
  useEffect(() => {
    if (!pencilMode || !onDrawingStrokesChange) return;
    const container = containerRef.current;
    if (!container) return;
    const stageEl = container.querySelector<HTMLCanvasElement>("canvas");
    const el: HTMLElement = stageEl ?? container;
    el.style.touchAction = "none";

    let activePointerId: number | null = null;
    let isDrawing = false;
    let erased: Set<string> = new Set();
    const points: BoardPoint[] = [];

    function toWorld(e: PointerEvent): BoardPoint {
      const target = el.querySelector<HTMLCanvasElement>("canvas") ?? el;
      const rect = target.getBoundingClientRect();
      const s = safeScale(scaleRef.current);
      return {
        x: (e.clientX - rect.left - GOAL_DEPTH * s) / s,
        y: (e.clientY - rect.top) / s,
      };
    }

    function eraseAt(world: BoardPoint) {
      const change = strokesChangeRef.current;
      if (!change) return;
      const base = strokesRef.current.filter((s) => !erased.has(s.id));
      const hit = findStrokeAt(base, world, scaleRef.current);
      if (!hit) return;
      erased.add(hit.id);
      change(base.filter((s) => s.id !== hit.id));
    }

    function onPointerDown(e: PointerEvent) {
      if (activePointerId !== null || !e.isPrimary || e.button > 0) return;
      const tool = toolRef.current;
      // "pointer" keeps Konva's own drag & drop for markers.
      if (tool === "pointer") return;

      activePointerId = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture is best-effort.
      }
      const world = toWorld(e);

      if (tool === "eraser") {
        erased = new Set();
        eraseAt(world);
        return;
      }

      if (tool === "player-marker" || tool === "ball-marker") {
        const change = strokesChangeRef.current;
        change?.([
          ...strokesRef.current,
          {
            id: strokeId(),
            tool,
            points: [],
            color: tool === "ball-marker" ? "#ffffff" : colorRef.current,
            width: widthRef.current,
            position: world,
          },
        ]);
        return;
      }

      // freehand / line / dashed-line
      isDrawing = true;
      points.length = 0;
      points.push(world);
    }

    function onPointerMove(e: PointerEvent) {
      if (activePointerId !== e.pointerId) return;
      const tool = toolRef.current;
      const world = toWorld(e);

      if (tool === "eraser") {
        eraseAt(world);
        return;
      }
      if (!isDrawing) return;

      points.push(world);
      if (tool === "line" || tool === "dashed-line") {
        setTempLine({ from: points[0], to: world });
      } else {
        setTempFreehand([...points]);
      }
    }

    function finishGesture() {
      isDrawing = false;
      erased = new Set();
      points.length = 0;
      setTempLine(null);
      setTempFreehand(null);
    }

    function onPointerEnd(e: PointerEvent) {
      if (activePointerId !== e.pointerId) return;
      activePointerId = null;
      try {
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      } catch {
        // The pointer may already be gone.
      }

      if (isDrawing) {
        const tool = toolRef.current;
        const pts = [...points];
        finishGesture();
        if (pts.length >= 2) {
          const change = strokesChangeRef.current;
          change?.([
            ...strokesRef.current,
            tool === "line" || tool === "dashed-line"
              ? {
                  id: strokeId(),
                  tool,
                  points: [pts[0], pts[pts.length - 1]],
                  color: colorRef.current,
                  width: widthRef.current,
                }
              : {
                  id: strokeId(),
                  tool: "freehand",
                  points: pts,
                  color: colorRef.current,
                  width: widthRef.current,
                },
          ]);
        }
        return;
      }

      finishGesture();
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      if (el.style.touchAction === "none") el.style.touchAction = "";
      finishGesture();
    };
  }, [pencilMode, onDrawingStrokesChange]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        style={
          pencilMode
            ? { cursor: activePencilTool === "pointer" ? "default" : "crosshair" }
            : undefined
        }
      >
        <Layer x={GOAL_DEPTH}>
          <FutsalCourt courtColor={courtColor} logoUrl={logoUrl} />

          {!pencilMode &&
            moves.map((move, i) => (
              <MoveLine
                key={i}
                from={move.from}
                to={move.to}
                curve={move.curve}
                solid={move.hasBall}
                color={
                  move.type === "ball" ? "#e2e8f0" : move.team === "home" ? homeColor : awayColor
                }
                interactive={interactiveCurves}
                onCurveChange={(point) => onCurveChange?.(i, point)}
              />
            ))}

          {!pencilMode &&
            positions.home.map((p) => (
              <PlayerToken
                key={p.id}
                x={p.x}
                y={p.y}
                label={p.label}
                color={homeColor}
                isGoalkeeper={p.isGoalkeeper}
                draggable={interactivePlayers}
                onDragEnd={(pos) => onPlayerDragEnd?.("home", p.id, pos)}
              />
            ))}
          {!pencilMode &&
            positions.away.map((p) => (
              <PlayerToken
                key={p.id}
                x={p.x}
                y={p.y}
                label={p.label}
                color={awayColor}
                isGoalkeeper={p.isGoalkeeper}
                draggable={interactivePlayers}
                onDragEnd={(pos) => onPlayerDragEnd?.("away", p.id, pos)}
              />
            ))}

          {!pencilMode && (
            <BallToken
              x={positions.ball.x}
              y={positions.ball.y}
              draggable={interactiveBall}
              onDragEnd={(pos) => onBallDragEnd?.(pos)}
            />
          )}

          {pencilMode && (
            <DrawingLayer
              strokes={drawingStrokes}
              activeTool={activePencilTool}
              tempLine={tempLine}
              tempFreehand={tempFreehand}
              onStrokePositionChange={onStrokePositionChange}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
