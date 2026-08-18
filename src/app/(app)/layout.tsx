import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/AppSidebar";
import { getBrandColorVars } from "@/lib/theme/brandColors";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: adminOfRaw }, { data: profileRaw }] = await Promise.all([
    supabase
      .from("club_admins")
      .select("clubs(name, logo_url, primary_color)")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const adminOf = adminOfRaw as unknown as
    | { clubs: { name: string; logo_url: string | null; primary_color: string } }
    | null;
  const profile = profileRaw as unknown as { full_name: string } | null;

  const clubName = adminOf?.clubs?.name;
  const clubLogoUrl = adminOf?.clubs?.logo_url;
  const brandVars = getBrandColorVars(adminOf?.clubs?.primary_color);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row" style={brandVars}>
      <AppSidebar clubName={clubName} clubLogoUrl={clubLogoUrl} userName={profile?.full_name} />
      <div className="flex w-full flex-col items-center gap-6 overflow-y-auto p-4 md:p-8">
        <div className="w-full max-w-5xl">{children}</div>
      </div>
    </div>
  );
}

