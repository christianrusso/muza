import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// public/landing.html es HTML estático: no pasa por el build de Next, así que no
// puede leer variables de entorno ni lo cubre el typecheck. Es, además, el
// destino de las campañas pagas. Estos tests cubren los tres errores que ahí
// serían invisibles hasta que alguien mire la factura de Meta.

const ROOT = join(import.meta.dirname, "..");
const LANDING = readFileSync(join(ROOT, "public/landing.html"), "utf8");

/** Lee una var de .env.local sin depender de que el proceso la tenga cargada. */
function envLocal(key: string): string | null {
  let raw: string;
  try {
    raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  } catch {
    return null; // en CI puede no existir; los tests que la usan se saltean
  }
  const match = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

// ===== Drift de los pixels =====
// Los IDs están hardcodeados en el HTML (ver el comentario del <head>). Si
// cambian en el entorno y acá no, la landing sigue midiendo contra el pixel
// viejo EN SILENCIO: no falla, miente. Esto lo convierte en un test en rojo.
for (const key of [
  "NEXT_PUBLIC_META_PIXEL_ID",
  "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
]) {
  test(`landing: ${key} coincide con .env.local`, (t) => {
    const expected = envLocal(key);
    if (!expected) return t.skip("no hay .env.local con esa variable");
    assert.ok(
      LANDING.includes(expected),
      `${key} cambió en .env.local pero no en public/landing.html. La landing ` +
        `estaría midiendo contra el valor viejo sin dar error.`,
    );
  });
}

// El copy que ve el visitante, sin los comentarios del HTML: lo que importa es
// lo que se promete en la página, no lo que discutimos en el código.
const COPY = LANDING.replace(/<!--[\s\S]*?-->/g, "");

// ===== Links absolutos =====
// Con hrefs a https://looklab.io/... la landing es imposible de probar en local:
// cualquier clic te saca a producción. (El <link rel="canonical"> sí debe ser
// absoluto, por eso miramos solo los <a>.)
test("landing: los links de navegación son relativos, no absolutos a looklab.io", () => {
  const anchors = LANDING.match(/<a\b[^>]*>/g) ?? [];
  const absolutos = anchors.filter((a) => /href="https:\/\/looklab\.io/.test(a));
  assert.deepEqual(
    absolutos,
    [],
    `Hay <a> absolutos a looklab.io: ${absolutos.join(", ")}. Tienen que ser ` +
      `relativos para poder probar la landing en el dev server.`,
  );
});

test("landing: los CTAs apuntan al modo invitado", () => {
  const ctas = LANDING.match(/<a[^>]*data-cta="[^"]*"[^>]*>/g) ?? [];
  assert.ok(ctas.length >= 3, `Esperaba al menos 3 CTAs con data-cta, hay ${ctas.length}`);
  for (const cta of ctas) {
    assert.match(
      cta,
      /href="\/community"/,
      `Un CTA no apunta a /community (el modo invitado): ${cta}`,
    );
  }
});

// ===== Promesas =====
// Colorimetría, aprendizaje y tendencias NO existen en la app (roadmap Q4 2026).
// Solo pueden nombrarse dentro de la franja "Pronto", que está apagada y con
// candado. Si se escapan al copy de arriba, la landing promete algo que la
// persona no va a encontrar — que es exactamente el problema que vinimos a
// resolver.
test("landing: lo que no existe solo se nombra en la franja Pronto", () => {
  const pronto = COPY.match(/<section id="pronto"[\s\S]*?<\/section>/);
  assert.ok(pronto, 'No encontré la sección id="pronto"');

  const resto = COPY.replace(pronto[0], "");
  for (const palabra of ["colorimetr", "tendencia", "aprend"]) {
    assert.ok(
      !new RegExp(palabra, "i").test(resto),
      `"${palabra}" aparece fuera de la franja "Pronto". Esas features no ` +
        `existen todavía: prometerlas hace rebotar a quien venga a buscarlas.`,
    );
  }
});
