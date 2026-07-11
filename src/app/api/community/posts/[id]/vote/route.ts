import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

const VoteSchema = z.object({ bucket: z.enum(["low", "mid", "high"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = VoteSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  }
  const { bucket } = body.data;

  if (isDemoMode()) {
    getDemoStore().votes.set(id, bucket);
    // Consenso fabricado para el reveal en demo: solo cuenta el voto propio.
    const tally = { low: 0, mid: 0, high: 0 };
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

  const { error } = await supabase
    .from("post_votes")
    .upsert({ post_id: id, user_id: user.id, bucket }, { onConflict: "post_id,user_id" });
  if (error) {
    return NextResponse.json({ error: { code: "VOTE_FAILED", message: "No se pudo votar." } }, { status: 400 });
  }

  // Consenso fresco (ya incluye este voto): lo saca la vista agregada.
  const { data: agg } = await supabase
    .from("community_feed_view")
    .select("low_votes, mid_votes, high_votes")
    .eq("post_id", id)
    .maybeSingle();

  const tally = {
    low: agg?.low_votes ?? 0,
    mid: agg?.mid_votes ?? 0,
    high: agg?.high_votes ?? 0,
  };
  return NextResponse.json({ bucket, tally });
}
