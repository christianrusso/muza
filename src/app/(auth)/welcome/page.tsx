"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { nextQuery, safeNextPath } from "@/lib/redirect";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Destino post-login (deep link de un post compartido, etc.). Lo leemos de la
  // URL en el cliente para evitar el Suspense que exige useSearchParams.
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next"));
  }, []);
  const nextSuffix = nextQuery(next);

  async function continueWithOAuth(provider: "google") {
    if (DEMO_MODE) {
      router.push(safeNextPath(next));
      return;
    }
    // El redirect OAuth tarda unos segundos por red; mostramos spinner ni bien
    // se toca para que no parezca que no pasa nada. En éxito el navegador
    // redirige; solo reseteamos si signInWithOAuth falla (antes se ignoraba).
    setLoading(provider);
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback${nextSuffix}` },
      });
      if (oauthError) {
        setError(oauthError.message);
        setLoading(null);
      }
    } catch {
      setError("No pudimos conectar con Google. Reintentá.");
      setLoading(null);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="ph-dark absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login-bg.webp" alt="" className="h-full w-full object-cover" />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(20,18,16,.15) 0%, rgba(20,18,16,0) 34%, rgba(20,18,16,.22) 54%, rgba(20,18,16,.88) 88%)",
        }}
      />
      <div className="relative mt-auto flex flex-col items-center px-7 pb-10">
        <div className="mb-2.5">
          <Logo size={58} />
        </div>
        <span className="font-serif italic text-white" style={{ fontSize: 62, lineHeight: 1 }}>
          LookLab
        </span>
        <span className="mb-6 mt-1 text-[15px] font-semibold text-white/85">
          Tu outfit, evaluado
        </span>

        <Button
          variant="light"
          onClick={() => continueWithOAuth("google")}
          disabled={loading !== null}
        >
          {loading === "google" ? (
            <>
              <Spinner size={18} />
              Conectando con Google...
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-coral text-xs font-extrabold text-white">
                G
              </span>
              Continuar con Google
            </>
          )}
        </Button>
        {error && (
          <p className="mt-3 w-full rounded-xl bg-black/40 px-3 py-2 text-center text-sm font-semibold text-white">
            {error}
          </p>
        )}
        <Link href={`/register${nextSuffix}`} className="mt-3 w-full">
          <Button variant="primary">Continuar con email</Button>
        </Link>

        <p className="mt-5 text-sm font-semibold text-white/85">
          ¿Ya tenés cuenta?{" "}
          <Link href={`/login${nextSuffix}`} className="font-bold text-white underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
