"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

export function CommentOverlay({
  containerRef,
  title,
  children,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number | null; y: number }>({ x: null, y: 12 });
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const container = containerRef.current;
    let originX = pos.x;
    if (originX === null && container) {
      const rect = el.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      originX = rect.left - cRect.left;
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX,
      originY: pos.y,
    };
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const container = containerRef.current;
    const el = e.currentTarget;
    const maxX = container ? Math.max(0, container.clientWidth - el.offsetWidth) : Number.POSITIVE_INFINITY;
    const maxY = container ? Math.max(0, container.clientHeight - el.offsetHeight) : Number.POSITIVE_INFINITY;
    setPos({
      x: Math.min(Math.max(0, drag.originX + (e.clientX - drag.startX)), maxX),
      y: Math.min(Math.max(0, drag.originY + (e.clientY - drag.startY)), maxY),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      className="absolute z-10 w-72 max-w-[calc(100%-24px)] rounded-xl border bg-background/50 shadow-lg backdrop-blur"
      style={pos.x === null ? { right: 12, top: pos.y } : { left: pos.x, top: pos.y }}
    >
      <div
        className="flex cursor-grab touch-none items-center justify-between gap-1 rounded-t-xl px-2 py-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title="Arrastrar la ventana de comentarios"
      >
        <span className="flex items-center gap-1 text-xs font-semibold">
          <GripVertical className="size-3.5" />
          {title}
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-0.5 hover:bg-background/60"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </button>
      </div>
      {!collapsed && <div className="grid gap-2 px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}