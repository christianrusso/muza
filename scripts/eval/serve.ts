// ============================================================================
// Muza — Servidor de etiquetado del eval (autoguardado a labels.json)
// ============================================================================
// Sirve el report.html de una corrida, sus fotos, y una API de etiquetas que
// escribe scripts/eval/labels.json en disco en cada cambio. Así no perdés
// trabajo aunque cierres el navegador (no dependés de localStorage ni de
// acordarte de "Descargar").
//
// Uso:
//   npm run eval:serve                 # sirve la última corrida (out/ más reciente)
//   npm run eval:serve -- --report 2026-07-02T14-12-36
//   npm run eval:serve -- --port 4599
//
// Las etiquetas se guardan en scripts/eval/labels.json (una sola fuente de
// verdad, por nombre de archivo — compartida entre todas las corridas).
// ============================================================================

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "out");
const LABELS_FILE = join(__dirname, "labels.json");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const PORT = Number(arg("port") ?? 4599);

// ---- Elegir corrida (--report <stamp> o la más reciente) ----
function latestReport(): string {
  if (!existsSync(OUT_DIR)) {
    console.error(`✖ No existe ${OUT_DIR}. Corré primero: npm run eval:ai -- --dir <fotos>`);
    process.exit(1);
  }
  const dirs = readdirSync(OUT_DIR)
    .filter((d) => statSync(join(OUT_DIR, d)).isDirectory())
    .sort();
  if (dirs.length === 0) {
    console.error(`✖ No hay corridas en ${OUT_DIR}. Corré: npm run eval:ai -- --dir <fotos>`);
    process.exit(1);
  }
  return dirs[dirs.length - 1];
}

const stamp = arg("report") ?? latestReport();
const reportDir = join(OUT_DIR, stamp);
const reportHtml = join(reportDir, "report.html");
const resultsJson = join(reportDir, "results.json");

if (!existsSync(reportHtml)) {
  console.error(`✖ No encontré ${reportHtml}`);
  process.exit(1);
}

// La carpeta de imágenes y la lista de archivos válidos salen de results.json.
const results = JSON.parse(readFileSync(resultsJson, "utf8")) as {
  opts: { dir: string };
  results: { file: string }[];
};
const imagesDir = results.opts.dir;
const allowedFiles = new Set(results.results.map((r) => r.file));

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
};

function loadLabels(): Record<string, unknown> {
  if (!existsSync(LABELS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(LABELS_FILE, "utf8"));
  } catch {
    return {};
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = decodeURIComponent(url.pathname);

  // --- API de etiquetas ---
  if (path === "/api/labels" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": MIME[".json"] });
    res.end(JSON.stringify(loadLabels()));
    return;
  }
  if (path === "/api/labels" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body); // valida que sea JSON
        writeFileSync(LABELS_FILE, JSON.stringify(parsed, null, 2));
        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end('{"ok":true}');
      } catch (err) {
        res.writeHead(400, { "Content-Type": MIME[".json"] });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  // --- Fotos (solo las de esta corrida; sin path traversal) ---
  // La ruta puede incluir subcarpetas (ej. "Men full outfit/IMG_8558.jpg").
  // El whitelist `allowedFiles` es la protección real: solo sirve rutas que
  // salieron del propio listado de la corrida, así que no hay traversal posible.
  if (path.startsWith("/img/")) {
    const file = path.slice("/img/".length);
    if (!allowedFiles.has(file)) {
      res.writeHead(404).end("no encontrada");
      return;
    }
    const full = join(imagesDir, file);
    if (!existsSync(full)) {
      res.writeHead(404).end("no encontrada");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
    res.end(readFileSync(full));
    return;
  }

  // --- Reporte ---
  if (path === "/" || path === "/report.html") {
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(readFileSync(reportHtml));
    return;
  }

  res.writeHead(404).end("no encontrado");
});

server.listen(PORT, () => {
  console.log(`\n✔ Etiquetado en marcha:`);
  console.log(`   Reporte:  http://localhost:${PORT}/`);
  console.log(`   Corrida:  ${stamp}`);
  console.log(`   Fotos:    ${imagesDir}`);
  console.log(`   Guardando en: ${LABELS_FILE}`);
  console.log(`\n   Cada 👍/👎/nota se escribe al toque. Ctrl+C para cortar.\n`);
});
