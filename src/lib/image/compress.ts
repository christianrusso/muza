// Compresión / redimensionado de imágenes en el cliente, antes de subir.
// La cámara y (sobre todo) las fotos de galería pueden pesar varios MB; esto
// escala el lado mayor a `maxDim` y re-encodea JPEG para acelerar la subida
// y todas las descargas posteriores.

export interface CompressOptions {
  /** Lado mayor máximo, en píxeles. */
  maxDim?: number;
  /** Calidad JPEG (0–1). */
  quality?: number;
}

export async function compressImage(
  blob: Blob,
  { maxDim = 1440, quality = 0.8 }: CompressOptions = {},
): Promise<Blob> {
  // Ante cualquier problema devolvemos el original: nunca romper la subida.
  try {
    // `imageOrientation: "from-image"` respeta el EXIF (fotos de iPhone rotadas).
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );

    // Si comprimir no ayudó (imagen ya chica), quedate con el original.
    if (!out || out.size >= blob.size) return blob;
    return out;
  } catch {
    return blob;
  }
}
