"use client";

import type { DrawingStroke, PencilTool } from "@/components/board/DrawingLayer";
import { findStrokeAt } from "@/components/board/strokeHit";
import { COURT_HEIGHT, COURT_WIDTH, GOAL_DEPTH } from "@/lib/futsal/formations";
import type { BoardPoint } from "@/lib/supabase/database.types";
import React from "react";

const COURT_TOTAL_W = COURT_WIDTH + GOAL_DEPTH * 2;

function strokeId(): string {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeScale(scale: number): number {
  return scale > 0 && Number.isFinite(scale) ? scale : 1;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawingStroke) {
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (stroke.tool) {
    case "freehand": {
      if (stroke.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();
      break;
    }
    case "line": {
      if (stroke.points.length < 2) break;
      const [from, to] = stroke.points;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      break;
    }
    case "dashed-line": {
      if (stroke.points.length < 2) break;
      const [from, to] = stroke.points;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      break;
    }
    case "player-marker": {
      if (!stroke.position) break;
      ctx.beginPath();
      ctx.arc(stroke.position.x, stroke.position.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case "ball-marker": {
      if (!stroke.position) break;
      ctx.beginPath();
      ctx.arc(stroke.position.x, stroke.position.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,42,0.15)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(stroke.position.x, stroke.position.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export interface DrawingCanvasOverlayProps {
  strokes: DrawingStroke[];
  activeTool: PencilTool;
  color: string;
  strokeWidth: number;
  /** CSS scale = container px / world units */
  scale: number;
  /** Horizontal offset for GOAL_DEPTH margin (in px) */
  offsetX: number;
  onStrokesChange: (strokes: DrawingStroke[]) => void;
  onStrokePositionChange?: (id: string, pos: BoardPoint) => void;
}

export function DrawingCanvasOverlay({
  strokes,
  activeTool,
  color,
  strokeWidth,
  scale,
  offsetX,
  onStrokesChange,
  onStrokePositionChange,
}: DrawingCanvasOverlayProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawingRef = React.useRef(false);
  const currentPoints = React.useRef<BoardPoint[]>([]);
  const tempStroke = React.useRef<DrawingStroke | null>(null);
  const activePointerId = React.useRef<number | null>(null);
  const erasedIds = React.useRef<Set<string>>(new Set());

  // Drag state for markers (world coords, same space as stroke positions)
  const dragRef = React.useRef<{
    strokeId: string;
    startWorld: BoardPoint;
    startPos: BoardPoint;
  } | null>(null);

  // Canvas size in CSS pixels
  const canvasW = Math.round(COURT_TOTAL_W * scale);
  const canvasH = Math.round(COURT_HEIGHT * scale);

  /**
   * Prepare the context for drawing in world units: the transform maps one
   * world unit to `scale` CSS pixels and then to device pixels (DPR).
   * Without the scale factor strokes are drawn at the wrong position
   * whenever the board is not rendered 1:1.
   */
  function beginDraw(): CanvasRenderingContext2D | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const dpr = window.devicePixelRatio || 1;
    const s = safeScale(scale);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    ctx.clearRect(0, 0, COURT_TOTAL_W, COURT_HEIGHT);
    return ctx;
  }

  function paint() {
    const ctx = beginDraw();
    if (!ctx) return;
    for (const stroke of strokes) drawStroke(ctx, stroke);
    if (tempStroke.current) drawStroke(ctx, tempStroke.current);
  }

  // Redraw canvas whenever strokes change
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const bitmapW = Math.max(1, Math.round(canvasW * dpr));
    const bitmapH = Math.max(1, Math.round(canvasH * dpr));
    if (canvas.width !== bitmapW) canvas.width = bitmapW;
    if (canvas.height !== bitmapH) canvas.height = bitmapH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = safeScale(scale);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    ctx.clearRect(0, 0, COURT_TOTAL_W, COURT_HEIGHT);
    for (const stroke of strokes) drawStroke(ctx, stroke);
    if (tempStroke.current) drawStroke(ctx, tempStroke.current);
  }, [strokes, canvasW, canvasH, scale]);

  function toWorld(clientX: number, clientY: number): BoardPoint {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const s = safeScale(scale);
    return {
      x: (clientX - rect.left) / s,
      y: (clientY - rect.top) / s,
    };
  }

  /** Start tracking this pointer. Ignores extra fingers (palm rejection / multi-touch). */
  function trackPointer(e: React.PointerEvent<HTMLCanvasElement>): boolean {
    if (activePointerId.current !== null || !e.isPrimary) return false;
    activePointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort; pointerleave still ends the stroke.
    }
    return true;
  }

  function isTracking(e: React.PointerEvent<HTMLCanvasElement>): boolean {
    return activePointerId.current === e.pointerId;
  }

  function releasePointer(e: React.PointerEvent<HTMLCanvasElement>) {
    activePointerId.current = null;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore: the pointer may already be gone.
    }
  }

  function eraseAt(world: BoardPoint) {
    const base = strokes.filter((s) => !erasedIds.current.has(s.id));
    const hit = findStrokeAt(base, world, scale);
    if (!hit) return;
    erasedIds.current.add(hit.id);
    onStrokesChange(base.filter((s) => s.id !== hit.id));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!trackPointer(e)) return;
    const world = toWorld(e.clientX, e.clientY);

    if (activeTool === "eraser") {
      erasedIds.current = new Set();
      eraseAt(world);
      return;
    }

    const isMarkerTool = activeTool === "player-marker" || activeTool === "ball-marker";

    // Pointer tool: only drag existing markers, don't create new ones
    // Marker tools: drag an existing marker when tapping on it, otherwise create a new one
    if (activeTool === "pointer" || isMarkerTool) {
      const hit = findStrokeAt(strokes, world, scale, { markersOnly: true });
      if (hit?.position) {
        dragRef.current = {
          strokeId: hit.id,
          startWorld: world,
          startPos: { ...hit.position },
        };
        return;
      }
      if (activeTool === "pointer") return;
      onStrokesChange([
        ...strokes,
        {
          id: strokeId(),
          tool: activeTool,
          points: [],
          color: activeTool === "ball-marker" ? "#ffffff" : color,
          width: strokeWidth,
          position: world,
        },
      ]);
      return;
    }

    // Start drawing (freehand / line / dashed-line)
    drawingRef.current = true;
    currentPoints.current = [world];
    tempStroke.current = {
      id: "temp",
      tool: activeTool,
      points: [world],
      color,
      width: strokeWidth,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isTracking(e)) return;

    // Handle marker drag (world coords → world coords for state)
    if (dragRef.current && onStrokePositionChange) {
      const world = toWorld(e.clientX, e.clientY);
      const drag = dragRef.current;
      onStrokePositionChange(drag.strokeId, {
        x: clamp(drag.startPos.x + (world.x - drag.startWorld.x), 0, COURT_TOTAL_W),
        y: clamp(drag.startPos.y + (world.y - drag.startWorld.y), 0, COURT_HEIGHT),
      });
      return;
    }

    if (activeTool === "eraser") {
      eraseAt(toWorld(e.clientX, e.clientY));
      return;
    }

    if (!drawingRef.current) return;
    const world = toWorld(e.clientX, e.clientY);
    currentPoints.current.push(world);

    if (tempStroke.current) {
      tempStroke.current.points = [...currentPoints.current];
      paint();
    }
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isTracking(e)) return;
    releasePointer(e);
    dragRef.current = null;
    erasedIds.current = new Set();

    if (!drawingRef.current) return;
    drawingRef.current = false;

    const pts = currentPoints.current;
    if (pts.length >= 2 && tempStroke.current) {
      if (activeTool === "line" || activeTool === "dashed-line") {
        onStrokesChange([
          ...strokes,
          {
            id: strokeId(),
            tool: activeTool,
            points: [pts[0], pts[pts.length - 1]],
            color,
            width: strokeWidth,
          },
        ]);
      } else {
        onStrokesChange([
          ...strokes,
          {
            id: strokeId(),
            tool: "freehand",
            points: [...pts],
            color,
            width: strokeWidth,
          },
        ]);
      }
    }

    tempStroke.current = null;
    currentPoints.current = [];
  }

  const cursorStyle =
    activeTool === "eraser"
      ? "crosshair"
      : activeTool === "pointer"
        ? "grab"
        : activeTool === "player-marker" || activeTool === "ball-marker"
          ? "copy"
          : "crosshair";

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 touch-none"
      style={{
        width: canvasW,
        height: canvasH,
        pointerEvents: "auto",
        cursor: cursorStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
    />
  );
}
