import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { challengeDate, buildReveal, getStreak, demoReveal } from "@/lib/challenge/challenge";

const bodySchema = z.object({ pickedPostId: z.string().min(1) });

// Responde el reto del día: revela ganador + scores + por qué, y dice si acertó.
// Autenticado: persiste el intento (uno por día, no se puede cambiar) y devuelve
// la racha. Invitado: revela igual pero no persiste (streak null) — el muro para
// guardar la racha lo maneja la UI.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Falta pickedPostId." } }, { status: 400 });
  }
  const { pickedPostId } = parsed.data;

  if (isDemoMode()) {
    const reveal = demoReveal();
    return NextResponse.json({
      correct: pickedPostId === reveal.winnerPostId,
      reveal,
      streak: 1,
    });
  }

  const date = challengeDate();
  const reveal = await buildReveal(date);
  if (!reveal) {
    return NextResponse.json({ error: { code: "NO_CHALLENGE", message: "No hay reto hoy." } }, { status: 404 });
  }
  if (!(pickedPostId in reveal.scores)) {
    return NextResponse.json({ error: { code: "INVALID_PICK", message: "Ese look no es del reto." } }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Invitado: revela pero no guarda. La racha vive en el cliente hasta que registre.
  if (!user) {
    return NextResponse.json({
      correct: pickedPostId === reveal.winnerPostId,
      reveal,
      streak: null,
    });
  }

  const correct = pickedPostId === reveal.winnerPostId;

  // Uno por día: si ya respondió, respetamos su respuesta original.
  const { error } = await supabase
    .from("challenge_attempts")
    .insert({ user_id: user.id, challenge_date: date, picked_post_id: pickedPostId, correct });
  let finalCorrect = correct;
  if (error) {
    const { data: existing } = await supabase
      .from("challenge_attempts")
      .select("correct")
      .eq("user_id", user.id)
      .eq("challenge_date", date)
      .maybeSingle();
    if (existing) finalCorrect = existing.correct;
  }

  const streak = await getStreak(supabase, user.id, date);
  return NextResponse.json({ correct: finalCorrect, reveal, streak });
}
