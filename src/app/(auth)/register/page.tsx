"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { nextQuery, safeNextPath } from "@/lib/redirect";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { translateAuthError } from "@/lib/supabase/authErrors";
import { track } from "@/lib/analytics";

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
  // Destino post-login (deep link compartido). Ver welcome/page.tsx. Con verif.
  // de email el registro termina en /login, así que solo propagamos next a esos
  // links; el OAuth/redirect real lo resuelve la pantalla de login.
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next"));
  }, []);
  const nextSuffix = nextQuery(next);

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
      router.push(safeNextPath(next));
      return;
    }
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message);
      return;
    }
    // La cuenta se creó (con o sin sesión inmediata según la verif. de email).
    track("signed_up", { method: "password" });
    // Meta + TikTok Ads: mismo eventId en el pixel del navegador y en la API
    // server-side de cada plataforma, para que cada una dedupe su propio par.
    const metaEventId = crypto.randomUUID();
    const tiktokEventId = crypto.randomUUID();
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {}, { eventID: metaEventId });
    }
    if (typeof window !== "undefined" && window.ttq) {
      window.ttq.track("CompleteRegistration", {}, { event_id: tiktokEventId });
    }
    fetch("/api/analytics/complete-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, metaEventId, tiktokEventId }),
    }).catch(() => {
      // no-op: nunca romper el flujo de registro por un fallo de tracking
    });
    // PROVISORIO: registro sin validación de email para bajar la fricción. El
    // interruptor real es el Dashboard de Supabase → Authentication → Email →
    // "Confirm email" en OFF. Con eso desactivado, signUp devuelve sesión y el
    // usuario entra directo. Para volver a exigir verificación, reactivá ese
    // toggle: al no venir sesión caemos automáticamente al aviso de "revisá tu
    // correo" de abajo (sin tocar este código).
    if (data.session) {
      router.push(safeNextPath(next));
      return;
    }
    await supabase.auth.signOut();
    setSubmitting(false);
    setSuccess(true);
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Crear cuenta" backHref={`/welcome${nextSuffix}`} />

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
          <Banner variant="success">
            ¡Cuenta creada! Te enviamos un correo a <b>{email}</b> para verificar tu cuenta.
            Confirmalo y después iniciá sesión. Revisá también la carpeta de spam.
          </Banner>
        )}

        {success ? (
          <Link href={`/login${nextSuffix}`} className="mt-auto">
            <Button type="button" className="w-full">
              Ir a iniciar sesión
            </Button>
          </Link>
        ) : (
          <Button type="submit" disabled={!canSubmit || submitting} className="mt-auto">
            {submitting ? "Creando..." : "Crear cuenta"}
          </Button>
        )}
        <p className="text-center text-sm font-semibold text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href={`/login${nextSuffix}`} className="font-bold text-coral">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
