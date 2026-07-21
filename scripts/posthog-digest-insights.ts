// ============================================================================
// Crea en PostHog los insights para medir el email de actividad
// ============================================================================
// Crea dos insights guardados:
//   1. "Retornos desde el email de actividad" — usuarios únicos/día que llegaron
//      con utm_campaign=activity_digest (el CTA del mail los etiqueta).
//   2. "Email de actividad → engagement (24h)" — funnel: llegó desde el email →
//      votó dentro de 24h. Es el número que dice si el digest sirve, no solo si
//      se abre.
//
// La key nunca se hardcodea: se pasa inline al correr (como posthog-dashboard.ts).
//
// Variables (Personal API key con scope insight:write; Settings → Project → ID):
//   POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, POSTHOG_HOST (opcional)
//
// Uso:
//   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 \
//     npx tsx scripts/posthog-digest-insights.ts
//   (EU cloud: agregar POSTHOG_HOST=https://eu.posthog.com)
//
// Correrlo dos veces crea duplicados: es a propósito simple. Si pasa, borrá los
// repetidos desde PostHog.
// ============================================================================

export {}; // marca el archivo como módulo (aísla el scope de otros scripts)

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const HOST = (process.env.POSTHOG_HOST ?? "https://us.posthog.com").replace(/\/$/, "");

if (!API_KEY || !PROJECT_ID) {
  console.error(
    "Faltan variables. Necesito POSTHOG_PERSONAL_API_KEY (scope insight:write) y POSTHOG_PROJECT_ID.\n" +
      "Ejemplo:\n  POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/posthog-digest-insights.ts",
  );
  process.exit(1);
}

const BASE = `${HOST}/api/projects/${PROJECT_ID}`;

// Filtro reutilizable: eventos con utm_campaign = activity_digest.
const fromEmail = [
  { type: "event", key: "utm_campaign", value: "activity_digest", operator: "exact" },
];

// 1) Trends: usuarios únicos/día que volvieron desde el email.
const trendsInsight = {
  name: "Retornos desde el email de actividad",
  description: "Usuarios únicos por día que llegaron con utm_campaign=activity_digest (CTA del digest).",
  query: {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event: "$pageview", name: "Llegó desde el email", math: "dau" }],
      // properties acepta una lista plana de filtros (no un grupo AND/OR anidado).
      properties: fromEmail,
      interval: "day",
      dateRange: { date_from: "-30d" },
    },
  },
};

// 2) Funnel: llegó desde el email → votó dentro de 24h.
const funnelInsight = {
  name: "Email de actividad → engagement (24h)",
  description: "De los que volvieron desde el email, cuántos votaron dentro de las 24h. Mide si el digest re-engancha.",
  query: {
    kind: "InsightVizNode",
    source: {
      kind: "FunnelsQuery",
      series: [
        { kind: "EventsNode", event: "$pageview", name: "Llegó desde el email", properties: fromEmail },
        { kind: "EventsNode", event: "voted", name: "Votó" },
      ],
      funnelsFilter: { funnelWindowInterval: 24, funnelWindowIntervalUnit: "hour" },
      dateRange: { date_from: "-30d" },
    },
  },
};

async function createInsight(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/insights/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: number; short_id?: string; detail?: string };
  if (!res.ok) {
    console.error(`✗ "${body.name}" — ${res.status}: ${json.detail ?? JSON.stringify(json).slice(0, 200)}`);
    return;
  }
  const url = json.short_id ? `${HOST}/project/${PROJECT_ID}/insights/${json.short_id}` : "(sin url)";
  console.log(`✓ "${body.name}"\n  ${url}`);
}

async function main() {
  console.log(`Creando insights en el proyecto ${PROJECT_ID} (${HOST})…\n`);
  await createInsight(trendsInsight);
  await createInsight(funnelInsight);
  console.log("\nListo. Abrilos desde los links de arriba o en PostHog → Insights.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
