import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

// Marca la actividad como vista (al abrir /community/activity), limpiando el
// badge de novedades. Permitido por la policy profiles_update_own.
export async function POST() {
  if (isDemoMode()) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_activity_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "UPDATE_FAILED", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
