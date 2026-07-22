import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

// Marca que el usuario compartió un look por primera vez (gate blando de
// colorimetría, ver migración 0033). Lo llama el botón de compartir del resultado
// tras abrir el share sheet / descargar la imagen. Idempotente: solo escribe si
// first_shared_at estaba en NULL, así el timestamp queda en la PRIMERA vez.
// Permitido por la policy profiles_update_own.
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
    .update({ first_shared_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("first_shared_at", null);

  if (error) {
    return NextResponse.json(
      { error: { code: "UPDATE_FAILED", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
