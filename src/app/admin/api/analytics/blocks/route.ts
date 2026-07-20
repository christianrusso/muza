import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { getAdminBlockMetrics } from "@/lib/admin/blockMetrics";

export async function GET() {
  const cookieStore = await cookies();
  if (!(await verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json({ data: await getAdminBlockMetrics() });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las métricas." }, { status: 500 });
  }
}
