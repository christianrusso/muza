"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Spinner } from "@/components/ui/Spinner";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { translateAuthError } from "@/lib/supabase/authErrors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  // Cuando el login falla por email sin confirmar, ofrecemos reenviar el correo.
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resend, setResend] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNeedsConfirm(false);
    setResend("idle");
    if (DEMO_MODE) {
      router.push("/home");
      return;
    }
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setSubmitting(false);
      setError(signInError.message);
      setNeedsConfirm(signInError.message === "Email not confirmed");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/home"), 700);
  }

  async function resendConfirmation() {
    if (!email) return;
    setResend("sending");
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    if (resendError) {
      setError(resendError.message);
      setResend("idle");
      return;
    }
    setResend("sent");
  }

  async function continueWithOAuth(provider: "google") {
    if (DEMO_MODE) {
      router.push("/home");
      return;
    }
    // Feedback inmediato: el redirect OAuth (Supabase → Google) tarda unos
    // segundos por red y hasta que llega la pantalla actual sigue visible. Sin
    // esto el botón parece muerto. En éxito el navegador redirige y no volvemos;
    // solo reseteamos el estado si signInWithOAuth falla (antes se ignoraba).
    setOauthLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(false);
      }
    } catch {
      setError("No pudimos conectar con Google. Reintentá.");
      setOauthLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Foto de fondo full-bleed que funde hacia el papel donde vive el form. */}
      <div className="ph-dark absolute inset-x-0 top-0 h-[42vh] max-h-[360px] min-h-[220px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login-bg.webp" alt="" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,18,16,.28) 0%, rgba(20,18,16,0) 38%, rgba(247,245,240,0) 62%, var(--paper) 100%)",
          }}
        />
      </div>

      {/* Volver: sobre la foto, en blanco. */}
      <Link
        href="/welcome"
        aria-label="Volver"
        className="relative z-10 mx-5 mt-5 flex h-10 w-10 items-center justify-center rounded-full text-white"
        style={{ background: "rgba(20,18,16,.4)", backdropFilter: "blur(4px)" }}
      >
        <MaterialIcon name="arrow_back" size={22} />
      </Link>

      {/* Tarjeta de papel con el formulario, montada sobre la foto. */}
      <div className="relative z-10 mt-auto flex flex-col gap-4 rounded-t-[28px] bg-paper px-6 pb-8 pt-7">
        <span className="font-serif" style={{ fontSize: 27 }}>
          Iniciar sesión
        </span>

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
        <Field label="Contraseña">
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Link href="/forgot-password" className="-mt-2 self-end text-sm font-bold text-coral underline">
          Olvidé mi contraseña
        </Link>

        {error && <Banner variant="error">{translateAuthError(error)}</Banner>}
        {needsConfirm &&
          (resend === "sent" ? (
            <Banner variant="success">
              Te reenviamos el correo de verificación a <b>{email}</b>. Revisá tu bandeja (y spam).
            </Banner>
          ) : (
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={resend === "sending"}
              className="-mt-1 self-start text-sm font-bold text-coral underline disabled:opacity-60"
            >
              {resend === "sending" ? "Enviando..." : "Reenviar correo de verificación"}
            </button>
          ))}
        {success && <Banner variant="success">Sesión iniciada, cargando tu perfil...</Banner>}

        <Button type="submit" disabled={submitting || success || oauthLoading}>
          {success ? "Ingresando..." : submitting ? "Verificando..." : "Ingresar"}
        </Button>

        <div className="my-1 flex items-center gap-3 text-xs font-semibold text-faint">
          <span className="h-px flex-1 bg-line-strong" />o continuá con
          <span className="h-px flex-1 bg-line-strong" />
        </div>

        <Button
          variant="outline"
          type="button"
          onClick={() => continueWithOAuth("google")}
          disabled={oauthLoading || submitting || success}
        >
          {oauthLoading ? (
            <>
              <Spinner size={18} />
              Conectando con Google...
            </>
          ) : (
            "Google"
          )}
        </Button>

        <p className="mt-auto text-center text-sm font-semibold text-muted">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-bold text-coral">
            Registrate
          </Link>
        </p>
      </form>
      </div>
    </div>
  );
}
