"use client";

import { Circle, Group, Text } from "react-konva";
import type Konva from "konva";

export function PlayerToken({
  x,
  y,
  label,
  color,
  isGoalkeeper,
  draggable,
  onDragMove,
  onDragEnd,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  isGoalkeeper?: boolean;
  draggable?: boolean;
  onDragMove?: (pos: { x: number; y: number }) => void;
  onDragEnd?: (pos: { x: number; y: number }) => void;
}) {
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
        onDragMove?.({ x: e.target.x(), y: e.target.y() })
      }
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) =>
        onDragEnd?.({ x: e.target.x(), y: e.target.y() })
      }
    >
      <Circle
        radius={7}
        fill={color}
        stroke={isGoalkeeper ? "#facc15" : "#0f172a"}
        strokeWidth={isGoalkeeper ? 2 : 1}
        shadowColor="black"
        shadowOpacity={0.35}
        shadowBlur={3}
      />
      <Text
        text={label}
        fontSize={7}
        fill="white"
        width={14}
        height={14}
        align="center"
        verticalAlign="middle"
        offsetX={7}
        offsetY={7}
        listening={false}
      />
    </Group>
  );
}
