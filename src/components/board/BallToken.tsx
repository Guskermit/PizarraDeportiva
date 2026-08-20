"use client";

import { useEffect, useState } from "react";
import { Circle, Group, Image as KonvaImage } from "react-konva";
import type Konva from "konva";

const BALL_SIZE = 18;

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
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "/images/ball.png";
    img.onload = () => setImage(img);
  }, []);

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) =>
        onDragEnd?.({ x: e.target.x(), y: e.target.y() })
      }
    >
      {/* halo de visibilidad sobre el fondo de la cancha */}
      <Circle radius={BALL_SIZE / 2 + 2} fill="rgba(15,23,42,0.15)" />
      {image ? (
        <KonvaImage
          image={image}
          width={BALL_SIZE}
          height={BALL_SIZE}
          x={-BALL_SIZE / 2}
          y={-BALL_SIZE / 2}
          shadowBlur={3}
        />
      ) : (
        <Circle radius={BALL_SIZE / 2 - 2} fill="#ffffff" stroke="#0f172a" strokeWidth={1} />
      )}
    </Group>
  );
}
