"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { translateAuthError } from "@/lib/supabase/authErrors";

const RULES = [
  { key: "length", label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  {
    key: "case",
    label: "Una mayúscula y una minúscula",
    test: (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v),
  },
  { key: "number", label: "Un número", test: (v: string) => /\d/.test(v) },
  {
    key: "special",
    label: "Un carácter especial",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const ruleResults = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allRulesOk = ruleResults.every((r) => r.ok);
  const passwordsMatch = password.length > 0 && password === repeatPassword;
  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && allRulesOk && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    if (DEMO_MODE) {
      router.push("/home");
      return;
    }
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message);
      return;
    }
    await supabase.auth.signOut();
    setSuccess(true);
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Crear cuenta" backHref="/welcome" />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <Field label="Nombre">
          <Input
            placeholder="Tu nombre"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            placeholder="vos@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Contraseña">
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            validity={password.length === 0 ? "neutral" : allRulesOk ? "ok" : "err"}
            required
          />
        </Field>

        <div className="flex flex-col gap-2">
          {ruleResults.map((rule) => (
            <div key={rule.key} className="flex items-center gap-2 text-sm font-semibold">
              <MaterialIcon
                name={rule.ok ? "check_circle" : "radio_button_unchecked"}
                size={18}
                className={rule.ok ? "text-[var(--green)]" : "text-faint"}
              />
              <span className={rule.ok ? "text-ink" : "text-faint"}>{rule.label}</span>
            </div>
          ))}
        </div>

        <Field label="Repetir contraseña">
          <Input
            type="password"
            placeholder="••••••••"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            validity={repeatPassword.length === 0 ? "neutral" : passwordsMatch ? "ok" : "err"}
            required
          />
        </Field>

        {error && <Banner variant="error">{translateAuthError(error)}</Banner>}
        {success && (
          <Banner variant="success">¡Cuenta creada con éxito! Ya podés iniciar sesión.</Banner>
        )}

        <Button type="submit" disabled={!canSubmit || submitting || success} className="mt-auto">
          {success ? "Listo" : submitting ? "Creando..." : "Crear cuenta"}
        </Button>
        <p className="text-center text-sm font-semibold text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-bold text-coral">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
