import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const AUTH_ROUTES = [
  "/welcome",
  "/register",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

/**
 * Rutas públicas: accesibles con o sin sesión, sin redirigir. El invitado puede
 * VER lo que está acá; cualquier acción se la corta el muro de registro del
 * lado del cliente (ver components/community/GuestGate).
 *
 * Se evalúa con reglas explícitas en vez de una lista de prefijos porque dentro
 * de /community conviven rutas públicas y privadas, y un startsWith("/community")
 * abriría /community/publish y /community/activity sin querer.
 */
function isPublicPath(pathname: string): boolean {
  // Legales: visible antes de registrarse y como URL pública (stores/footer).
  if (pathname === "/legal") return true;
  // Landing de marketing servida en la raíz a visitantes sin sesión (ver rewrite
  // de "/" más abajo).
  if (pathname === "/landing.html") return true;
  // Post compartido: para que los links se abran sin login.
  if (pathname.startsWith("/community/post/")) return true;
  // Feed "Descubrí". Exacto a propósito: /community/publish y /community/activity
  // siguen siendo privadas.
  if (pathname === "/community") return true;
  // Home: el invitado puede verla (sale con los estados vacíos y la propuesta de
  // valor). El muro salta recién al tocar "nuevo análisis" — /analysis/new sigue
  // privada porque ahí arranca el flujo que termina en una llamada paga a la IA.
  if (pathname === "/home") return true;
  // Reto del día: el invitado puede jugarlo entero (es el gancho de adquisición).
  // El muro salta recién al querer guardar la racha (ver ChallengeGame). El POST
  // de respuesta revela sin persistir para invitados, así que también es público:
  // sin esto, el fetch del invitado se redirige a /welcome y el juego no revela.
  if (pathname === "/challenge") return true;
  if (pathname === "/api/challenge/answer") return true;
  // Ojo: /community/user/<id> NO es pública. El perfil muestra el portfolio de
  // looks con sus scores, así que dejar entrar a un invitado le permitiría
  // saltearse el juego del deck ("adiviná el score") sin votar. Los links a
  // perfiles le abren el muro antes de navegar (ver components/community/AuthorLink).
  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Local dev without Supabase credentials configured yet: skip auth/session
  // handling entirely rather than crashing every request. Production always
  // has these set, so this never applies outside of an incomplete local setup.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims() verifica el JWT LOCALMENTE si el proyecto tiene JWT signing keys
  // asimétricas habilitadas (Supabase → Auth → JWT/Signing Keys). Eso elimina el
  // round-trip a Supabase Auth que hacía getUser() en cada request: el middleware
  // corre en el edge (São Paulo) y Supabase está en US East, así que cada getUser
  // cruzaba de región (~170ms por click, medido). getSession() interno sigue
  // refrescando la cookie cuando corresponde. Si las signing keys todavía NO están
  // habilitadas, getClaims cae de forma segura a getUser() (mismo comportamiento
  // de hoy, cero regresión). El router solo necesita saber si hay sesión válida;
  // las páginas siguen validando con getUser() (misma región = rápido).
  const authStart = performance.now();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;
  const authMs = Math.round(performance.now() - authStart);
  supabaseResponse.headers.set("Server-Timing", `auth;dur=${authMs}`);
  if (process.env.PERF_LOG) console.log(`[perf] middleware auth (${request.nextUrl.pathname}): ${authMs}ms`);

  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = isPublicPath(pathname);

  // Visitante sin sesión en la raíz: mostramos la landing de marketing (servida
  // como estático desde /public/landing.html) manteniendo la URL en "/". Los
  // usuarios con sesión siguen de largo y page.tsx los manda a /home.
  if (!user && pathname === "/") {
    return NextResponse.rewrite(new URL("/landing.html", request.url));
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    // Guardamos la ruta pedida en `next` para volver a ella después del login
    // (deep links de posts compartidos, etc.). /home es el default, así que no
    // ensuciamos la URL con ?next=/home.
    const next = pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = "";
    if (next !== "/home") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Onboarding obligatorio (género): mientras el usuario no lo completó, cae acá.
  // El flag viaja en user_metadata dentro del JWT → lectura zero-DB desde los
  // claims (misma optimización edge→Supabase que getClaims). Se setea con
  // supabase.auth.updateUser({ data: { onboarded: true } }) al elegir el género,
  // lo que refresca el token y libera el gate en la navegación siguiente.
  // Excluimos /api (rompería las llamadas del scoring) y /onboarding (loop).
  const onboarded = Boolean(
    (user as { user_metadata?: { onboarded?: boolean } } | null)?.user_metadata?.onboarded,
  );
  if (user && !onboarded && pathname !== "/onboarding" && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    // El onboarding se mete ENTRE el registro y el destino que el usuario venía
    // buscando, así que hay que pasarle el `next` en vez de descartarlo: sin
    // esto, todo el que se registra desde un muro o un link compartido termina
    // en /home y pierde la acción que lo trajo. /onboarding lo reenvía al
    // terminar (ver onboarding/page.tsx).
    const intended = pathname + request.nextUrl.search;
    if (intended !== "/home") url.searchParams.set("next", intended);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
