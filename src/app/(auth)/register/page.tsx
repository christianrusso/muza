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
import { trackCompleteRegistration } from "@/lib/completeRegistration";

// Única regla: 8 caracteres. Las de mayúscula+minúscula, número y símbolo se
// sacaron para bajar la fricción del registro. Supabase pide 6 y ningún tipo de
// carácter en particular (ver minimum_password_length / password_requirements en
// supabase/config.toml), así que esto sigue siendo más estricto que el backend.
const RULES = [
  { key: "length", label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
  const canSubmit = email.trim().length > 0 && allRulesOk;

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
    // Sin full_name a propósito: el trigger handle_new_user (0010_google_avatar)
    // cae a split_part(email,'@',1) cuando no viene, así que el perfil arranca
    // con un nombre usable y la persona lo cambia en /profile/edit-name si
    // quiere. Un campo menos en el formulario donde hoy se pierde el tráfico.
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message);
      return;
    }
    // La cuenta se creó (con o sin sesión inmediata según la verif. de email).
    track("signed_up", { method: "password" });
    trackCompleteRegistration({ email, sourcePath: "/register" });
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

      {/* Dos campos y nada más. El registro es donde hoy se pierde el tráfico
          pago, así que todo lo que no sea imprescindible para crear la cuenta
          se sacó: el nombre lo resuelve el trigger desde el email, y el
          "repetir contraseña" lo reemplaza el ojito de ver/ocultar. */}
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <Field label="Email">
          <Input
            type="email"
            placeholder="vos@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Contraseña">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              validity={password.length === 0 ? "neutral" : allRulesOk ? "ok" : "err"}
              autoComplete="new-password"
              className="pr-12"
              required
            />
            {/* Ver la contraseña reemplaza al campo de repetirla: resuelve el
                mismo problema (el typo que no ves) con un campo menos. */}
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-faint"
            >
              <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} size={20} />
            </button>
          </div>
          {/* Solo cuando hace falta: si está vacío no molestamos, y si ya llegó
              a 8 el borde verde del input ya lo dice. */}
          {password.length > 0 && !allRulesOk && (
            <p className="mt-1.5 text-[13px] font-semibold text-faint">Mínimo 8 caracteres</p>
          )}
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
