"use client";

import { BallToken } from "@/components/board/BallToken";
import { FutsalCourt } from "@/components/board/FutsalCourt";
import { MoveLine } from "@/components/board/MoveLine";
import { PlayerToken } from "@/components/board/PlayerToken";
import { COURT_HEIGHT, COURT_WIDTH, GOAL_DEPTH } from "@/lib/futsal/formations";
import type { BoardMove, BoardPoint, BoardPositions } from "@/lib/supabase/database.types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Layer, Stage } from "react-konva";

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
  const [size, setSize] = useState({ width: COURT_WIDTH * 2, height: COURT_HEIGHT });

  // Measure synchronously on mount so remounts (e.g. fullscreen toggles) start at the right size.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) setSize({ width: el.clientWidth, height: el.clientHeight });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);

    // Re-measure after fullscreen transitions settle (ResizeObserver can miss them).
    function onFullscreenChange() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (el) setSize({ width: el.clientWidth, height: el.clientHeight });
        });
      });
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const scale = Math.min(
    size.width / (COURT_WIDTH + GOAL_DEPTH * 2),
    size.height > 0 ? size.height / COURT_HEIGHT : Number.POSITIVE_INFINITY,
  );
  const width = (COURT_WIDTH + GOAL_DEPTH * 2) * scale;
  const height = COURT_HEIGHT * scale;

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
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
              color={
                move.type === "ball" ? "#e2e8f0" : move.team === "home" ? homeColor : awayColor
              }
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
