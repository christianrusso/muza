import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { resolveCommentReport } from "@/lib/admin/commentReports";

const Body = z.object({ status: z.enum(["confirmed", "dismissed"]), adminNotes: z.string().max(2000).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const cookieStore = await cookies();
  if (!(await verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value))) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autorizado." } }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  try {
    const data = await resolveCommentReport((await params).reportId, parsed.data.status, "admin", parsed.data.adminNotes?.trim() || null);
    return NextResponse.json({ data });
  } catch (e) {
    const code = e instanceof Error ? e.message : "RESOLVE_FAILED";
    const status = code === "REPORT_NOT_FOUND" ? 404 : code === "REPORT_ALREADY_RESOLVED" ? 409 : 500;
    return NextResponse.json({ error: { code, message: status === 409 ? "Este reporte ya fue resuelto." : "No se pudo resolver el reporte." } }, { status });
  }
}
