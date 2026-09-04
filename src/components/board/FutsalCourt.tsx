"use client";

import { useEffect, useState } from "react";
import { Rect, Line, Circle, Arc, Group, Image as KonvaImage } from "react-konva";
import { COURT_WIDTH, COURT_HEIGHT, GOAL_DEPTH } from "@/lib/futsal/formations";

const LINE_COLOR = "#f8fafc";
const LINE_WIDTH = 1.5;

// Draws the markings of a regulation futsal court (simplified) inside a COURT_WIDTH x COURT_HEIGHT box.
export function FutsalCourt({
  courtColor = "#15803d",
  logoUrl,
}: {
  courtColor?: string;
  logoUrl?: string | null;
} = {}) {
  const midY = COURT_HEIGHT / 2;
  const areaWidth = COURT_WIDTH * 0.15;
  const areaHeight = COURT_HEIGHT * 0.5;
  const goalWidth = areaHeight * 0.3;
  const centerRadius = COURT_HEIGHT * 0.18;

  const [logo, setLogo] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!logoUrl) {
      setLogo(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;
    img.onload = () => setLogo(img);
  }, [logoUrl]);

  return (
    <>
      <Rect x={0} y={0} width={COURT_WIDTH} height={COURT_HEIGHT} fill={courtColor} cornerRadius={4} />

      {/* outer boundary */}
      <Rect
        x={4}
        y={4}
        width={COURT_WIDTH - 8}
        height={COURT_HEIGHT - 8}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />

      {/* halfway line */}
      <Line
        points={[COURT_WIDTH / 2, 4, COURT_WIDTH / 2, COURT_HEIGHT - 4]}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      <Circle x={COURT_WIDTH / 2} y={midY} radius={centerRadius} stroke={LINE_COLOR} strokeWidth={LINE_WIDTH} />
      {logo ? (
        <Group
          x={COURT_WIDTH / 2}
          y={midY}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, centerRadius - 1, 0, Math.PI * 2, false);
            ctx.closePath();
          }}
        >
          <KonvaImage
            image={logo}
            x={-centerRadius + 1}
            y={-centerRadius + 1}
            width={(centerRadius - 1) * 2}
            height={(centerRadius - 1) * 2}
          />
        </Group>
      ) : (
        <Circle x={COURT_WIDTH / 2} y={midY} radius={2} fill={LINE_COLOR} />
      )}

      {/* goal areas (simplified semicircular "área de meta") */}
      <Arc
        x={4}
        y={midY}
        innerRadius={0}
        outerRadius={areaWidth}
        angle={180}
        rotation={-90}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      <Arc
        x={COURT_WIDTH - 4}
        y={midY}
        innerRadius={0}
        outerRadius={areaWidth}
        angle={180}
        rotation={90}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />

      {/* penalty spots */}
      <Circle x={areaWidth * 1.6} y={midY} radius={1.5} fill={LINE_COLOR} />
      <Circle x={COURT_WIDTH - areaWidth * 1.6} y={midY} radius={1.5} fill={LINE_COLOR} />

      {/* goals (porterías): frames extending into the reserved GOAL_DEPTH margin */}
      <Rect
        x={-GOAL_DEPTH}
        y={midY - goalWidth / 2}
        width={GOAL_DEPTH}
        height={goalWidth}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
        fill="rgba(248, 250, 252, 0.12)"
      />
      <Rect
        x={COURT_WIDTH}
        y={midY - goalWidth / 2}
        width={GOAL_DEPTH}
        height={goalWidth}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
        fill="rgba(248, 250, 252, 0.12)"
      />
    </>
  );
}

