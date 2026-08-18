"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/components/forms/ActionForm";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function registerClub(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clubName = String(formData.get("clubName") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#1d4ed8");
  const secondaryColor = String(formData.get("secondaryColor") ?? "#f97316");
  const adminName = String(formData.get("adminName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const logo = formData.get("logo") as File | null;

  if (!clubName || !adminName || !email || !password) {
    return { error: "Todos los campos obligatorios deben rellenarse." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: adminName } },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return {
      error:
        "Revisa tu correo para confirmar la cuenta antes de continuar con el alta del club.",
    };
  }

  let logoUrl: string | null = null;
  // Uses the service-role client: the caller may not have an active session yet if
  // Supabase's "confirm email" setting is enabled, which would fail these under RLS.
  const admin = createAdminClient();

  if (logo && logo.size > 0) {
    const extension = logo.name.split(".").pop() ?? "png";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("club-logos")
      .upload(path, logo, { contentType: logo.type, upsert: true });

    if (!uploadError) {
      const { data: publicUrl } = admin.storage.from("club-logos").getPublicUrl(path);
      logoUrl = publicUrl.publicUrl;
    }
  }

  const slug = `${slugify(clubName)}-${Math.random().toString(36).slice(2, 7)}`;

  const { error: clubError } = await admin.from("clubs").insert({
    name: clubName,
    slug,
    logo_url: logoUrl,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    created_by: userId,
  });

  if (clubError) {
    return { error: clubError.message };
  }

  // No active session yet means Supabase's "confirm email" setting is on: the account and
  // club were created, but the user must confirm their email before they can log in.
  if (!signUpData.session) {
    return { success: true };
  }

  redirect("/dashboard");
}

export async function updateClub(
  clubId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#1d4ed8");
  const secondaryColor = String(formData.get("secondaryColor") ?? "#f97316");
  const logo = formData.get("logo") as File | null;

  if (!name) return { error: "El nombre del club es obligatorio." };

  const supabase = await createClient();

  const update: {
    name: string;
    primary_color: string;
    secondary_color: string;
    logo_url?: string;
  } = {
    name,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
  };

  if (logo && logo.size > 0) {
    const extension = logo.name.split(".").pop() ?? "png";
    const path = `${clubId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("club-logos")
      .upload(path, logo, { contentType: logo.type, upsert: true });

    if (uploadError) return { error: uploadError.message };

    const { data: publicUrl } = supabase.storage.from("club-logos").getPublicUrl(path);
    update.logo_url = publicUrl.publicUrl;
  }

  // RLS ("club admins can update their club") restricts this to owner/admin members of clubId.
  const { error } = await supabase.from("clubs").update(update).eq("id", clubId);
  if (error) return { error: error.message };

  revalidatePath("/club");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { success: true };
}
