"use client";

import React from "react";
import type { BoardPoint } from "@/lib/supabase/database.types";
import type { PencilTool, DrawingStroke } from "@/components/board/DrawingLayer";
import { COURT_HEIGHT, COURT_WIDTH, GOAL_DEPTH } from "@/lib/futsal/formations";

const COURT_TOTAL_W = COURT_WIDTH + GOAL_DEPTH * 2;

function strokeId(): string {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  // Drag state for markers (pixel coords to match drawing coordinates)
  const dragRef = React.useRef<{
    strokeId: string;
    startPixel: BoardPoint;
    startPos: BoardPoint;
  } | null>(null);

  // Canvas size in CSS pixels
  const canvasW = Math.round(COURT_TOTAL_W * scale);
  const canvasH = Math.round(COURT_HEIGHT * scale);

  // Redraw canvas whenever strokes change
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas internal resolution to match CSS size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw all strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    // Draw temp stroke
    if (tempStroke.current) {
      drawStroke(ctx, tempStroke.current);
    }
  }, [strokes, canvasW, canvasH]);

  function toWorld(clientX: number, clientY: number): BoardPoint {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }

  /** Return raw pixel coords relative to the canvas (matches drawing coordinates). */
  function toPixel(clientX: number, clientY: number): BoardPoint {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function isHitStroke(stroke: DrawingStroke, world: BoardPoint): boolean {
    const threshold = 0.15; // world units
    if (stroke.tool === "player-marker" || stroke.tool === "ball-marker") {
      if (!stroke.position) return false;
      const dx = world.x - stroke.position.x;
      const dy = world.y - stroke.position.y;
      return Math.sqrt(dx * dx + dy * dy) < 10 / scale;
    }
    // For lines / freehand, check distance to any segment
    for (let i = 1; i < stroke.points.length; i++) {
      const a = stroke.points[i - 1];
      const b = stroke.points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((world.x - a.x) * dx + (world.y - a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + t * dx;
      const py = a.y + t * dy;
      const dist = Math.sqrt((world.x - px) ** 2 + (world.y - py) ** 2);
      if (dist < (stroke.width + 6) / scale) return true;
    }
    return false;
  }

  function handlePointerDown(e: React.PointerEvent) {
    const world = toWorld(e.clientX, e.clientY);

    if (activeTool === "eraser") {
      // Find and erase the topmost stroke under the pointer
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (isHitStroke(strokes[i], world)) {
          onStrokesChange(strokes.filter((_, idx) => idx !== i));
          return;
        }
      }
      return;
    }

    // Pointer tool: only drag existing markers, don't create new ones
    if (activeTool === "pointer") {
      const pixel = toPixel(e.clientX, e.clientY);
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        if ((s.tool === "player-marker" || s.tool === "ball-marker") && s.position) {
          const dx = pixel.x - s.position.x;
          const dy = pixel.y - s.position.y;
          if (Math.sqrt(dx * dx + dy * dy) < 10) {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            dragRef.current = {
              strokeId: s.id,
              startPixel: pixel,
              startPos: { ...s.position },
            };
            return;
          }
        }
      }
      return;
    }

    // Marker tools: check if clicking on an existing marker to drag it, otherwise create new
    if (activeTool === "player-marker" || activeTool === "ball-marker") {
      const pixel = toPixel(e.clientX, e.clientY);
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        if ((s.tool === "player-marker" || s.tool === "ball-marker") && s.position) {
          const dx = pixel.x - s.position.x;
          const dy = pixel.y - s.position.y;
          if (Math.sqrt(dx * dx + dy * dy) < 10) {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            dragRef.current = {
              strokeId: s.id,
              startPixel: pixel,
              startPos: { ...s.position },
            };
            return;
          }
        }
      }
    }

    if (activeTool === "player-marker" || activeTool === "ball-marker") {
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

  function handlePointerMove(e: React.PointerEvent) {
    // Handle marker drag (pixel coords → world coords for state)
    if (dragRef.current && onStrokePositionChange) {
      const pixel = toPixel(e.clientX, e.clientY);
      const dx = (pixel.x - dragRef.current.startPixel.x) / scale;
      const dy = (pixel.y - dragRef.current.startPixel.y) / scale;
      const newPos = {
        x: Math.max(0, Math.min(COURT_TOTAL_W, dragRef.current.startPos.x + dx)),
        y: Math.max(0, Math.min(COURT_HEIGHT, dragRef.current.startPos.y + dy)),
      };
      onStrokePositionChange(dragRef.current.strokeId, newPos);
      return;
    }

    if (!drawingRef.current) return;
    const world = toWorld(e.clientX, e.clientY);
    currentPoints.current.push(world);

    if (tempStroke.current) {
      tempStroke.current.points = [...currentPoints.current];
      // Redraw to show temp
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, canvasW, canvasH);
          for (const stroke of strokes) drawStroke(ctx, stroke);
          if (tempStroke.current) drawStroke(ctx, tempStroke.current);
        }
      }
    }
  }

  function handlePointerUp() {
    dragRef.current = null;

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
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
