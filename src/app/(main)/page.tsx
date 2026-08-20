import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          ⚽ Pizarra táctica para fútbol sala
        </Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Diseña, comparte y visualiza jugadas de{" "}
          <span className="text-gradient">fútbol sala</span>
        </h1>
        <p className="text-balance text-lg text-muted-foreground">
          Una pizarra táctica interactiva para clubes, entrenadores y jugadores. Crea tu club,
          organiza equipos y diseña jugadas paso a paso desde cualquier dispositivo.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button render={<Link href="/register-club" />}>
            Registrar mi club
            <ArrowRight />
          </Button>
          <Button variant="secondary" render={<Link href="/login" />}>
            Iniciar sesión
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Card className="card-glow max-w-64 text-left">
            <CardHeader>
              <CardTitle>Estructura de club</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Club → Administradores → Equipos → Entrenadores y jugadores.
            </CardContent>
          </Card>
          <Card className="card-glow max-w-64 text-left">
            <CardHeader>
              <CardTitle>Pizarra táctil</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Arrastra jugadores y balón, dibuja secuencias de movimiento con líneas curvables.
            </CardContent>
          </Card>
          <Card className="card-glow max-w-64 text-left">
            <CardHeader>
              <CardTitle>Comparte jugadas</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Comparte con jugadores en modo visualización o con otros entrenadores para copiar y
              editar.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

