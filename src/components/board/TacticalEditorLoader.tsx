"use client";

import dynamic from "next/dynamic";

export const TacticalEditorClient = dynamic(
  () => import("@/components/board/TacticalEditor").then((m) => m.TacticalEditor),
  {
    ssr: false,
    loading: () => <div className="p-8 text-muted-foreground">Cargando pizarra…</div>,
  },
);
