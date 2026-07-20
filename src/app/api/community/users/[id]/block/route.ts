import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { setUserBlocked } from "@/lib/community/blocks";

const Body = z.object({ blocked: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Datos inválidos." } },
      { status: 400 },
    );
  }

  if (!isDemoMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "No autenticado." } },
        { status: 401 },
      );
    }
    if (user.id === id) {
      return NextResponse.json(
        { error: { code: "CANNOT_BLOCK_SELF", message: "No podés bloquearte." } },
        { status: 400 },
      );
    }
    const { data: target } = await supabase.from("profiles").select("id").eq("id", id).maybeSingle();
    if (!target) {
      return NextResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "Usuario no encontrado." } },
        { status: 404 },
      );
    }
  } else if (id === DEMO_USER.id) {
    return NextResponse.json(
      { error: { code: "CANNOT_BLOCK_SELF", message: "No podés bloquearte." } },
      { status: 400 },
    );
  }

  try {
    const data = await setUserBlocked(id, parsed.data.blocked);
    return NextResponse.json({ data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "BLOCK_OPERATION_FAILED";
    const known = new Set(["CANNOT_BLOCK_SELF", "USER_NOT_FOUND"]);
    const status = code === "CANNOT_BLOCK_SELF" ? 400 : code === "USER_NOT_FOUND" ? 404 : 500;
    return NextResponse.json(
      { error: { code: known.has(code) ? code : "BLOCK_OPERATION_FAILED", message: "No se pudo actualizar el bloqueo." } },
      { status },
    );
  }
}
