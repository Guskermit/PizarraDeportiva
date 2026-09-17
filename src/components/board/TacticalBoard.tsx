"use client";

import { BallToken } from "@/components/board/BallToken";
import { DrawingLayer } from "@/components/board/DrawingLayer";
import type { DrawingStroke, PencilTool } from "@/components/board/DrawingLayer";
import { FutsalCourt } from "@/components/board/FutsalCourt";
import { MoveLine } from "@/components/board/MoveLine";
import { PlayerToken } from "@/components/board/PlayerToken";
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
  const drawingRef = useRef(false);
  const currentPoints = useRef<BoardPoint[]>([]);

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

  function getWorldPos(e: any): BoardPoint | null {
    const stageEl = containerRef.current?.querySelector("canvas");
    if (!stageEl) return null;
    const evt = e.evt as MouseEvent | TouchEvent | undefined;
    if (!evt) return null;
    const rect = stageEl.getBoundingClientRect();
    // Extract client coordinates from mouse or touch event
    let clientX: number;
    let clientY: number;
    if ("touches" in evt && evt.touches.length > 0) {
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    } else if ("changedTouches" in evt && evt.changedTouches.length > 0) {
      clientX = evt.changedTouches[0].clientX;
      clientY = evt.changedTouches[0].clientY;
    } else {
      clientX = (evt as MouseEvent).clientX;
      clientY = (evt as MouseEvent).clientY;
    }
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    // Convert from stage pixel coords to world coords (subtract Layer x offset, divide by scale)
    return {
      x: (px - GOAL_DEPTH * scale) / scale,
      y: py / scale,
    };
  }

  function handleStagePointerDown(e: any) {
    if (!pencilMode || !onDrawingStrokesChange) return;
    const world = getWorldPos(e);
    if (!world) return;

    if (activePencilTool === "pointer") return;
    if (activePencilTool === "eraser") return;

    if (activePencilTool === "player-marker" || activePencilTool === "ball-marker") {
      onDrawingStrokesChange([
        ...drawingStrokes,
        {
          id: strokeId(),
          tool: activePencilTool,
          points: [],
          color: activePencilTool === "ball-marker" ? "#ffffff" : pencilColor,
          width: pencilWidth,
          position: world,
        },
      ]);
      return;
    }

    drawingRef.current = true;
    currentPoints.current = [world];
  }

  function handleStagePointerMove(e: any) {
    if (!pencilMode || !drawingRef.current) return;
    const world = getWorldPos(e);
    if (!world) return;
    currentPoints.current.push(world);

    if (activePencilTool === "line" || activePencilTool === "dashed-line") {
      setTempLine({ from: currentPoints.current[0], to: world });
    } else if (activePencilTool === "freehand") {
      setTempFreehand([...currentPoints.current]);
    }
  }

  function handleStagePointerUp() {
    if (!pencilMode || !drawingRef.current || !onDrawingStrokesChange) return;
    drawingRef.current = false;

    const pts = currentPoints.current;
    if (pts.length >= 2) {
      if (activePencilTool === "line" || activePencilTool === "dashed-line") {
        onDrawingStrokesChange([
          ...drawingStrokes,
          {
            id: strokeId(),
            tool: activePencilTool,
            points: [pts[0], pts[pts.length - 1]],
            color: pencilColor,
            width: pencilWidth,
          },
        ]);
      } else if (activePencilTool === "freehand") {
        onDrawingStrokesChange([
          ...drawingStrokes,
          {
            id: strokeId(),
            tool: "freehand",
            points: [...pts],
            color: pencilColor,
            width: pencilWidth,
          },
        ]);
      }
    }

    setTempLine(null);
    setTempFreehand(null);
    currentPoints.current = [];
  }

  function handleEraseStroke(id: string) {
    onDrawingStrokesChange?.(drawingStrokes.filter((s) => s.id !== id));
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        style={pencilMode ? { cursor: activePencilTool === "pointer" ? "default" : "crosshair" } : undefined}
      >
        <Layer x={GOAL_DEPTH}>
          <FutsalCourt courtColor={courtColor} logoUrl={logoUrl} />

          {!pencilMode && moves.map((move, i) => (
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

          {!pencilMode && positions.home.map((p) => (
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
          {!pencilMode && positions.away.map((p) => (
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
              onEraseStroke={handleEraseStroke}
              onStrokePositionChange={onStrokePositionChange}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
