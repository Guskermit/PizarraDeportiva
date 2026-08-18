"use client";

import { Shape, Circle } from "react-konva";
import type Konva from "konva";
import type { BoardPoint } from "@/lib/supabase/database.types";

export function midpoint(a: BoardPoint, b: BoardPoint): BoardPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function MoveLine({
  from,
  to,
  curve,
  solid,
  color = "#facc15",
  interactive,
  onCurveChange,
}: {
  from: BoardPoint;
  to: BoardPoint;
  curve: BoardPoint | null;
  solid: boolean;
  color?: string;
  interactive?: boolean;
  onCurveChange?: (point: BoardPoint) => void;
}) {
  const control = curve ?? midpoint(from, to);

  return (
    <>
      <Shape
        sceneFunc={(ctx: Konva.Context, shape: Konva.Shape) => {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
          ctx.fillStrokeShape(shape);
        }}
        stroke={color}
        strokeWidth={1.5}
        dash={solid ? undefined : [4, 3]}
        listening={false}
      />
      {interactive && (
        <Circle
          x={control.x}
          y={control.y}
          radius={3}
          fill={color}
          opacity={0.85}
          draggable
          onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
            onCurveChange?.({ x: e.target.x(), y: e.target.y() })
          }
        />
      )}
    </>
  );
}
