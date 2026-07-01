"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function EditNamePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setFullName("Paula Giménez");
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setFullName(data?.full_name ?? "");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (!DEMO_MODE) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
      }
    }
    setSubmitting(false);
    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Editar nombre" backHref="/profile" />
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <Field label="Nombre">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={submitting} className="mt-auto">
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </div>
  );
}
