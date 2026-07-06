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
const PUBLIC_ROUTES = ["/legal"];

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

  // getUser() valida el token contra Supabase Auth por red en CADA request, así
  // que es un costo fijo por click. Lo medimos y lo exponemos como Server-Timing
  // (visible en el Network → Timing del navegador) para dimensionar cuánto pesa.
  const authStart = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authMs = Math.round(performance.now() - authStart);
  supabaseResponse.headers.set("Server-Timing", `auth;dur=${authMs}`);
  if (process.env.PERF_LOG) console.log(`[perf] middleware auth (${request.nextUrl.pathname}): ${authMs}ms`);

  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

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
