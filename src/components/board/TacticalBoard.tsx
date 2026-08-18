"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import { COURT_WIDTH, COURT_HEIGHT, GOAL_DEPTH } from "@/lib/futsal/formations";
import { FutsalCourt } from "@/components/board/FutsalCourt";
import { PlayerToken } from "@/components/board/PlayerToken";
import { BallToken } from "@/components/board/BallToken";
import { MoveLine } from "@/components/board/MoveLine";
import type { BoardMove, BoardPoint, BoardPositions } from "@/lib/supabase/database.types";

export interface TacticalBoardProps {
  positions: BoardPositions;
  moves?: BoardMove[];
  homeColor: string;
  awayColor: string;
  interactivePlayers?: boolean;
  interactiveBall?: boolean;
  interactiveCurves?: boolean;
  onPlayerDragEnd?: (team: "home" | "away", playerId: string, pos: BoardPoint) => void;
  onBallDragEnd?: (pos: BoardPoint) => void;
  onCurveChange?: (moveIndex: number, point: BoardPoint) => void;
}

export function TacticalBoard({
  positions,
  moves = [],
  homeColor,
  awayColor,
  interactivePlayers,
  interactiveBall,
  interactiveCurves,
  onPlayerDragEnd,
  onBallDragEnd,
  onCurveChange,
}: TacticalBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(COURT_WIDTH * 2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = width / (COURT_WIDTH + GOAL_DEPTH * 2);
  const height = COURT_HEIGHT * scale;

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <Stage width={width} height={height} scaleX={scale} scaleY={scale}>
        <Layer x={GOAL_DEPTH}>
          <FutsalCourt />

          {moves.map((move, i) => (
            <MoveLine
              key={i}
              from={move.from}
              to={move.to}
              curve={move.curve}
              solid={move.hasBall}
              color={move.type === "ball" ? "#e2e8f0" : move.team === "home" ? homeColor : awayColor}
              interactive={interactiveCurves}
              onCurveChange={(point) => onCurveChange?.(i, point)}
            />
          ))}

          {positions.home.map((p) => (
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
          {positions.away.map((p) => (
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

          <BallToken
            x={positions.ball.x}
            y={positions.ball.y}
            draggable={interactiveBall}
            onDragEnd={(pos) => onBallDragEnd?.(pos)}
          />
        </Layer>
      </Stage>
    </div>
  );
}
