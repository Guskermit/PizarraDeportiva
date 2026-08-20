import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/AppSidebar";
import { getBrandColorVars } from "@/lib/theme/brandColors";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: adminOfRaw }, { data: profileRaw }] = await Promise.all([
    supabase
      .from("club_admins")
      .select("role, clubs(name, logo_url, primary_color, secondary_color)")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const adminOf = adminOfRaw as unknown as
    | {
        role: string;
        clubs: {
          name: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
        };
      }
    | null;
  const profile = profileRaw as unknown as { full_name: string } | null;

  const clubName = adminOf?.clubs?.name;
  const clubLogoUrl = adminOf?.clubs?.logo_url;
  const isClubAdmin = !!adminOf;
  const brandVars = getBrandColorVars(
    adminOf?.clubs?.primary_color,
    adminOf?.clubs?.secondary_color,
  );

  const fullName = profile?.full_name;
  const firstName = fullName?.split(" ")[0] ?? "Entrenador";

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row" style={brandVars}>
      <AppSidebar
        clubName={clubName}
        clubLogoUrl={clubLogoUrl}
        userName={fullName}
        isClubAdmin={isClubAdmin}
      />
      <div className="flex w-full flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="grid gap-0.5">
            <p className="text-sm font-medium">Hola, {firstName} 👋</p>
            <p className="text-xs text-muted-foreground">Bienvenido a tu pizarra táctica</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Avatar size="sm">
              <AvatarFallback>{getInitials(fullName ?? "PD")}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="flex w-full flex-col items-center gap-6 p-4 md:p-8">
          <div className="w-full max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}

