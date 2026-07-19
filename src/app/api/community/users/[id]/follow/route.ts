import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { isBlockedWith } from "@/lib/community/blocks";

// Toggle de seguir/dejar de seguir a un usuario. Devuelve el estado resultante.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params;

  if (isDemoMode()) {
    const follows = getDemoStore().follows;
    if (await isBlockedWith(targetId)) {
      return NextResponse.json(
        { error: { code: "BLOCKED_RELATION", message: "No podés interactuar con este usuario." } },
        { status: 403 },
      );
    }
    const following = !follows.has(targetId);
    if (following) follows.add(targetId);
    else follows.delete(targetId);
    return NextResponse.json({ following });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }
  if (user.id === targetId) {
    return NextResponse.json({ error: { code: "CANNOT_FOLLOW_SELF", message: "No podés seguirte." } }, { status: 400 });
  }

  if (await isBlockedWith(targetId, user.id)) {
    return NextResponse.json(
      { error: { code: "BLOCKED_RELATION", message: "No podés interactuar con este usuario." } },
      { status: 403 },
    );
  }

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    return NextResponse.json({ following: false });
  }

  await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
  return NextResponse.json({ following: true });
}
