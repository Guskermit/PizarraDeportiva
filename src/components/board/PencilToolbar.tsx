"use client";

import { Button } from "@/components/ui/button";
import {
  MousePointer,
  Pencil,
  Minus,
  SquareDashedBottom,
  Circle,
  CircleDot,
  Eraser,
  Trash2,
  X,
} from "lucide-react";
import type { PencilTool } from "@/components/board/DrawingLayer";

const PENCIL_COLORS = [
  { value: "#ef4444", label: "Rojo" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#eab308", label: "Amarillo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#ffffff", label: "Blanco" },
  { value: "#000000", label: "Negro" },
];

const STROKE_WIDTHS = [
  { value: 1, label: "Fino" },
  { value: 2, label: "Medio" },
  { value: 3, label: "Grueso" },
];

const TOOLS: { tool: PencilTool; icon: typeof Pencil; label: string }[] = [
  { tool: "pointer", icon: MousePointer, label: "Puntero" },
  { tool: "freehand", icon: Pencil, label: "Lápiz" },
  { tool: "line", icon: Minus, label: "Línea continua" },
  { tool: "dashed-line", icon: SquareDashedBottom, label: "Línea discontinua" },
  { tool: "player-marker", icon: Circle, label: "Marcador jugador" },
  { tool: "ball-marker", icon: CircleDot, label: "Marcador balón" },
  { tool: "eraser", icon: Eraser, label: "Borrador" },
];

export interface PencilToolbarProps {
  activeTool: PencilTool;
  color: string;
  strokeWidth: number;
  onToolChange: (tool: PencilTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function PencilToolbar({
  activeTool,
  color,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onClearAll,
  onClose,
}: PencilToolbarProps) {
  return (
    <div className="absolute left-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl border bg-background/95 p-1.5 shadow-xl backdrop-blur sm:left-5">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onClose}
        title="Salir del modo lápiz"
        aria-label="Salir del modo lápiz"
      >
        <X />
      </Button>

      <div className="my-1 h-px w-full bg-border" />

      {/* Drawing tools */}
      {TOOLS.map(({ tool, icon: Icon, label }) => (
        <Button
          key={tool}
          variant={activeTool === tool ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => onToolChange(tool)}
          title={label}
          aria-label={label}
        >
          <Icon />
        </Button>
      ))}

      <div className="my-1 h-px w-full bg-border" />

      {/* Color picker */}
      <div className="flex flex-col items-center gap-0.5">
        {PENCIL_COLORS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`h-5 w-5 rounded-full border-2 transition-all ${
              color === value
                ? "scale-110 border-primary ring-1 ring-primary"
                : "border-border hover:scale-105"
            }`}
            style={{ background: value }}
            onClick={() => onColorChange(value)}
            title={label}
            aria-label={`Color ${label}`}
          />
        ))}
      </div>

      <div className="my-1 h-px w-full bg-border" />

      {/* Stroke width */}
      <div className="flex flex-col items-center gap-0.5">
        {STROKE_WIDTHS.map(({ value, label }) => (
          <Button
            key={value}
            variant={strokeWidth === value ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => onStrokeWidthChange(value)}
            title={label}
            aria-label={`Grosor ${label}`}
            className="flex items-center justify-center"
          >
            <div
              className="rounded-full bg-current"
              style={{ width: 4 + value * 3, height: 4 + value * 3 }}
            />
          </Button>
        ))}
      </div>

      <div className="my-1 h-px w-full bg-border" />

      {/* Clear all */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClearAll}
        title="Borrar todo"
        aria-label="Borrar todos los trazos"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
