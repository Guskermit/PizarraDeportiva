import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateClub } from "@/lib/actions/clubs";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ClientColorInput } from "@/components/forms/ClientColorInput";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export default async function ClubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminRaw } = await supabase
    .from("club_admins")
    .select("role, clubs(id, name, logo_url, primary_color, secondary_color)")
    .eq("profile_id", user!.id)
    .limit(1)
    .maybeSingle();

  const admin = adminRaw as unknown as
    | {
        role: string;
        clubs: {
          id: string;
          name: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
        };
      }
    | null;

  if (!admin) redirect("/dashboard");

  const club = admin.clubs;

  return (
    <div className="grid w-full gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Tu club</h1>
        <p className="text-muted-foreground">
          Rol: {admin.role === "owner" ? "Propietario" : "Administrador"}
        </p>
      </div>

      <Card className="max-w-lg">
        <CardContent className="grid gap-5">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-16">
              {club.logo_url && <AvatarImage src={club.logo_url} alt={club.name} />}
              <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{club.name}</span>
          </div>

          <ActionForm action={updateClub.bind(null, club.id)} onSuccessMessage="Club actualizado.">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nombre del club</Label>
                <Input id="name" name="name" defaultValue={club.name} required />
              </div>
              <div className="grid gap-4">
                <ClientColorInput
                  id="primaryColor"
                  name="primaryColor"
                  label="Color principal (equipo local)"
                  defaultValue={club.primary_color}
                />
                <ClientColorInput
                  id="secondaryColor"
                  name="secondaryColor"
                  label="Color secundario (equipo visitante)"
                  defaultValue={club.secondary_color}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="logo">Logo del club</Label>
                <Input id="logo" name="logo" type="file" accept="image/*" />
              </div>
              <div className="mt-2">
                <SubmitButton>Guardar cambios</SubmitButton>
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}

