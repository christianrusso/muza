import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Descarga una imagen desde una URL (p. ej. una URL firmada de Supabase) forzando
 * el guardado con un nombre. Bajamos el archivo a un blob primero porque el
 * atributo `download` de <a> se ignora entre orígenes distintos: sin esto, el
 * navegador abriría la imagen en vez de guardarla. Cliente-only (usa DOM/fetch).
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status}).`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
