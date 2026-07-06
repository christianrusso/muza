import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  checkAdminCredentials,
  createAdminToken,
} from "@/lib/admin/auth";

const Body = z.object({ email: z.string(), password: z.string() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  if (!checkAdminCredentials(email, password)) {
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}
