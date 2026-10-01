"use client";

import type { BoardPoint } from "@/lib/supabase/database.types";
import type Konva from "konva";
import React from "react";
import { Circle, Group, Line } from "react-konva";

export type PencilTool =
  | "pointer"
  | "freehand"
  | "line"
  | "dashed-line"
  | "player-marker"
  | "ball-marker"
  | "eraser";

export interface DrawingStroke {
  id: string;
  tool: PencilTool;
  points: BoardPoint[];
  color: string;
  width: number;
  position?: BoardPoint;
}

function StrokeRenderer({
  stroke,
  draggable,
  onPositionChange,
}: {
  stroke: DrawingStroke;
  draggable?: boolean;
  onPositionChange?: (id: string, pos: BoardPoint) => void;
}) {
  const isMarker = stroke.tool === "player-marker" || stroke.tool === "ball-marker";

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    if (!isMarker || !onPositionChange) return;
    onPositionChange(stroke.id, { x: e.target.x(), y: e.target.y() });
  }

  switch (stroke.tool) {
    case "freehand": {
      if (stroke.points.length < 2) return null;
      const flat = stroke.points.flatMap((p) => [p.x, p.y]);
      return (
        <Line
          points={flat}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          listening={false}
        />
      );
    }
    case "line":
    case "dashed-line": {
      if (stroke.points.length < 2) return null;
      const [from, to] = stroke.points;
      return (
        <Line
          points={[from.x, from.y, to.x, to.y]}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          lineCap="round"
          dash={stroke.tool === "dashed-line" ? [6, 4] : undefined}
          listening={false}
        />
      );
    }
    case "player-marker": {
      if (!stroke.position) return null;
      return (
        <Group
          x={stroke.position.x}
          y={stroke.position.y}
          draggable={draggable}
          onDragEnd={handleDragEnd}
          cursor={draggable ? "grab" : undefined}
        >
          <Circle
            radius={7}
            fill={stroke.color}
            stroke="#0f172a"
            strokeWidth={1}
            shadowColor="black"
            shadowOpacity={0.35}
            shadowBlur={3}
          />
        </Group>
      );
    }
    case "ball-marker": {
      if (!stroke.position) return null;
      return (
        <Group
          x={stroke.position.x}
          y={stroke.position.y}
          draggable={draggable}
          onDragEnd={handleDragEnd}
          cursor={draggable ? "grab" : undefined}
        >
          <Circle radius={5} fill="rgba(15,23,42,0.15)" />
          <Circle radius={3.5} fill="#ffffff" stroke="#0f172a" strokeWidth={1} />
        </Group>
      );
    }
    default:
      return null;
  }
}

export interface DrawingLayerProps {
  strokes: DrawingStroke[];
  activeTool: PencilTool;
  tempLine?: { from: BoardPoint; to: BoardPoint } | null;
  tempFreehand?: BoardPoint[] | null;
  onStrokePositionChange?: (id: string, pos: BoardPoint) => void;
}

export function DrawingLayer({
  strokes,
  activeTool,
  tempLine,
  tempFreehand,
  onStrokePositionChange,
}: DrawingLayerProps) {
  return (
    <>
      {/* Completed strokes */}
      {strokes.map((stroke) => (
        <StrokeRenderer
          key={stroke.id}
          stroke={stroke}
          draggable={activeTool === "pointer"}
          onPositionChange={onStrokePositionChange}
        />
      ))}

      {/* Temp line preview */}
      {tempLine && (activeTool === "line" || activeTool === "dashed-line") && (
        <Line
          points={[tempLine.from.x, tempLine.from.y, tempLine.to.x, tempLine.to.y]}
          stroke={strokes.length > 0 ? strokes[0].color : "#ffffff"}
          strokeWidth={strokes.length > 0 ? strokes[0].width : 2}
          lineCap="round"
          dash={activeTool === "dashed-line" ? [6, 4] : undefined}
          listening={false}
        />
      )}

      {/* Temp freehand preview */}
      {tempFreehand && activeTool === "freehand" && tempFreehand.length >= 2 && (
        <Line
          points={tempFreehand.flatMap((p) => [p.x, p.y])}
          stroke={strokes.length > 0 ? strokes[0].color : "#ffffff"}
          strokeWidth={strokes.length > 0 ? strokes[0].width : 2}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          listening={false}
        />
      )}
    </>
  );
}
