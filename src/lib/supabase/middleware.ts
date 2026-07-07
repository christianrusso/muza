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

// Rutas públicas: accesibles con o sin sesión, sin redirigir. Legales debe
// poder verse antes de registrarse y como URL pública (stores/footer).
// /landing.html es la landing de marketing servida en la raíz a visitantes
// sin sesión (ver rewrite de "/" más abajo).
const PUBLIC_ROUTES = ["/legal", "/landing.html"];

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
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Visitante sin sesión en la raíz: mostramos la landing de marketing (servida
  // como estático desde /public/landing.html) manteniendo la URL en "/". Los
  // usuarios con sesión siguen de largo y page.tsx los manda a /home.
  if (!user && pathname === "/") {
    return NextResponse.rewrite(new URL("/landing.html", request.url));
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
