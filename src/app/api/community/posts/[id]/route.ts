import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

// Borra una publicación propia. El RLS de community_posts ya restringe el delete
// al dueño (ver 0003); igual filtramos por user_id para fallar rápido.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isDemoMode()) {
    getDemoStore().posts.delete(id);
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  const { error } = await supabase.from("community_posts").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: { code: "DELETE_FAILED", message: "No se pudo eliminar." } }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
