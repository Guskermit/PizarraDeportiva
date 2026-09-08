"use client";

import { COURT_HEIGHT, COURT_WIDTH, GOAL_DEPTH } from "@/lib/futsal/formations";
import type { BoardPoint, BoardPositions } from "@/lib/supabase/database.types";
import { useEffect, useRef, useState } from "react";

const COURT_TOTAL_W = COURT_WIDTH + GOAL_DEPTH * 2;
const LINE_COLOR = "#f8fafc";
const LINE_WIDTH = 1.5;

/* ── Court SVG markings (rendered once, scaled with CSS) ──────────────── */

function CourtSVG() {
  const midY = COURT_HEIGHT / 2;
  const areaWidth = COURT_WIDTH * 0.15;
  const areaHeight = COURT_HEIGHT * 0.5;
  const goalWidth = areaHeight * 0.3;
  const centerR = COURT_HEIGHT * 0.18;

  return (
    <svg
      viewBox={`0 0 ${COURT_TOTAL_W} ${COURT_HEIGHT}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* outer boundary */}
      <rect
        x={4}
        y={4}
        width={COURT_WIDTH - 8}
        height={COURT_HEIGHT - 8}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />

      {/* halfway line */}
      <line
        x1={COURT_WIDTH / 2}
        y1={4}
        x2={COURT_WIDTH / 2}
        y2={COURT_HEIGHT - 4}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />

      {/* center circle */}
      <circle
        cx={COURT_WIDTH / 2}
        cy={midY}
        r={centerR}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      <circle cx={COURT_WIDTH / 2} cy={midY} r={2} fill={LINE_COLOR} />

      {/* goal areas – semicircular arcs opening inward toward the centre */}
      <path
        d={`M 4 ${midY - areaWidth} A ${areaWidth} ${areaWidth} 0 0 1 4 ${midY + areaWidth}`}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      <path
        d={`M ${COURT_WIDTH - 4} ${midY - areaWidth} A ${areaWidth} ${areaWidth} 0 0 0 ${COURT_WIDTH - 4} ${midY + areaWidth}`}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />

      {/* penalty spots */}
      <circle cx={areaWidth * 1.6} cy={midY} r={1.5} fill={LINE_COLOR} />
      <circle cx={COURT_WIDTH - areaWidth * 1.6} cy={midY} r={1.5} fill={LINE_COLOR} />

      {/* goals (porterías) */}
      <rect
        x={-GOAL_DEPTH}
        y={midY - goalWidth / 2}
        width={GOAL_DEPTH}
        height={goalWidth}
        fill="rgba(248,250,252,0.12)"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      <rect
        x={COURT_WIDTH}
        y={midY - goalWidth / 2}
        width={GOAL_DEPTH}
        height={goalWidth}
        fill="rgba(248,250,252,0.12)"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
    </svg>
  );
}

/* ── Token (player / ball) component ─────────────────────────────────── */

interface TokenProps {
  /** World-unit X position */
  wx: number;
  /** World-unit Y position */
  wy: number;
  /** CSS scale = container px / world units */
  scale: number;
  /** Extra horizontal offset to account for GOAL_DEPTH margin */
  offsetX: number;
  color: string;
  label: string;
  isGoalkeeper?: boolean;
  isBall?: boolean;
  /** Fired continuously while dragging (world coordinates). */
  onDrag?: (pos: BoardPoint) => void;
  /** Fired once on pointer-up (world coordinates). */
  onDragEnd?: (pos: BoardPoint) => void;
}

function Token({
  wx,
  wy,
  scale,
  offsetX,
  color,
  label,
  isGoalkeeper,
  isBall,
  onDrag,
  onDragEnd,
}: TokenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startWorld = useRef<BoardPoint>({ x: 0, y: 0 });
  const startPointer = useRef<BoardPoint>({ x: 0, y: 0 });

  function toWorld(clientX: number, clientY: number): BoardPoint {
    const el = ref.current?.parentElement;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    return {
      x: Math.max(0, Math.min(COURT_TOTAL_W, px / scale)),
      y: Math.max(0, Math.min(COURT_HEIGHT, py / scale)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!onDrag && !onDragEnd) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    startWorld.current = { x: wx, y: wy };
    startPointer.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = (e.clientX - startPointer.current.x) / scale;
    const dy = (e.clientY - startPointer.current.y) / scale;
    const world = {
      x: Math.max(0, Math.min(COURT_TOTAL_W, startWorld.current.x + dx)),
      y: Math.max(0, Math.min(COURT_HEIGHT, startWorld.current.y + dy)),
    };
    onDrag?.(world);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = (e.clientX - startPointer.current.x) / scale;
    const dy = (e.clientY - startPointer.current.y) / scale;
    const world = {
      x: Math.max(0, Math.min(COURT_TOTAL_W, startWorld.current.x + dx)),
      y: Math.max(0, Math.min(COURT_HEIGHT, startWorld.current.y + dy)),
    };
    onDragEnd?.(world);
  }

  // Sizes match the Konva originals: player diameter 14 world-units, ball 9 world-units.
  // These values are in CSS pixels, which is the same unit the court is rendered in,
  // so we multiply by scale to match the court scaling.
  const size = isBall ? Math.round(9 * scale) : Math.round(14 * scale);
  const fontSize = isBall ? 0 : Math.round(7 * scale);
  const strokeW = isBall ? 1.5 : isGoalkeeper ? 2 : 1;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute flex items-center justify-center select-none touch-none"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: isBall
          ? "radial-gradient(circle at 35% 35%, #d8b4fe 0%, #a855f7 100%)"
          : color,
        border: isGoalkeeper
          ? `${strokeW}px solid #facc15`
          : `${strokeW}px solid #0f172a`,
        fontSize,
        color: "#fff",
        fontWeight: 600,
        lineHeight: 1,
        transform: `translate(${wx * scale + offsetX - size / 2}px, ${wy * scale - size / 2}px)`,
        willChange: "transform",
        zIndex: isBall ? 10 : 20,
      }}
    >
      {!isBall && label}
    </div>
  );
}

/* ── Lightweight Board ────────────────────────────────────────────────── */

export interface FreeBoardLiteProps {
  positions: BoardPositions;
  homeColor: string;
  awayColor: string;
  courtColor?: string;
  logoUrl?: string | null;
  onPlayerDragEnd: (team: "home" | "away", playerId: string, pos: BoardPoint) => void;
  onBallDragEnd: (pos: BoardPoint) => void;
  onPlayerDrag?: (team: "home" | "away", playerId: string, pos: BoardPoint) => void;
}

export function FreeBoardLite({
  positions,
  homeColor,
  awayColor,
  courtColor = "#15803d",
  onPlayerDragEnd,
  onBallDragEnd,
  onPlayerDrag,
}: FreeBoardLiteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: COURT_TOTAL_W * 2, height: COURT_HEIGHT });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setSize({ width: el.clientWidth, height: el.clientHeight });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);

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
    size.width / COURT_TOTAL_W,
    size.height > 0 ? size.height / COURT_HEIGHT : Number.POSITIVE_INFINITY,
  );

  const courtW = COURT_TOTAL_W * scale;
  const courtH = COURT_HEIGHT * scale;
  const offsetX = GOAL_DEPTH * scale;

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        className="relative overflow-hidden rounded"
        style={{
          width: courtW,
          height: courtH,
          background: courtColor,
        }}
      >
        <CourtSVG />

        {positions.home.map((p) => (
          <Token
            key={p.id}
            wx={p.x}
            wy={p.y}
            scale={scale}
            offsetX={offsetX}
            color={homeColor}
            label={p.label}
            isGoalkeeper={p.isGoalkeeper}
            onDrag={(pos) => onPlayerDrag?.("home", p.id, pos)}
            onDragEnd={(pos) => onPlayerDragEnd("home", p.id, pos)}
          />
        ))}
        {positions.away.map((p) => (
          <Token
            key={p.id}
            wx={p.x}
            wy={p.y}
            scale={scale}
            offsetX={offsetX}
            color={awayColor}
            label={p.label}
            isGoalkeeper={p.isGoalkeeper}
            onDrag={(pos) => onPlayerDrag?.("away", p.id, pos)}
            onDragEnd={(pos) => onPlayerDragEnd("away", p.id, pos)}
          />
        ))}

        <Token
          wx={positions.ball.x}
          wy={positions.ball.y}
          scale={scale}
          offsetX={offsetX}
          color="#ffffff"
          label=""
          isBall
          onDragEnd={(pos) => onBallDragEnd(pos)}
        />
      </div>
    </div>
  );
}
