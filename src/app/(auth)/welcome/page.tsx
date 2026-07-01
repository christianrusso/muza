"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  async function continueWithOAuth(provider: "google" | "apple") {
    if (DEMO_MODE) {
      router.push("/home");
      return;
    }
    setLoading(provider);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="ph-dark absolute inset-0" />
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
          Muza
        </span>
        <span className="mb-6 mt-1 text-[15px] font-semibold text-white/85">
          Tu outfit, evaluado
        </span>

        <Button
          variant="light"
          onClick={() => continueWithOAuth("google")}
          disabled={loading !== null}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-coral text-xs font-extrabold text-white">
            G
          </span>
          Continuar con Google
        </Button>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => continueWithOAuth("apple")}
          disabled={loading !== null}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-paper text-xs font-extrabold text-ink">
            A
          </span>
          Continuar con Apple
        </Button>
        <Link href="/register" className="mt-3 w-full">
          <Button variant="primary">Continuar con email</Button>
        </Link>

        <p className="mt-5 text-sm font-semibold text-white/85">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-bold text-white underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
