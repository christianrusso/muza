"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  }

  async function handleResend() {
    setResending(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email);
    setResending(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const token = code.join("");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    if (verifyError) {
      setSubmitting(false);
      setError(verifyError.message);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/home");
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Recuperar contraseña" backHref="/forgot-password" />

      <div className="mb-5 flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-soft">
          <MaterialIcon name="mail" size={26} className="text-coral" />
        </span>
        <p className="text-sm font-semibold text-muted">
          Te enviamos un código de 6 dígitos a tu email
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
        <Field label="Código de verificación">
          <div className="flex justify-between gap-2">
            {code.map((digit, i) => (
              <input
                key={i}
                id={`code-${i}`}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => setDigit(i, e.target.value)}
                className="input h-14 w-11 text-center text-lg"
              />
            ))}
          </div>
        </Field>

        <Field label="Nueva contraseña">
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Repetir contraseña">
          <Input
            type="password"
            placeholder="••••••••"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
          />
        </Field>

        {error && <p className="text-sm font-semibold text-[var(--red)]">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Restableciendo..." : "Restablecer contraseña"}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-center text-sm font-semibold text-muted underline"
        >
          {resending ? "Reenviando..." : "Reenviar código"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
