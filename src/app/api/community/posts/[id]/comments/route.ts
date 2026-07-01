import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

const CommentSchema = z.object({ body: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = CommentSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Comentario inválido." } }, { status: 400 });
  }

  if (isDemoMode()) {
    const post = getDemoStore().posts.get(id);
    const comment = { id: crypto.randomUUID(), body: body.data.body, createdAt: new Date().toISOString() };
    post?.comments.push(comment);
    return NextResponse.json(comment);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({ post_id: id, user_id: user.id, body: body.data.body })
    .select("id, body, created_at")
    .single();

  if (error || !comment) {
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: error?.message ?? "No se pudo comentar." } },
      { status: 500 },
    );
  }

  return NextResponse.json(comment);
}
