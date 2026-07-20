import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth";
import { listCommentReports } from "@/lib/admin/commentReports";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  if (!(await verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value))) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autorizado." } }, { status: 401 });
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 25)));
  const result = await listCommentReports({ status: url.searchParams.get("status") || "pending", category: url.searchParams.get("category") || undefined, page, pageSize });
  return NextResponse.json(result);
}
