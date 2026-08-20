"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PlayersCard({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir jugadores del club" : "Contraer jugadores del club"}
        >
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              collapsed && "-rotate-90",
            )}
          />
          <CardTitle>Jugadores del club</CardTitle>
        </button>
      </CardHeader>
      {!collapsed && <CardContent className="grid gap-5">{children}</CardContent>}
    </Card>
  );
}