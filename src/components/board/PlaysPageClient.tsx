"use client";

import { PlayLoopPlayer } from "@/components/board/PlayLoopPlayer";
import { PlaysSelectTable } from "@/components/board/PlaysSelectTable";
import { type LoopPlay } from "@/components/board/PlayLoopPlayer";
import type { ClubCoach } from "@/lib/supabase/queries";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlaysPageClient({
  plays,
  playDataMap,
  coachesByClub,
}: {
  plays: { id: string; title: string; typeLabel: string; status: string; clubId: string }[];
  playDataMap: Record<string, LoopPlay>;
  coachesByClub?: Record<string, ClubCoach[]>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loopPlayerOpen, setLoopPlayerOpen] = useState(false);
  const [loopStartIndex, setLoopStartIndex] = useState(0);
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openLoopPlayer() {
    const selectedIds = Array.from(selected);
    if (selectedIds.length < 2) return;
    setLoopStartIndex(0);
    setLoopPlayerOpen(true);
  }

  function handleDelete(id: string) {
    if (!window.confirm("¿Seguro que quieres eliminar esta jugada?")) return;
    import("@/lib/actions/plays").then(({ deletePlay }) => {
      deletePlay(id).then((res) => {
        if (res?.error) {
          window.alert(res.error);
        } else {
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          router.refresh();
        }
      });
    });
  }

  const loopPlays = Array.from(selected)
    .map((id) => playDataMap[id])
    .filter(Boolean);

  return (
    <>
      <PlaysSelectTable
        plays={plays}
        selected={selected}
        onToggle={toggle}
        onPlayLoop={openLoopPlayer}
        coachesByClub={coachesByClub}
        onDelete={handleDelete}
      />

      {loopPlayerOpen && loopPlays.length >= 2 && (
        <PlayLoopPlayer
          plays={loopPlays}
          startIndex={loopStartIndex}
          onClose={() => setLoopPlayerOpen(false)}
        />
      )}
    </>
  );
}
