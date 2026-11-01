import { ActionForm } from "@/components/forms/ActionForm";
import { ClientSelectField } from "@/components/forms/ClientSelectField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestTeamEntry } from "@/lib/actions/registrations";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOptionsForRegistration } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const STATUS_LABELS: Record<string, { label: string; className?: string }> = {
  pending: { label: "Pendiente" },
  approved: {
    label: "Aprobada",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  rejected: { label: "Rechazada", className: "bg-destructive/10 text-destructive" },
};

type MyRegistration = {
  id: string;
  status: string;
  created_at: string;
  teams: { name: string; category: string | null } | null;
};

export default async function JoinTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const teamOptions = await getTeamOptionsForRegistration();

  // Cliente admin para mostrar los nombres de los equipos de las solicitudes
  // (el usuario aún no es miembro y RLS no le dejaría leerlos).
  const admin = createAdminClient();
  const { data: registrationsRaw } = await admin
    .from("player_registrations")
    .select("id, status, created_at, teams(name, category)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const registrations = (registrationsRaw ?? []) as unknown as MyRegistration[];
  const hasPending = registrations.some((r) => r.status === "pending");

  return (
    <div className="grid w-full gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Unirme a un equipo</h1>
        <p className="text-muted-foreground">
          Elige tu equipo y el entrenador revisará tu solicitud. Cuando te apruebe, podrás ver las
          jugadas que comparta con el equipo.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Solicitar unión</CardTitle>
          <CardDescription>
            Tu solicitud quedará pendiente hasta que el entrenador del equipo la apruebe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay equipos disponibles.</p>
          ) : hasPending ? (
            <p className="text-sm text-muted-foreground">
              Ya tienes una solicitud pendiente. Espera a que la revisen antes de enviar otra.
            </p>
          ) : (
            <ActionForm
              action={requestTeamEntry}
              onSuccessMessage="Solicitud enviada. El entrenador del equipo la revisará y podrás ver las jugadas cuando te apruebe."
            >
              <div className="grid gap-4">
                <ClientSelectField
                  id="teamId"
                  name="teamId"
                  label="Equipo"
                  options={teamOptions.map((t) => ({ label: t.label, value: t.id }))}
                />
                <SubmitButton className="w-full">
                  Enviar solicitud
                  <ArrowRight />
                </SubmitButton>
              </div>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      {registrations.length > 0 && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Mis solicitudes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {registrations.map((reg) => {
              const status = STATUS_LABELS[reg.status] ?? { label: reg.status };
              const teamLabel = reg.teams
                ? `${reg.teams.name}${reg.teams.category ? ` (${reg.teams.category})` : ""}`
                : "Equipo";
              return (
                <div key={reg.id} className="flex items-center justify-between gap-2">
                  <div className="grid gap-0.5">
                    <span className="font-medium">{teamLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(reg.created_at).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn(status.className)}>
                    {reg.status === "pending" && <Clock />}
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
