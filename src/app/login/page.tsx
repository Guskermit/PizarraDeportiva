import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { login } from "@/lib/actions/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="card-glow w-full max-w-md">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Accede a tu pizarra táctica de fútbol sala.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={login}>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput id="password" name="password" required />
              </div>
              <SubmitButton className="w-full">
                Entrar
                <ArrowRight />
              </SubmitButton>
            </div>
          </ActionForm>
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1.5">
              <span>¿No tienes cuenta?</span>
              <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
                Regístrate
              </Link>
            </div>
            <Link href="/register-club" className="text-foreground underline-offset-4 hover:underline">
              Dar de alta un nuevo club
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

