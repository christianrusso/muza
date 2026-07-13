import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canCreateAnalysis } from "@/lib/plans/gating";
import { isDemoMode } from "@/lib/demo";
import { createDemoAnalysis } from "@/lib/demoStore";
import { getPostHogClient } from "@/lib/posthog-server";
import type { OccasionId } from "@/types/domain";

const CreateAnalysisSchema = z.object({
  occasionId: z.string(),
  occasionVariant: z.string().nullable().optional(),
  occasionContext: z.string().trim().max(200).nullable().optional(),
  photoPath: z.string().optional(),
  photoDataUrl: z.string().optional(),
});

export async function POST(request: Request) {
  const body = CreateAnalysisSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Datos inválidos." } },
      { status: 400 },
    );
  }

  if (isDemoMode()) {
    const analysis = createDemoAnalysis(
      body.data.occasionId as OccasionId,
      body.data.photoDataUrl ?? null,
    );
    return NextResponse.json({ id: analysis.id });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  if (!body.data.photoPath) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Falta la foto." } },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  const periodMonth = new Date();
  periodMonth.setDate(1);
  const { data: usage } = await supabase
    .from("plan_usage")
    .select("analyses_count")
    .eq("user_id", user.id)
    .eq("period_month", periodMonth.toISOString().slice(0, 10))
    .maybeSingle();

  const allowed = canCreateAnalysis({
    planTier: (profile?.plan_tier as "free" | "pro") ?? "free",
    currentMonthCount: usage?.analyses_count ?? 0,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: { code: "PLAN_LIMIT_REACHED", message: "Alcanzaste el límite de análisis de tu plan." } },
      { status: 403 },
    );
  }

  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert({
      user_id: user.id,
      occasion_id: body.data.occasionId,
      occasion_variant: body.data.occasionVariant ?? null,
      occasion_context: body.data.occasionContext || null,
      photo_path: body.data.photoPath,
    })
    .select("id")
    .single();

  if (error || !analysis) {
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: error?.message ?? "No se pudo crear el análisis." } },
      { status: 500 },
    );
  }

  const ph = getPostHogClient();
  ph.capture({
    distinctId: user.id,
    event: "analysis_created",
    properties: {
      occasion_id: body.data.occasionId,
      occasion_variant: body.data.occasionVariant ?? null,
      plan_tier: profile?.plan_tier ?? "free",
    },
  });
  await ph.shutdown();

  return NextResponse.json({ id: analysis.id });
}
