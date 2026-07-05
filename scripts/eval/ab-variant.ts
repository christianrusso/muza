// ============================================================================
// A/B de variantes — ¿el sub-contexto realmente mueve el scoring?
// ============================================================================
// Puntúa la MISMA foto en varios escenarios (misma ocasión, distinta variante)
// a temperature 0, SIN few-shot (para aislar el efecto de la variante), y compara
// el overall, la nota de "ocasión" y su justificación. Si la variante funciona,
// una variante más exigente (ej. "Noche · Cóctel") debería bajar la adecuación de
// un outfit informal, y una relajada ("Día · Casual") subirla o dejarla igual.
//
// Uso:
//   npm run eval:ab -- --photo "full outfit male/IMG_100.jpg"
//   npm run eval:ab -- --photo "..." --occasion Fiesta
// ============================================================================

import { readFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { buildScoringPrompt } from "@/lib/ai/prompts/scoring.prompt";
import { ScoringResultSchema } from "@/lib/ai/schema";
import { computeOverallScore } from "@/lib/scoring/categories";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
function imageToDataUrl(path: string): string {
  const b64 = readFileSync(path).toString("base64");
  return `data:${MIME[extname(path).toLowerCase()] ?? "image/jpeg"};base64,${b64}`;
}

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function scoreOnce(
  client: OpenAI,
  dataUrl: string,
  occasionLabel: string,
  occasionVariant: string | null,
) {
  const res = await client.responses.parse({
    model: "gpt-4o",
    temperature: 0,
    input: [
      { role: "system", content: buildScoringPrompt({ occasionLabel, occasionVariant, analysisType: "completo" }) },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Analizá y puntuá este outfit." },
          { type: "input_image", image_url: dataUrl, detail: "high" },
        ],
      },
    ],
    text: { format: zodTextFormat(ScoringResultSchema, "scoring_result") },
  });
  const p = res.output_parsed!;
  const occ = p.categories.find((c) => c.key === "ocasion");
  return {
    overall: computeOverallScore(p.categories, p.analysisType),
    ocasion: occ?.score,
    just: occ?.justification,
    badge: p.qualitativeBadge,
  };
}

async function main() {
  const env = loadEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY });
  const photo = arg("photo", "full outfit male/IMG_100.jpg");
  const occasionLabel = arg("occasion", "Fiesta");
  const dataUrl = imageToDataUrl(join(ROOT, "test-photos", photo));

  const scenarios: { label: string; variant: string | null }[] = [
    { label: `${occasionLabel} (genérica)`, variant: null },
    { label: `${occasionLabel} · Noche · Cóctel (exigente)`, variant: "Noche · Cóctel" },
    { label: `${occasionLabel} · Día · Casual (relajada)`, variant: "Día · Casual" },
  ];

  console.log(`\n🔬 A/B de variante · foto: ${photo} · ocasión: ${occasionLabel} · temp 0 · sin few-shot\n`);
  for (const s of scenarios) {
    const r = await scoreOnce(client, dataUrl, occasionLabel, s.variant);
    console.log(`── ${s.label}`);
    console.log(`   overall: ${r.overall}   ·   ocasión: ${r.ocasion}   ·   badge: ${r.badge}`);
    console.log(`   just. ocasión: ${r.just}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
