import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { isPostBlocked } from "@/lib/community/blocks";

const ReactSchema = z.object({ reaction: z.enum(["like", "dislike"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = ReactSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  }

  if (isDemoMode()) {
    if (await isPostBlocked(id)) {
      return NextResponse.json(
        { error: { code: "BLOCKED_RELATION", message: "No podés interactuar con este usuario." } },
        { status: 403 },
      );
    }
    const post = getDemoStore().posts.get(id);
    if (post) {
      const current = post.reactions.get(DEMO_USER.id);
      if (current === body.data.reaction) {
        post.reactions.delete(DEMO_USER.id);
        return NextResponse.json({ reaction: null });
      }
      post.reactions.set(DEMO_USER.id, body.data.reaction);
    }
    return NextResponse.json({ reaction: body.data.reaction });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  if (await isPostBlocked(id)) {
    return NextResponse.json(
      { error: { code: "BLOCKED_RELATION", message: "No podés interactuar con este usuario." } },
      { status: 403 },
    );
  }

  const { data: existing } = await supabase
    .from("post_reactions")
    .select("id, reaction")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing && existing.reaction === body.data.reaction) {
    await supabase.from("post_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ reaction: null });
  }

  if (existing) {
    await supabase.from("post_reactions").update({ reaction: body.data.reaction }).eq("id", existing.id);
  } else {
    await supabase
      .from("post_reactions")
      .insert({ post_id: id, user_id: user.id, reaction: body.data.reaction });
  }

  return NextResponse.json({ reaction: body.data.reaction });
}
