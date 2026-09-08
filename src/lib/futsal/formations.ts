import type { BoardPlayer, BoardPositions, TeamFormation } from "@/lib/supabase/database.types";

// Model coordinate system for the court (arbitrary units, scaled responsively by the canvas).
// A regulation futsal court is roughly 40 x 20 m, hence the 2:1 aspect ratio.
export const COURT_WIDTH = 400;
export const COURT_HEIGHT = 200;
// Extra margin (in the same units) reserved on each side of the pitch so the goal frames
// have room to render outside the touchlines instead of being clipped by the canvas.
export const GOAL_DEPTH = 10;

/** Predefined court-surface colour presets for the tactical board. */
export const COURT_COLOR_PRESETS = [
  { value: "#1565c0", label: "Azul" },
  { value: "#b5651d", label: "Parquet de madera" },
  { value: "#15803d", label: "Verde" },
  { value: "#d4b896", label: "Beige" },
] as const;

export const PLAY_TYPE_LABELS: Record<string, string> = {
  corner: "Córner",
  falta: "Falta",
  fuera_de_banda: "Saque de banda",
  libre_indirecto: "Libre indirecto",
  portero_jugador: "Portero jugador",
  defensa: "Defensa",
  ataque_posicional: "Ataque posicional",
};

export const FORMATION_LABELS: Record<TeamFormation, string> = {
  portero_4_jugadores: "Portero + 4 jugadores",
  "5_jugadores": "5 jugadores (portero-jugador)",
  portero_3_jugadores: "Portero + 3 jugadores (inferioridad)",
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Iniciación",
  2: "Básico",
  3: "Intermedio",
  4: "Avanzado",
  5: "Experto",
};

export const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  2: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  3: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  4: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  5: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
};

/**
 * Builds the default starting layout for a team on one half of the court.
 * `side` controls whether the team lines up on the left (home) or right (away) half.
 */
function buildTeamPlayers(formation: TeamFormation, side: "home" | "away"): BoardPlayer[] {
  const facing = side === "home" ? 1 : -1;
  const goalX = side === "home" ? 10 : COURT_WIDTH - 10;
  const midY = COURT_HEIGHT / 2;

  const goalkeeper: BoardPlayer = {
    id: `${side}-gk`,
    x: goalX,
    y: midY,
    label: "P",
    isGoalkeeper: true,
  };

  const lineX = side === "home" ? COURT_WIDTH * 0.35 : COURT_WIDTH * 0.65;
  const wideX = side === "home" ? COURT_WIDTH * 0.25 : COURT_WIDTH * 0.75;

  switch (formation) {
    case "portero_4_jugadores":
      return [
        goalkeeper,
        { id: `${side}-1`, x: wideX, y: midY - 60, label: "1" },
        { id: `${side}-2`, x: lineX, y: midY - 25, label: "2" },
        { id: `${side}-3`, x: lineX, y: midY + 25, label: "3" },
        { id: `${side}-4`, x: wideX, y: midY + 60, label: "4" },
      ];
    case "5_jugadores":
      return [
        { id: `${side}-gk`, x: goalX, y: midY, label: "PJ", isGoalkeeper: true },
        { id: `${side}-1`, x: wideX, y: midY - 60, label: "1" },
        { id: `${side}-2`, x: lineX, y: midY - 25, label: "2" },
        { id: `${side}-3`, x: lineX, y: midY + 25, label: "3" },
        { id: `${side}-4`, x: wideX, y: midY + 60, label: "4" },
      ];
    case "portero_3_jugadores":
      return [
        goalkeeper,
        { id: `${side}-1`, x: lineX, y: midY - 40, label: "1" },
        { id: `${side}-2`, x: lineX + facing * 20, y: midY, label: "2" },
        { id: `${side}-3`, x: lineX, y: midY + 40, label: "3" },
      ];
    default:
      return [goalkeeper];
  }
}

export function buildInitialPositions(
  homeFormation: TeamFormation,
  awayFormation: TeamFormation,
): BoardPositions {
  return {
    home: buildTeamPlayers(homeFormation, "home"),
    away: buildTeamPlayers(awayFormation, "away"),
    ball: { x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2 },
  };
}

export function clonePositions(positions: BoardPositions): BoardPositions {
  return JSON.parse(JSON.stringify(positions));
}
