import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { registerClub } from "@/lib/actions/clubs";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ClientColorInput } from "@/components/forms/ClientColorInput";

export default function RegisterClubPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Registra tu club</CardTitle>
          <CardDescription>
            Crea el club de fútbol sala y tu cuenta de administrador principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={registerClub}
            onSuccessMessage="Club creado. Revisa tu correo para confirmar la cuenta y podrás iniciar sesión."
          >
            <div className="grid gap-4">
              <h3 className="text-sm font-semibold">Datos del club</h3>
              <div className="grid gap-1.5">
                <Label htmlFor="clubName">Nombre del club</Label>
                <Input id="clubName" name="clubName" required />
              </div>
              <div className="grid gap-4">
                <ClientColorInput
                  id="primaryColor"
                  name="primaryColor"
                  label="Color principal (equipo local)"
                  defaultValue="#1d4ed8"
                />
                <ClientColorInput
                  id="secondaryColor"
                  name="secondaryColor"
                  label="Color secundario (equipo visitante)"
                  defaultValue="#f97316"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="logo">Logo del club</Label>
                <Input id="logo" name="logo" type="file" accept="image/*" />
              </div>

              <h3 className="mt-4 text-sm font-semibold">Administrador del club</h3>
              <div className="grid gap-1.5">
                <Label htmlFor="adminName">Nombre completo</Label>
                <Input id="adminName" name="adminName" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput id="password" name="password" required />
              </div>

              <SubmitButton className="mt-2 w-full">
                Crear club
                <ArrowRight />
              </SubmitButton>
            </div>
          </ActionForm>
          <div className="mt-6 flex justify-center gap-1.5 text-sm text-muted-foreground">
            <span>¿Ya tienes una cuenta?</span>
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

