import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { setUserBlocked } from "@/lib/admin/users";

const Body = z.object({ blocked: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // El proxy ya gatea /admin, pero esta ruta banea cuentas: revalidamos acá.
  const cookieStore = await cookies();
  if (!(await verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Usuario inválido." }, { status: 400 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    await setUserBlocked(id, parsed.data.blocked);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
