"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Recuperar contraseña" backHref="/login" />
      <p className="mb-5 text-sm font-semibold text-muted">
        Ingresá tu email y te enviamos un código de 6 dígitos para restablecer tu contraseña.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <Field label="Email">
          <Input
            type="email"
            placeholder="vos@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        {error && <p className="text-sm font-semibold text-[var(--red)]">{error}</p>}
        <Button type="submit" disabled={submitting} className="mt-auto">
          {submitting ? "Enviando..." : "Enviar código"}
        </Button>
      </form>
    </div>
  );
}
