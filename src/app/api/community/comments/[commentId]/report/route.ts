import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { createDemoCommentReport } from "@/lib/demoStore";

const Body = z.object({ categoryId: z.string().uuid(), observations: z.string().optional() });
const messages: Record<string, [string, number, string]> = {
  UNAUTHENTICATED: ["UNAUTHENTICATED", 401, "Iniciá sesión para reportar."],
  OWN_COMMENT: ["OWN_COMMENT", 403, "No podés reportar tu propio comentario."],
  COMMENT_NOT_FOUND: ["COMMENT_NOT_FOUND", 404, "El comentario ya no está disponible."],
  DUPLICATE_REPORT: ["DUPLICATE_REPORT", 409, "Ya recibimos tu reporte."],
  OBSERVATIONS_REQUIRED: ["INVALID_BODY", 400, "Agregá observaciones para la categoría Otro."],
  INVALID_CATEGORY: ["INVALID_BODY", 400, "La categoría no es válida."],
  OBSERVATIONS_TOO_LONG: ["INVALID_BODY", 400, "Las observaciones no pueden superar 1000 caracteres."],
};

function failure(code: string, status: number, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.observations?.trim().length ?? 0) > 1000) {
    return failure("INVALID_BODY", 400, "El reporte no es válido.");
  }
  if (isDemoMode()) {
    try {
      const report = createDemoCommentReport(commentId, parsed.data.categoryId, parsed.data.observations);
      return NextResponse.json({ data: report }, { status: 201 });
    } catch (e) {
      const key = e instanceof Error ? e.message : "CREATE_FAILED";
      const [code, status, message] = messages[key] ?? ["CREATE_FAILED", 500, "No se pudo enviar el reporte."];
      return failure(code, status, message);
    }
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_comment_report", {
    p_comment_id: commentId,
    p_category_id: parsed.data.categoryId,
    p_observations: parsed.data.observations?.trim() || null,
  });
  if (error) {
    const [code, status, message] = messages[error.message] ?? ["CREATE_FAILED", 500, "No se pudo enviar el reporte."];
    return failure(code, status, message);
  }
  return NextResponse.json({ data }, { status: 201 });
}
