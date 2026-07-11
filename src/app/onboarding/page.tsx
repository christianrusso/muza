"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { GENDER_OPTIONS, type UserGender } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export default function OnboardingPage() {
  const router = useRouter();
  const [gender, setGender] = useState<UserGender | null>(null);
  const [ready, setReady] = useState(DEMO_MODE);
  const [submitting, setSubmitting] = useState(false);

  // Idempotencia: si el usuario ya eligió género (llegó acá por error o refresh),
  // no lo trabamos — lo mandamos derecho al home.
  useEffect(() => {
    if (DEMO_MODE) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("gender").eq("id", user.id).single();
      if (data?.gender) {
        router.replace("/home");
        return;
      }
      setReady(true);
    });
  }, [router]);

  async function handleSubmit() {
    if (!gender || submitting) return;
    setSubmitting(true);
    if (!DEMO_MODE) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ gender }).eq("id", user.id);
        // Refresca el JWT con onboarded=true → el gate del middleware deja pasar
        // en la navegación siguiente (ver src/lib/supabase/middleware.ts).
        await supabase.auth.updateUser({ data: { onboarded: true } });
      }
    }
    router.push("/home");
    router.refresh();
  }

  if (!ready) return null;

  return (
    <div className="screen-body pad">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif italic text-[28px] leading-tight">¿Cómo te vestís?</h1>
        <p className="text-sm font-semibold text-muted">
          Nos ayuda a evaluar tu outfit con los códigos de estilo correctos. Puntuamos la ropa,
          nunca tu cuerpo.
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-3">
        {GENDER_OPTIONS.map((opt) => {
          const active = gender === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGender(opt.value)}
              aria-pressed={active}
              className={`card flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                active ? "border-coral bg-coral/10" : ""
              }`}
            >
              <MaterialIcon name={opt.icon} className={active ? "text-coral" : "text-muted"} />
              <span className="font-bold">{opt.label}</span>
              {active && <MaterialIcon name="check_circle" filled className="ml-auto text-coral" />}
            </button>
          );
        })}
      </div>

      <Button onClick={handleSubmit} disabled={!gender || submitting} className="mt-auto">
        {submitting ? "Guardando..." : "Continuar"}
      </Button>
    </div>
  );
}
