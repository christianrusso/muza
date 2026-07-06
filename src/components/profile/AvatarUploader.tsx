"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image/compress";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

/**
 * Avatar del perfil con subida de foto: al tocar abre el selector de archivos,
 * comprime la imagen, la sube al bucket público `avatars` y guarda la URL en
 * `profiles.avatar_url`. La foto se muestra al instante (optimista) y refrescamos
 * los server components para que el resto de la app tome el nuevo avatar.
 */
export function AvatarUploader({ userId, avatarUrl }: { userId: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(false);
    try {
      // Avatar chico: 512px alcanza y mantiene la subida liviana.
      const blob = await compressImage(file, { maxDim: 512, quality: 0.85, maxBytes: 300_000 });
      const supabase = createClient();
      // El path debe empezar con el user id (policy avatars_owner_write). UUID por
      // subida para evitar problemas de caché del CDN al cambiar de foto.
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (updErr) throw updErr;

      setUrl(publicUrl);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Cambiar foto de perfil"
          className="block"
        >
          <div
            className="ph h-[104px] w-[104px] rounded-full border-2 border-white"
            style={{
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
              ...(url
                ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}),
            }}
          />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-coral text-white">
            <MaterialIcon name={uploading ? "hourglass_top" : "edit"} size={16} />
          </span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      {error && <span className="mt-2 text-xs font-semibold text-[var(--red)]">No se pudo subir la foto. Probá de nuevo.</span>}
    </div>
  );
}
