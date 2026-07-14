// ============================================================================
// LookLab — Crea el dashboard "LookLab — Embudo & Comunidad" en PostHog vía API
// ============================================================================
// Arma de una sola pasada el dashboard con los 11 tiles mapeados a los eventos
// que ya instrumentamos en src/lib/analytics.ts (signed_up, photo, score_viewed,
// published, voted, etc.). Usa el formato de queries nuevo (InsightVizNode), que
// es el que entiende PostHog actual.
//
// SEGURO POR DEFECTO: sin --apply solo imprime lo que va a crear (dry-run), no
// toca nada en PostHog.
//
// Requisitos (variables de entorno):
//   POSTHOG_PERSONAL_API_KEY   Personal API key con scopes insight:write y
//                              dashboard:write (Settings → Personal API keys).
//   POSTHOG_PROJECT_ID         El número de proyecto (Settings → Project → ID).
//   POSTHOG_HOST               Opcional. Default US cloud. Para EU cloud poner
//                              https://eu.posthog.com.
//
// Uso:
//   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 \
//     tsx scripts/posthog-dashboard.ts              # dry-run (ver el plan)
//   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 \
//     tsx scripts/posthog-dashboard.ts --apply      # crea todo de verdad
// ============================================================================

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const HOST = (process.env.POSTHOG_HOST ?? "https://us.posthog.com").replace(/\/$/, "");
const APPLY = process.argv.includes("--apply");

if (!API_KEY || !PROJECT_ID) {
  console.error(
    "Faltan variables. Necesito POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID.\n" +
      "Ejemplo:\n  POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 tsx scripts/posthog-dashboard.ts",
  );
  process.exit(1);
}

const BASE = `${HOST}/api/projects/${PROJECT_ID}`;

// ---------------------------------------------------------------------------
// Helpers de queries (formato InsightVizNode)
// ---------------------------------------------------------------------------

type EventNode = { kind: "EventsNode"; event: string; name: string; math?: string };

const ev = (event: string, math?: string): EventNode => ({
  kind: "EventsNode",
  event,
  name: event,
  ...(math ? { math } : {}),
});

const trends = (
  series: EventNode[],
  opts: { breakdown?: string; display?: string; interval?: string } = {},
) => ({
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series,
    interval: opts.interval ?? "day",
    trendsFilter: { display: opts.display ?? "ActionsLineGraph" },
    ...(opts.breakdown
      ? { breakdownFilter: { breakdown: opts.breakdown, breakdown_type: "event" } }
      : {}),
  },
});

const funnel = (steps: string[], vizType: "steps" | "time_to_convert" = "steps") => ({
  kind: "InsightVizNode",
  source: {
    kind: "FunnelsQuery",
    series: steps.map((s) => ({ kind: "EventsNode", event: s, name: s })),
    funnelsFilter: { funnelVizType: vizType },
  },
});

const retention = (event: string) => ({
  kind: "InsightVizNode",
  source: {
    kind: "RetentionQuery",
    retentionFilter: {
      targetEntity: { id: event, name: event, type: "events" },
      returningEntity: { id: event, name: event, type: "events" },
      period: "Week",
      totalIntervals: 8,
      retentionType: "retention_first_time",
    },
  },
});

// ---------------------------------------------------------------------------
// Los 11 tiles
// ---------------------------------------------------------------------------

const TILES: { name: string; description: string; query: unknown }[] = [
  // Adquisición
  {
    name: "Nuevas altas / día",
    description: "Registros por método (password / OAuth).",
    query: trends([ev("signed_up")], { breakdown: "method", display: "ActionsBar" }),
  },
  {
    name: "Onboarding completado",
    description: "% de altas que terminan el onboarding.",
    query: funnel(["signed_up", "onboarding_completed"]),
  },
  {
    name: "Logins recurrentes (usuarios únicos)",
    description: "Usuarios únicos que loguean por día.",
    query: trends([ev("logged_in", "dau")]),
  },
  // Activación — embudo core
  {
    name: "Funnel de activación",
    description: "occasion_selected → photo → validation → score_viewed → shared.",
    query: funnel(["occasion_selected", "photo", "validation", "score_viewed", "shared"]),
  },
  {
    name: "Tiempo a primer score",
    description: "Tiempo mediano de elegir ocasión a ver el puntaje.",
    query: funnel(["occasion_selected", "score_viewed"], "time_to_convert"),
  },
  {
    name: "Ocasiones más elegidas",
    description: "Distribución de occasion_selected por occasion_id.",
    query: trends([ev("occasion_selected")], { breakdown: "occasion_id", display: "ActionsBarValue" }),
  },
  {
    name: "Fotos por fuente",
    description: "Cámara vs. subida.",
    query: trends([ev("photo")], { breakdown: "source", display: "ActionsPie" }),
  },
  // Comunidad y retención
  {
    name: "Publicaciones",
    description: "Análisis publicados a la comunidad.",
    query: trends([ev("published")]),
  },
  {
    name: "Interacción social",
    description: "Votos y follows.",
    query: trends([ev("voted"), ev("followed")]),
  },
  {
    name: "Share rate",
    description: "% de scores vistos que se comparten.",
    query: funnel(["score_viewed", "shared"]),
  },
  {
    name: "Retención semanal (score_viewed)",
    description: "Cohortes semanales que vuelven a ver un puntaje.",
    query: retention("score_viewed"),
  },
];

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

async function api(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`\nPostHog: ${HOST}  ·  proyecto ${PROJECT_ID}`);
  console.log(APPLY ? "MODO: --apply (crea de verdad)\n" : "MODO: dry-run (no escribe nada)\n");

  console.log("Dashboard: «LookLab — Embudo & Comunidad»");
  TILES.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.name} — ${t.description}`));

  if (!APPLY) {
    console.log("\nDry-run listo. Repetí con --apply para crearlo.\n");
    return;
  }

  const dashboard = await api("/dashboards/", {
    name: "LookLab — Embudo & Comunidad",
    description: "Adquisición, activación, comunidad y retención. Generado por scripts/posthog-dashboard.ts.",
  });
  console.log(`\nDashboard creado (id ${dashboard.id}).`);

  for (const t of TILES) {
    const insight = await api("/insights/", {
      name: t.name,
      description: t.description,
      query: t.query,
      dashboards: [dashboard.id],
    });
    console.log(`  ✓ ${t.name} (insight ${insight.id})`);
  }

  console.log(`\nListo. Abrilo en: ${HOST}/project/${PROJECT_ID}/dashboard/${dashboard.id}\n`);
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
