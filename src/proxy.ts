import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";

// Rutas del panel accesibles SIN sesión de admin: el login y su POST.
const ADMIN_PUBLIC = ["/admin/login", "/admin/api/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El panel /admin tiene autenticación propia (email+password → cookie firmada),
  // independiente del login de usuarios de la app. Lo resolvemos acá, antes de
  // updateSession, para que la lógica de sesión de Supabase no lo redirija a
  // /welcome.
  if (pathname.startsWith("/admin")) {
    const authed = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
    if (authed) {
      // Ya logueado: no tiene sentido mostrarle el login de nuevo.
      if (pathname === "/admin/login") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }
    const isPublic = ADMIN_PUBLIC.some((route) => pathname === route);
    if (isPublic) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
