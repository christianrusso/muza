import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// URLs firmadas de las fotos de outfit, redimensionadas por contexto vía el
// parámetro `transform` de Supabase Storage (requiere Image Transformations /
// plan Pro). Supabase sirve WebP automáticamente según el `Accept` del browser.
//
// Fallback: si la transformación no estuviera disponible, se devuelve igual la
// URL firmada al tamaño original para no romper la pantalla.

export type PhotoSize = "thumb" | "feed" | "full";

const SIZES: Record<PhotoSize, { width: number; quality: number }> = {
  // grillas 2/3-col (Historial / Perfil)
  thumb: { width: 400, quality: 70 },
  // tarjetas de Comunidad
  feed: { width: 800, quality: 75 },
  // hero de resultado / detalle de post / último look en Home
  full: { width: 1200, quality: 80 },
};

const BUCKET = "outfit-photos";

export async function signedPhotoUrl(
  supabase: SupabaseClient<Database>,
  path: string,
  size: PhotoSize,
  expiresIn = 3600,
): Promise<string | null> {
  const { width, quality } = SIZES[size];

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn, { transform: { width, quality } });
  if (!error && data?.signedUrl) return data.signedUrl;

  // Sin transform (plan sin Image Transformations): servir el original.
  const { data: plain } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return plain?.signedUrl ?? null;
}

// Versión batch: firma varias rutas en paralelo y devuelve un Map path→url.
// (Se usa el singular en paralelo porque `createSignedUrls` plural no soporta
//  `transform`.)
export async function signedPhotoUrls(
  supabase: SupabaseClient<Database>,
  paths: string[],
  size: PhotoSize,
  expiresIn = 3600,
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    paths.map(async (path) => [path, await signedPhotoUrl(supabase, path, size, expiresIn)] as const),
  );
  return new Map(entries);
}
