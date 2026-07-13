import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // El trigger handle_new_user copia la foto/nombre de Google SOLO al crear el
    // perfil. Las cuentas creadas antes de esa migración (o registradas por email y
    // luego vinculadas a Google) quedan sin avatar. Rellenamos acá lo que falte;
    // es idempotente y no pisa datos existentes.
    const user = data.user;
    if (user) {
      const meta = user.user_metadata ?? {};
      const avatarUrl = (meta.avatar_url as string) ?? (meta.picture as string) ?? null;
      const fullName = (meta.full_name as string) ?? (meta.name as string) ?? null;
      if (avatarUrl || fullName) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, full_name")
          .eq("id", user.id)
          .maybeSingle();
        const patch: { avatar_url?: string; full_name?: string } = {};
        if (avatarUrl && !profile?.avatar_url) patch.avatar_url = avatarUrl;
        if (fullName && !profile?.full_name) patch.full_name = fullName;
        if (Object.keys(patch).length > 0) {
          await supabase.from("profiles").update(patch).eq("id", user.id);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
