"use client";

import dynamic from "next/dynamic";

export const PlayViewerClient = dynamic(
  () => import("@/components/board/PlayViewer").then((m) => m.PlayViewer),
  {
    ssr: false,
    loading: () => <div className="p-8 text-muted-foreground">Cargando pizarra…</div>,
  },
);
