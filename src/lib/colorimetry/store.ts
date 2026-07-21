import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Colorimetry } from "@/types/colorimetry";
import type { Json } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Guarda (o reemplaza) la colorimetría del usuario. upsert por user_id: una por
// persona, regenerar pisa la anterior.
export async function saveColorimetry(
  supabase: SupabaseServerClient,
  userId: string,
  photoPath: string,
  data: Colorimetry,
): Promise<void> {
  const { error } = await supabase
    .from("colorimetries")
    .upsert({ user_id: userId, photo_path: photoPath, data: data as unknown as Json }, { onConflict: "user_id" });
  if (error) throw error;
}

// ¿El usuario ya tiene su colorimetría? Define el botón del home (ver vs generar)
// y el redirect de /colorimetry. head + count: no trae la fila, solo cuenta.
export async function hasColorimetry(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("colorimetries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

// La colorimetría del usuario (o null). Es una por persona (unique user_id).
export async function getUserColorimetry(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<Colorimetry | null> {
  const { data } = await supabase
    .from("colorimetries")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.data as Colorimetry | undefined) ?? null;
}
