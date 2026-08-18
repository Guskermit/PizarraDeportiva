import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { signUpUser } from "@/lib/actions/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>
            Regístrate como entrenador o jugador. Tu club te añadirá a un equipo con este email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={signUpUser}>
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
              <SubmitButton className="w-full">
                Crear cuenta
                <ArrowRight />
              </SubmitButton>
            </div>
          </ActionForm>
          <div className="mt-6 flex justify-center gap-1.5 text-sm text-muted-foreground">
            <span>¿Ya tienes cuenta?</span>
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

