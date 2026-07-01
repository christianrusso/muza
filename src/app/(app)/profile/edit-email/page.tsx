"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function EditEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      setEmail("paula@ejemplo.com");
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? ""));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (DEMO_MODE) {
      setSubmitting(false);
      setMessage("Modo demo: el cambio no se guarda de verdad.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email });
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Te enviamos un email de confirmación a la nueva dirección.");
    router.refresh();
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Editar email" backHref="/profile/settings" />
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {message && <p className="text-sm font-semibold text-muted">{message}</p>}
        <Button type="submit" disabled={submitting} className="mt-auto">
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </div>
  );
}
