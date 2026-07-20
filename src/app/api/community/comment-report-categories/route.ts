import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

const categories = [
  ["00000000-0000-4000-8000-000000000001", "harassment_bullying", "Acoso o bullying", 1],
  ["00000000-0000-4000-8000-000000000002", "hate_discrimination", "Discurso de odio o discriminación", 2],
  ["00000000-0000-4000-8000-000000000003", "threats_violence", "Amenazas o violencia", 3],
  ["00000000-0000-4000-8000-000000000004", "sexual_inappropriate", "Contenido sexual o inapropiado", 4],
  ["00000000-0000-4000-8000-000000000005", "spam_advertising", "Spam o publicidad", 5],
  ["00000000-0000-4000-8000-000000000006", "personal_information", "Información personal", 6],
  ["00000000-0000-4000-8000-000000000007", "other", "Otro", 7],
].map(([id, slug, label, sortOrder]) => ({ id, slug, label, sortOrder }));

export async function GET() {
  if (isDemoMode()) return NextResponse.json({ data: categories });
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  const { data, error } = await supabase.from("comment_report_categories").select("id, slug, label, sort_order").eq("is_active", true).order("sort_order");
  if (error) return NextResponse.json({ error: { code: "LOAD_FAILED", message: "No se pudieron cargar las categorías." } }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).map((c) => ({ ...c, sortOrder: c.sort_order })) });
}
