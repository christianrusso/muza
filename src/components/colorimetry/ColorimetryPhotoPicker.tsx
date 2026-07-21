"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image/compress";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

const TIPS = [
  { icon: "light_mode", text: "Luz natural y pareja, de frente a una ventana" },
  { icon: "face", text: "Cara y hombros a la vista, mirando de frente" },
  { icon: "visibility", text: "Sin anteojos, sin filtros ni maquillaje pesado" },
  { icon: "wallpaper", text: "Fondo neutro y ropa de color suave cerca de la cara" },
] as const;

type Status = "idle" | "validating" | "valid" | "invalid";

export function ColorimetryPhotoPicker() {
  const router = useRouter();
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  // Path de la foto ya subida (para el paso de generación). null en demo.
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto({ file, url: URL.createObjectURL(file) });
      // Foto nueva: se reinicia todo el estado de validación.
      setStatus("idle");
      setPhotoPath(null);
      setIssues([]);
      setReason(null);
      setError(null);
    }
    e.target.value = "";
  }

  function reset() {
    setPhoto(null);
    setStatus("idle");
    setPhotoPath(null);
    setIssues([]);
    setReason(null);
    setError(null);
  }

  async function validate() {
    if (!photo) return;
    setStatus("validating");
    setError(null);
    try {
      let path: string | null = null;

      // Sin Supabase (demo): no se sube; la validación server-side devuelve válida.
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const blob = await compressImage(photo.file);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado.");
        path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("colorimetry-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
      }

      const res = await fetch("/api/colorimetry/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoPath: path ?? "demo" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "No se pudo validar la foto.");

      if (body.verdict === "valid") {
        setPhotoPath(path);
        setStatus("valid");
      } else {
        setIssues(Array.isArray(body.issues) ? body.issues : []);
        setReason(body.reason ?? null);
        setStatus("invalid");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Probá de nuevo.");
      setStatus("idle");
    }
  }

  function confirm() {
    // La generación todavía es mock; le pasamos el path para cuando exista.
    const q = photoPath ? `?photo=${encodeURIComponent(photoPath)}` : "";
    router.push(`/colorimetry/analyzing${q}`);
  }

  const busy = status === "validating";

  return (
    <>
      <div className="list-card">
        {TIPS.map((tip) => (
          <div key={tip.icon} className="row">
            <MaterialIcon name={tip.icon} size={22} className="text-[var(--violet)]" />
            <span className="txt text-[15px] leading-snug">{tip.text}</span>
          </div>
        ))}
      </div>

      {/* Encuadre de la promesa: la colorimetría es la única parte de la app que
          lee la coloración de la persona, y solo para recomendar colores. */}
      <p className="px-1 text-xs font-medium leading-relaxed text-faint">
        Analizamos tu coloración —piel, pelo y ojos— solo para recomendarte los colores que mejor te
        quedan. Nunca juzgamos tu aspecto.
      </p>

      <input
        ref={selfieInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="relative flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed border-line-strong">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt="Foto elegida para la colorimetría"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-2">
            <MaterialIcon name="person" size={64} className="text-faint" />
            <span className="text-sm font-semibold text-faint">Tu foto va a aparecer acá</span>
          </span>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white">
            <MaterialIcon name="hourglass_top" size={30} />
            <span className="text-sm font-bold">Revisando la foto…</span>
          </div>
        )}
      </div>

      {/* Foto rechazada: motivo + problemas + repetir. */}
      {status === "invalid" && (
        <div className="rounded-[18px] border-2 border-[var(--red)] bg-[var(--red-soft)] p-4">
          <p className="text-[15px] font-bold text-[var(--red)]">
            {reason ?? "Necesitamos una foto más clara para leer tu coloración."}
          </p>
          {issues.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[13px] font-medium leading-relaxed text-muted">
              {issues.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="px-1 text-sm font-semibold text-[var(--red)]">{error}</p>}

      {/* Elegir/cambiar foto: se ocultan cuando la foto ya está aprobada. */}
      {status !== "valid" && (
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-outline flex-1 text-[15px]"
            onClick={() => selfieInputRef.current?.click()}
            disabled={busy}
          >
            <MaterialIcon name="photo_camera" size={20} className="text-[var(--violet)]" />
            Tomar selfie
          </button>
          <button
            type="button"
            className="btn btn-outline flex-1 text-[15px]"
            onClick={() => galleryInputRef.current?.click()}
            disabled={busy}
          >
            <MaterialIcon name="photo_library" size={20} className="text-[var(--violet)]" />
            Galería
          </button>
        </div>
      )}

      {/* Acción principal según el estado. */}
      {status === "valid" ? (
        <div className="flex gap-3">
          <button type="button" className="btn btn-outline flex-1" onClick={reset}>
            <MaterialIcon name="refresh" size={20} className="text-[var(--violet)]" />
            Repetir
          </button>
          <button type="button" className="btn btn-violet flex-1" onClick={confirm}>
            <MaterialIcon name="check" size={20} />
            Confirmar
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-violet" disabled={!photo || busy} onClick={validate}>
          <MaterialIcon name={busy ? "hourglass_top" : "auto_awesome"} size={20} />
          {busy ? "Revisando…" : "Analizar foto"}
        </button>
      )}
    </>
  );
}
