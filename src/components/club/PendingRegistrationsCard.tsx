import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveRegistration, rejectRegistration } from "@/lib/actions/registrations";
import { Check, X } from "lucide-react";

export type PendingRegistration = {
  id: string;
  created_at: string;
  team?: { name: string } | null;
  profiles: { full_name: string; email: string } | null;
};

export function PendingRegistrationsCard({
  registrations,
}: {
  registrations: PendingRegistration[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Solicitudes pendientes{registrations.length > 0 ? ` (${registrations.length})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {registrations.length === 0 && (
          <p className="text-muted-foreground">Sin solicitudes pendientes.</p>
        )}
        {registrations.map((reg) => (
          <div key={reg.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{reg.profiles?.full_name ?? "Jugador"}</span>
                {reg.team && <Badge variant="outline">{reg.team.name}</Badge>}
              </div>
              <span className="text-sm text-muted-foreground">{reg.profiles?.email}</span>
            </div>
            <div className="flex gap-2">
              <ActionForm action={approveRegistration.bind(null, reg.id)}>
                <SubmitButton size="sm">
                  <Check />
                  Aprobar
                </SubmitButton>
              </ActionForm>
              <ActionForm action={rejectRegistration.bind(null, reg.id)}>
                <SubmitButton variant="tertiary" size="sm">
                  <X />
                  Rechazar
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
