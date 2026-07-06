// Compresión / redimensionado de imágenes en el cliente, antes de subir.
// La cámara y (sobre todo) las fotos de galería pueden pesar varios MB; esto
// escala el lado mayor a `maxDim` y re-encodea JPEG para acelerar la subida y,
// sobre todo, el análisis con IA: el backend le pasa la imagen a OpenAI con
// detail "high" y OpenAI la descarga y procesa; una foto pesada hacía que la
// función de Vercel se pasara del tiempo (504 Gateway Timeout).

export interface CompressOptions {
  /** Lado mayor máximo, en píxeles. */
  maxDim?: number;
  /** Calidad JPEG inicial (0–1). */
  quality?: number;
  /** Tope de tamaño en bytes: si el resultado lo supera, baja calidad y
   *  después dimensión hasta cumplirlo (o hasta agotar los intentos). */
  maxBytes?: number;
}

function encode(bitmap: ImageBitmap, dim: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, dim / Math.max(bitmap.width, bitmap.height));
  const targetW = Math.max(1, Math.round(bitmap.width * scale));
  const targetH = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

export async function compressImage(
  blob: Blob,
  { maxDim = 1280, quality = 0.8, maxBytes = 900_000 }: CompressOptions = {},
): Promise<Blob> {
  // Ante cualquier problema devolvemos el original: nunca romper la subida.
  try {
    // `imageOrientation: "from-image"` respeta el EXIF (fotos de iPhone rotadas).
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });

    let dim = maxDim;
    let q = quality;
    let best: Blob | null = null;

    // Hasta 5 intentos: primero recortamos calidad, después dimensión, hasta
    // quedar por debajo del tope de bytes. Garantiza que el backend nunca reciba
    // una imagen pesada aunque el primer encode no alcance.
    for (let attempt = 0; attempt < 5; attempt++) {
      const out = await encode(bitmap, dim, q);
      if (!out) break;
      best = out;
      if (out.size <= maxBytes) break;
      if (q > 0.5) q -= 0.15;
      else dim = Math.round(dim * 0.8);
    }
    bitmap.close();

    if (!best) return blob;
    // Si comprimir no ayudó (imagen ya chica), quedate con el original.
    return best.size < blob.size ? best : blob;
  } catch {
    return blob;
  }
}
