import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { emptyTally } from "@/lib/community/constants";
import { isPostBlocked } from "@/lib/community/blocks";

// Los votos son los 4 niveles de la escala (ver SCORE_LEVELS).
const VoteSchema = z.object({ bucket: z.enum(["mejorar", "bien", "muy_bueno", "impecable"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = VoteSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  }
  const { bucket } = body.data;

  if (isDemoMode()) {
    if (await isPostBlocked(id)) {
      return NextResponse.json(
        { error: { code: "BLOCKED_RELATION", message: "No podés interactuar con este usuario." } },
        { status: 403 },
      );
    }
    getDemoStore().votes.set(id, bucket);
    // Consenso fabricado para el reveal en demo: solo cuenta el voto propio.
    const tally = emptyTally();
    tally[bucket] = 1;
    return NextResponse.json({ bucket, tally });
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

  const { error } = await supabase
    .from("post_votes")
    .upsert({ post_id: id, user_id: user.id, bucket }, { onConflict: "post_id,user_id" });
  if (error) {
    return NextResponse.json({ error: { code: "VOTE_FAILED", message: "No se pudo votar." } }, { status: 400 });
  }

  // Consenso fresco (ya incluye este voto): lo saca la vista agregada.
  const { data: agg } = await supabase
    .from("community_feed_view")
    .select("votes_mejorar, votes_bien, votes_muy_bueno, votes_impecable")
    .eq("post_id", id)
    .maybeSingle();

  const tally = {
    mejorar: agg?.votes_mejorar ?? 0,
    bien: agg?.votes_bien ?? 0,
    muy_bueno: agg?.votes_muy_bueno ?? 0,
    impecable: agg?.votes_impecable ?? 0,
  };
  return NextResponse.json({ bucket, tally });
}
