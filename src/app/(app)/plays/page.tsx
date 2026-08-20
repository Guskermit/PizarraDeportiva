import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { copyPlayToCatalog } from "@/lib/actions/plays";
import { PLAY_TYPE_LABELS } from "@/lib/futsal/formations";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ShareForm } from "@/components/forms/ShareForm";
import { FlatTable } from "@/components/FlatTable";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";
import { getClubCoaches, type ClubCoach } from "@/lib/supabase/queries";

function StatusPill({ status }: { status: string }) {
  const ready = status === "ready";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs",
        ready ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", ready ? "bg-primary" : "bg-muted-foreground")} />
      {ready ? "Finalizada" : "Borrador"}
    </span>
  );
}

export default async function PlaysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plays } = await supabase
    .from("plays")
    .select("*")
    .order("updated_at", { ascending: false });

  const { data: directShares } = await supabase
    .from("play_shares")
    .select("play_id, can_copy")
    .eq("shared_with_profile_id", user!.id);

  const copyablePlayIds = new Set((directShares ?? []).filter((s) => s.can_copy).map((s) => s.play_id));

  const myPlays = (plays ?? []).filter((p) => p.owner_coach_id === user!.id);
  const sharedPlays = (plays ?? []).filter((p) => p.owner_coach_id !== user!.id);

  // Entrenadores del club por jugada, para el formulario de compartir.
  const myClubIds = [...new Set(myPlays.map((p) => p.club_id))];
  const coachesByClub: Record<string, ClubCoach[]> = {};
  await Promise.all(
    myClubIds.map(async (clubId) => {
      const coaches = await getClubCoaches(clubId);
      coachesByClub[clubId] = coaches.filter((c) => c.id !== user!.id);
    }),
  );

  return (
    <div className="grid w-full gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Jugadas</h1>
          <p className="text-muted-foreground">Tu catálogo de jugadas y las compartidas contigo.</p>
        </div>
        <Button render={<Link href="/plays/new" />}>
          Nueva jugada
          <ArrowRight />
        </Button>
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Mi catálogo</h2>
        <FlatTable
          columns={[
            { key: "title", label: "Título" },
            { key: "type", label: "Tipo", width: "12rem" },
            { key: "status", label: "Estado", width: "8rem" },
            { key: "actions", label: "Acciones", width: "auto" },
          ]}
          searchPlaceholder="Buscar jugadas..."
          emptyMessage="Todavía no has creado ninguna jugada."
          rows={myPlays.map((play) => ({
            id: play.id,
            searchText: `${play.title} ${PLAY_TYPE_LABELS[play.play_type]}`,
            cells: [
              <div key="title" className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(play.title)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{play.title}</span>
              </div>,
              <span key="type" className="text-muted-foreground">
                {PLAY_TYPE_LABELS[play.play_type]}
              </span>,
              <StatusPill key="status" status={play.status} />,
              <div key="actions" className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" render={<Link href={`/plays/${play.id}/edit`} />}>
                  Editar
                </Button>
                <Button variant="tertiary" size="sm" render={<Link href={`/plays/${play.id}/view`} />}>
                  Ver
                </Button>
                <ShareForm playId={play.id} coaches={coachesByClub[play.club_id] ?? []} />
              </div>,
            ],
          }))}
        />
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Compartidas conmigo</h2>
        <FlatTable
          columns={[
            { key: "title", label: "Título" },
            { key: "type", label: "Tipo", width: "12rem" },
            { key: "actions", label: "Acciones", width: "auto" },
          ]}
          searchPlaceholder="Buscar jugadas compartidas..."
          emptyMessage="Nadie ha compartido jugadas contigo todavía."
          rows={sharedPlays.map((play) => ({
            id: play.id,
            searchText: `${play.title} ${PLAY_TYPE_LABELS[play.play_type]}`,
            cells: [
              <div key="title" className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(play.title)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{play.title}</span>
              </div>,
              <span key="type" className="text-muted-foreground">
                {PLAY_TYPE_LABELS[play.play_type]}
              </span>,
              <div key="actions" className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" render={<Link href={`/plays/${play.id}/view`} />}>
                  Ver
                </Button>
                {copyablePlayIds.has(play.id) && (
                  <form
                    action={async () => {
                      "use server";
                      await copyPlayToCatalog(play.id);
                    }}
                  >
                    <SubmitButton variant="tertiary" size="sm">
                      Copiar a mi catálogo
                    </SubmitButton>
                  </form>
                )}
              </div>,
            ],
          }))}
        />
      </div>
    </div>
  );
}

