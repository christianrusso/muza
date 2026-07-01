import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { createDemoPost } from "@/lib/demoStore";

const CreatePostSchema = z.object({
  analysisId: z.string(),
  caption: z.string().optional(),
});

export async function POST(request: Request) {
  const body = CreatePostSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  }

  if (isDemoMode()) {
    const post = createDemoPost(body.data.analysisId, body.data.caption ?? null);
    return NextResponse.json({ id: post.id });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  const { data: post, error } = await supabase
    .from("community_posts")
    .insert({ user_id: user.id, analysis_id: body.data.analysisId, caption: body.data.caption })
    .select("id")
    .single();

  if (error || !post) {
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: error?.message ?? "No se pudo publicar." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: post.id });
}
