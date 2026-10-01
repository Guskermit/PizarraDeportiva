import type { DrawingStroke } from "@/components/board/DrawingLayer";
import type { BoardPoint } from "@/lib/supabase/database.types";

const MARKER_RADIUS = 7;
const HIT_MARGIN_PX = 6;

/** Extra tolerance around strokes expressed in world units (based on screen pixels). */
function worldTolerance(scale: number): number {
  const s = scale > 0 && Number.isFinite(scale) ? scale : 1;
  return HIT_MARGIN_PX / s;
}

function distanceToSegment(p: BoardPoint, a: BoardPoint, b: BoardPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export interface FindStrokeOptions {
  /** Only consider player/ball markers (used when starting a marker drag). */
  markersOnly?: boolean;
}

/**
 * Find the topmost stroke under a world-space point.
 * Uses plain math so it behaves the same in every browser (no canvas readback).
 */
export function findStrokeAt(
  strokes: DrawingStroke[],
  world: BoardPoint,
  scale: number,
  options?: FindStrokeOptions,
): DrawingStroke | null {
  const tolerance = worldTolerance(scale);
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    const isMarker = stroke.tool === "player-marker" || stroke.tool === "ball-marker";
    if (isMarker) {
      if (!stroke.position) continue;
      const dist = Math.hypot(world.x - stroke.position.x, world.y - stroke.position.y);
      if (dist <= MARKER_RADIUS + tolerance) return stroke;
      continue;
    }
    if (options?.markersOnly || stroke.points.length < 2) continue;
    const hitDistance = stroke.width / 2 + tolerance;
    for (let j = 1; j < stroke.points.length; j++) {
      if (distanceToSegment(world, stroke.points[j - 1], stroke.points[j]) <= hitDistance) {
        return stroke;
      }
    }
  }
  return null;
}
