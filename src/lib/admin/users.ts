import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedPhotoUrls } from "@/lib/supabase/photos";

// Forma de cada fila que devuelve public.admin_users_list().
export type AdminUser = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  plan_tier: "free" | "pro";
  gender: "masculino" | "femenino" | "no_especifica" | null;
  created_at: string;
  blocked_at: string | null;
  last_sign_in_at: string | null;
  analyses: number;
  analyses_valid: number;
  avg_score: number | null;
  last_analysis_at: string | null;
  posts: number;
  comments: number;
  votes: number;
  votes_received: number;
  likes_given: number;
  likes_received: number;
  followers: number;
  following: number;
  ai_cost_usd: number;
};

export async function getAdminUsers(search?: string): Promise<AdminUser[]> {
  const admin = createAdminClient();
  // admin_users_list no está en los tipos generados de la DB; cast puntual.
  const { data, error } = await admin.rpc("admin_users_list" as never, {
    p_search: search?.trim() || null,
  } as never);
  if (error) {
    throw new Error(`admin_users_list falló: ${error.message}`);
  }
  return (data ?? []) as unknown as AdminUser[];
}

// ---------------------------------------------------------------------------
// Detalle de un usuario (ficha + sus fotos)
// ---------------------------------------------------------------------------

export type AdminUserAnalysis = {
  id: string;
  photo_path: string;
  analysis_type: "completo" | "superior" | "inferior" | "individual" | null;
  validity_status: "pending" | "valid" | "partial" | "invalid";
  overall_score: number | null;
  created_at: string;
  occasion: string;
  post_id: string | null;
  caption: string | null;
  post_likes: number;
  // Firmadas acá, no en la DB: la RPC solo devuelve photo_path.
  thumbUrl: string | null;
  fullUrl: string | null;
};

// admin_user_detail nació devolviendo MENOS campos que admin_users_list, pero
// las dos se tipaban como AdminUser a secas. El tipo mentía y TypeScript no
// podía verlo (las RPC van casteadas), así que leer un campo faltante compilaba
// y explotaba en runtime — se comió la ficha entera con "Algo salió mal".
//
// 0021 los agrega, pero el tipo los deja opcionales igual: entre que se deploya
// el código y se aplica la migración, la función vieja sigue viva. Marcarlos
// opcionales obliga a manejar ese hueco en vez de confiar en que ya está.
type DetailLateField = "analyses_valid" | "likes_given" | "last_analysis_at";

export type AdminUserDetailUser = Omit<AdminUser, DetailLateField> &
  Partial<Pick<AdminUser, DetailLateField>>;

export type AdminUserDetail = {
  user: AdminUserDetailUser;
  analyses: AdminUserAnalysis[];
};

const DETAIL_PHOTO_LIMIT = 60;

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_user_detail" as never, {
    p_user_id: userId,
    p_limit: DETAIL_PHOTO_LIMIT,
  } as never);
  if (error) {
    throw new Error(`admin_user_detail falló: ${error.message}`);
  }

  const detail = data as unknown as {
    user: AdminUserDetailUser | null;
    analyses: Omit<AdminUserAnalysis, "thumbUrl" | "fullUrl">[] | null;
  } | null;
  if (!detail?.user) return null;

  // Si la RPC devolviera el usuario sin la lista, este .map de abajo tiraba
  // TypeError dentro del try del page y se veía como un error de carga.
  const rows = detail.analyses ?? [];

  // Las fotos están en un bucket privado; el cliente service-role puede firmar
  // las de cualquier usuario. `thumb` para la grilla y `full` para el visor, en
  // paralelo (cada firma es un round-trip a Storage).
  const paths = rows.map((a) => a.photo_path);
  const [thumbs, fulls] = await Promise.all([
    signedPhotoUrls(admin, paths, "thumb"),
    signedPhotoUrls(admin, paths, "full"),
  ]);

  return {
    user: detail.user,
    analyses: rows.map((a) => ({
      ...a,
      thumbUrl: thumbs.get(a.photo_path) ?? null,
      fullUrl: fulls.get(a.photo_path) ?? null,
    })),
  };
}

export const ADMIN_DETAIL_PHOTO_LIMIT = DETAIL_PHOTO_LIMIT;

// Bloqueo en dos capas — ver el comentario de 0019_admin_users.sql:
//   - banned_until en auth: le corta el login y el refresh del token.
//   - blocked_at + RLS: le corta las escrituras ya mismo, aunque le quede un
//     access token vivo (los tokens duran hasta 1h y no se pueden revocar).
// signOut global además invalida los refresh tokens que ya tenga emitidos.
const BAN_DURATION = "876000h"; // ~100 años = indefinido; "none" lo levanta.

export async function setUserBlocked(userId: string, blocked: boolean): Promise<void> {
  const admin = createAdminClient();

  const { error: rpcError } = await admin.rpc("admin_set_user_blocked" as never, {
    p_user_id: userId,
    p_blocked: blocked,
  } as never);
  if (rpcError) {
    throw new Error(`admin_set_user_blocked falló: ${rpcError.message}`);
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? BAN_DURATION : "none",
  });
  if (banError) {
    // La marca en profiles ya quedó puesta y RLS la respeta, pero sin el ban el
    // usuario podría seguir entrando a mirar. Revertimos para no dejar el
    // bloqueo a medias y que el panel muestre un estado que no es real.
    await admin.rpc("admin_set_user_blocked" as never, {
      p_user_id: userId,
      p_blocked: !blocked,
    } as never);
    throw new Error(`No se pudo ${blocked ? "banear" : "desbanear"} en auth: ${banError.message}`);
  }

  if (blocked) {
    // Mata los refresh tokens vigentes. Si falla no revertimos: el bloqueo ya es
    // efectivo (RLS + ban), esto solo acelera el cierre de sesión.
    await admin.auth.admin.signOut(userId, "global").catch(() => {});
  }
}
