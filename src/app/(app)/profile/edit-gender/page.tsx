"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { GENDER_OPTIONS, type UserGender } from "@/types/domain";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Button } from "@/components/ui/Button";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export default function EditGenderPage() {
  const router = useRouter();
  const [gender, setGender] = useState<UserGender | null>(() => (DEMO_MODE ? "femenino" : null));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("gender").eq("id", user.id).single();
      if (data?.gender) setGender(data.gender);
    });
  }, []);

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
      }
    }
    setSubmitting(false);
    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Género" backHref="/profile" />
      <div className="flex flex-1 flex-col gap-3">
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
        <Button onClick={handleSubmit} disabled={!gender || submitting} className="mt-auto">
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
