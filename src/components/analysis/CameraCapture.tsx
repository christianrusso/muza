"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { occasionLabel } from "@/lib/occasions";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { OccasionId } from "@/types/domain";

export function CameraCapture({ occasionId }: { occasionId: OccasionId }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [streamOk, setStreamOk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS Safari a veces no arranca con autoPlay: forzamos play().
          await videoRef.current.play().catch(() => {});
          setStreamOk(true);
        }
      } catch {
        setStreamOk(false);
      }
    }
    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  async function uploadAndCreateAnalysis(blob: Blob) {
    setUploading(true);
    setError(null);
    try {
      // No Supabase project configured yet: skip Storage entirely and send
      // the photo inline as a data URL so the demo flow works with zero
      // external credentials.
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const photoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const res = await fetch("/api/analyses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occasionId, photoDataUrl }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? "No se pudo crear el análisis.");
        router.push(`/analysis/${body.id}/validating?occasion=${occasionId}`);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado.");

      const photoPath = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("outfit-photos")
        .upload(photoPath, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasionId, photoPath }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "No se pudo crear el análisis.");

      router.push(`/analysis/${body.id}/validating?occasion=${occasionId}`);
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "Error al subir la foto.");
    }
  }

  function handleShutter() {
    if (!streamOk || !videoRef.current || !canvasRef.current) {
      fileInputRef.current?.click();
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && uploadAndCreateAnalysis(blob), "image/jpeg", 0.9);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAndCreateAnalysis(file);
  }

  return (
    <div
      className="screen-body relative"
      style={{ background: "linear-gradient(#1F1B17,#141210)", minHeight: "100vh" }}
    >
      {/* El video se monta siempre para que videoRef exista cuando llega el
          stream; se muestra recién cuando la cámara está lista. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
          streamOk ? "opacity-100" : "opacity-0"
        }`}
      />
      <canvas ref={canvasRef} className="hidden" />
      {/* Sin `capture`: en iOS eso fuerza la cámara; sin él abre la galería. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="absolute left-5 right-5 top-[58px] flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/[.14]"
        >
          <MaterialIcon name="close" size={22} className="text-white" />
        </button>
        <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-white/[.14] px-3.5 text-sm font-bold text-white">
          <MaterialIcon name="favorite" size={16} className="text-coral" />
          {occasionLabel(occasionId)}
        </span>
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/[.14]">
          <MaterialIcon name="bolt" size={22} className="text-white" />
        </div>
      </div>

      <div className="absolute left-6 right-6 top-[112px] flex items-center gap-2 rounded-2xl bg-coral/[.92] px-3.5 py-2.5">
        <MaterialIcon name="lightbulb" size={19} className="text-white" />
        <span className="text-[12.5px] font-bold leading-tight text-white">
          Buscá buena luz y que se vea el outfit completo
        </span>
      </div>

      <div className="absolute inset-x-11 top-[180px] bottom-[190px] flex flex-col items-center justify-center gap-3.5 rounded-[26px] border-2 border-dashed border-white/50">
        <MaterialIcon name="accessibility_new" size={78} className="text-white/30" />
        <span className="max-w-[150px] text-center text-xs font-bold text-white/60">
          Encuadrá tu outfit completo
        </span>
      </div>

      {error && (
        <p className="absolute inset-x-6 bottom-[170px] text-center text-sm font-semibold text-[var(--red)]">
          {error}
        </p>
      )}

      <div className="absolute inset-x-0 bottom-11 flex items-center justify-around px-8">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5"
          disabled={uploading}
        >
          <span className="ph-dark h-[52px] w-[52px] rounded-[13px] border-[1.5px] border-white/30" />
          <span className="text-[10px] font-semibold text-white/75">Galería</span>
        </button>
        <button
          type="button"
          onClick={handleShutter}
          disabled={uploading}
          className="flex h-[78px] w-[78px] items-center justify-center rounded-full border-4 border-white/40"
        >
          <span className="h-[60px] w-[60px] rounded-full bg-white" />
        </button>
        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/[.14]">
            <MaterialIcon name="cameraswitch" size={24} className="text-white" />
          </span>
          <span className="text-[10px] font-semibold text-white/75">Girar</span>
        </button>
      </div>
    </div>
  );
}
