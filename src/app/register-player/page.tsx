import { ActionForm } from "@/components/forms/ActionForm";
import { ClientSelectField } from "@/components/forms/ClientSelectField";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerPlayer } from "@/lib/actions/registrations";
import { getTeamOptionsForRegistration } from "@/lib/supabase/queries";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

// La lista de equipos se consulta en cada petición (cliente service-role, sin sesión).
export const dynamic = "force-dynamic";

export default async function RegisterPlayerPage() {
  const teamOptions = await getTeamOptionsForRegistration();

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="card-glow w-full max-w-md">
        <CardHeader>
          <CardTitle>Registro de jugador</CardTitle>
          <CardDescription>
            Crea tu cuenta y elige tu equipo. Tu solicitud quedará pendiente hasta que el entrenador
            la apruebe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay equipos disponibles. Pide a tu entrenador o al administrador del club
              que cree un equipo.
            </p>
          ) : (
            <ActionForm
              action={registerPlayer}
              onSuccessMessage="Cuenta creada sin verificación de email. Inicia sesión para ver el estado de tu solicitud; seguirá pendiente hasta que el entrenador la apruebe."
            >
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <PasswordInput id="password" name="password" required />
                </div>
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
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1.5">
              <span>¿Ya tienes cuenta?</span>
              <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
                Inicia sesión
              </Link>
            </div>
            <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
              Crear cuenta sin equipo
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
