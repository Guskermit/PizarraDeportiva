"use client";

import { Rect, Line, Circle, Arc } from "react-konva";
import { COURT_WIDTH, COURT_HEIGHT, GOAL_DEPTH } from "@/lib/futsal/formations";

const LINE_COLOR = "#f8fafc";
const LINE_WIDTH = 1.5;

// Draws the markings of a regulation futsal court (simplified) inside a COURT_WIDTH x COURT_HEIGHT box.
export function FutsalCourt() {
  const midY = COURT_HEIGHT / 2;
  const areaWidth = COURT_WIDTH * 0.15;
  const areaHeight = COURT_HEIGHT * 0.5;
  const goalWidth = areaHeight * 0.44;

  return (
    <>
      <Rect x={0} y={0} width={COURT_WIDTH} height={COURT_HEIGHT} fill="#15803d" cornerRadius={4} />

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
      <Circle x={COURT_WIDTH / 2} y={midY} radius={COURT_HEIGHT * 0.18} stroke={LINE_COLOR} strokeWidth={LINE_WIDTH} />
      <Circle x={COURT_WIDTH / 2} y={midY} radius={2} fill={LINE_COLOR} />

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

