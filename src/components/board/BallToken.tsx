"use client";

import { Circle, Group } from "react-konva";
import type Konva from "konva";

export function BallToken({
  x,
  y,
  draggable,
  onDragEnd,
}: {
  x: number;
  y: number;
  draggable?: boolean;
  onDragEnd?: (pos: { x: number; y: number }) => void;
}) {
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) =>
        onDragEnd?.({ x: e.target.x(), y: e.target.y() })
      }
    >
      <Circle radius={4} fill="#ffffff" stroke="#0f172a" strokeWidth={1} shadowBlur={2} />
    </Group>
  );
}
