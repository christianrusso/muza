"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { ScreenHead } from "@/components/navigation/TopBar";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { translateAuthError } from "@/lib/supabase/authErrors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (DEMO_MODE) {
      router.push("/home");
      return;
    }
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setSubmitting(false);
      setError(signInError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/home"), 700);
  }

  async function continueWithOAuth(provider: "google" | "apple") {
    if (DEMO_MODE) {
      router.push("/home");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Iniciar sesión" backHref="/welcome" />

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
        {success && <Banner variant="success">Sesión iniciada, cargando tu perfil...</Banner>}

        <Button type="submit" disabled={submitting || success}>
          {success ? "Ingresando..." : submitting ? "Verificando..." : "Ingresar"}
        </Button>

        <div className="my-1 flex items-center gap-3 text-xs font-semibold text-faint">
          <span className="h-px flex-1 bg-line-strong" />o continuá con
          <span className="h-px flex-1 bg-line-strong" />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={() => continueWithOAuth("google")}>
            Google
          </Button>
          <Button variant="outline" type="button" onClick={() => continueWithOAuth("apple")}>
            Apple
          </Button>
        </div>

        <p className="mt-auto text-center text-sm font-semibold text-muted">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-bold text-coral">
            Registrate
          </Link>
        </p>
      </form>
    </div>
  );
}
