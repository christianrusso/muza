# Brief técnico — Instrumentar embudo en PostHog (Sprint 1)

**Objetivo (roadmap, sección 10 y 4):** capturar los 8 eventos del embudo de activación —
`occasion_selected, photo, validation, score_viewed, shared, published, voted, followed` — para
tener el tablero de embudo vivo en PostHog y una baseline de activación/retención D1/D7 antes de
seguir iterando. Es el primer punto de la lista "arrancá por acá" porque sin esto no se puede medir
si el resto de los cambios funciona.

## Estado actual del repo

- `posthog-js` ya está instalado y **ya se inicializa** en `src/instrumentation-client.ts`, con
  `capture_pageview: false` + captura manual de `$pageview` en cada navegación del App Router.
- **No hay ningún evento custom todavía** — solo pageviews automáticos.
- El proyecto es Next.js (App Router) con Supabase. Hay un **modo demo** (`isDemoMode()` en
  `src/lib/demo.ts`) que se usa cuando no hay credenciales de Supabase configuradas; los eventos
  deben dispararse igual en ese modo (no depende de si hay backend real).

## Paso 0 — Crear un helper único de tracking

Antes de tocar las pantallas, crear `src/lib/analytics.ts` para no repetir el patrón
"nunca romper el flujo por un fallo de tracking" (el mismo criterio que ya usa
`instrumentation-client.ts` en `onRouterTransitionStart`):

```ts
// src/lib/analytics.ts
"use client";

import posthog from "posthog-js";

/**
 * Eventos del embudo de activación (roadmap, sección 6). Envolver siempre en
 * try/catch: un fallo de analítica nunca debe romper el flujo del usuario.
 */
export type FunnelEvent =
  | "occasion_selected"
  | "photo"
  | "validation"
  | "score_viewed"
  | "shared"
  | "published"
  | "voted"
  | "followed";

export function track(event: FunnelEvent, properties?: Record<string, unknown>) {
  try {
    posthog.capture(event, properties);
  } catch {
    // no-op: nunca romper la UI por un fallo de tracking
  }
}
```

Todas las capturas de abajo importan `track` de `@/lib/analytics` en vez de llamar a
`posthog.capture` directo — así el día de mañana se puede cambiar de proveedor de analítica en un
solo lugar.

## Los 8 eventos: dónde y cómo

### 1. `occasion_selected`

- **Archivo:** `src/components/analysis/OccasionGrid.tsx`
- **Dónde:** dentro de `handleContinue()`, justo antes del `router.push(...)`.
- **Propiedades:** `occasion_id`, `variant` (string vacío si no eligió matiz), `has_free_context`
  (boolean, si escribió el campo de texto libre).

```ts
function handleContinue() {
  const qs = new URLSearchParams({ occasion: selected! });
  const variant = groups
    .map((g) => byGroup[g.label])
    .filter(Boolean)
    .join(" · ");
  if (variant) qs.set("variant", variant);
  const ctx = context.trim();
  if (ctx) qs.set("context", ctx);

  track("occasion_selected", {
    occasion_id: selected,
    variant: variant || null,
    has_free_context: Boolean(ctx),
  });

  router.push(`/analysis/new/capture?${qs.toString()}`);
}
```

### 2. `photo`

- **Archivo:** `src/components/analysis/CameraCapture.tsx`
- **Dónde:** dentro de `uploadAndCreateAnalysis()`, justo antes de cada `router.push(...)` que
  avanza a `validating` (hay dos ramas: con y sin Supabase configurado — instrumentar las dos, o
  refactorizar a un único punto de salida si se prefiere).
- **Propiedades:** `occasion_id`, `source` (`"camera"` si vino de `handleShutter`, `"gallery"` si
  vino de `handleFileSelected` — hay que pasar ese dato a `previewBlob`/`captured` para tenerlo acá).

```ts
// en previewBlob, agregar el origen:
function previewBlob(blob: Blob, source: "camera" | "gallery") {
  setError(null);
  setCaptured({ blob, url: URL.createObjectURL(blob), source });
}
// handleShutter → previewBlob(blob, "camera")
// handleFileSelected → previewBlob(file, "gallery")

// en uploadAndCreateAnalysis, antes de cada router.push(`/analysis/${body.id}/validating...`):
track("photo", { occasion_id: occasionId, source: captured?.source ?? "camera" });
```

(Ajustar el tipo de `captured` en el `useState` para incluir `source`.)

### 3. `validation`

- **Archivo:** `src/app/(app)/analysis/[id]/validating/page.tsx`
- **Dónde:** dentro de `run()`, justo después de tener `validation` (antes de los tres
  `router.replace`).
- **Propiedades:** `occasion_id`, `verdict` (`"valid" | "partial" | "invalid"`), `analysis_type`
  (viene de `validation.analysisType` cuando existe).

```ts
const validateRes = await fetch(`/api/analyses/${params.id}/validate`, { method: "POST" });
const validation = await validateRes.json();

track("validation", {
  occasion_id: occasion,
  verdict: !validateRes.ok ? "invalid" : validation.verdict,
  analysis_type: validation.analysisType ?? null,
});

if (!validateRes.ok || validation.verdict === "invalid") { ... }
```

Este componente no es `"use client"` con export default directo pero `ValidatingContent` sí lo es
(usa hooks) — el import de `track` funciona igual.

### 4. `score_viewed`

Este es el más delicado porque `src/app/(app)/analysis/[id]/result/page.tsx` es un **Server
Component** (async, sin `"use client"`) — no puede llamar `posthog.capture` directo. Opciones:

- **Recomendado:** crear un componente cliente chico, `src/components/analysis/ScoreViewedTracker.tsx`,
  que no renderiza nada visible y solo dispara el evento en un `useEffect` una vez montado:

```tsx
// src/components/analysis/ScoreViewedTracker.tsx
"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

export function ScoreViewedTracker(props: {
  analysisId: string;
  occasionId: string;
  analysisType: string;
  overallScore: number;
}) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    track("score_viewed", {
      analysis_id: props.analysisId,
      occasion_id: props.occasionId,
      analysis_type: props.analysisType,
      overall_score: props.overallScore,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
```

- En `result/page.tsx`, importarlo y montarlo junto al resto cuando `analysis.overallScore !== null`
  (es decir, en la rama que sí renderiza el resultado real, no en `ScoringInProgress`):

```tsx
return (
  <div className="relative flex h-dvh flex-col overflow-hidden">
    <ScoreViewedTracker
      analysisId={id}
      occasionId={analysis.occasionId}
      analysisType={analysis.analysisType}
      overallScore={analysis.overallScore}
    />
    {/* ...resto del JSX existente... */}
```

### 5. `shared`

- **Archivo:** `src/components/analysis/ShareButton.tsx`
- **Dónde:** dentro de `handleShare()`, en ambas ramas (native share sheet y fallback de
  clipboard).
- **Propiedades:** `method` (`"native_share" | "copy_link"`).

```ts
async function handleShare() {
  const url = window.location.href;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "LookLab — Mi Outfit Score", url });
      track("shared", { method: "native_share" });
    } catch {
      // el usuario canceló el share sheet — no trackear
    }
  } else {
    await navigator.clipboard.writeText(url);
    track("shared", { method: "copy_link" });
    setToast("Enlace copiado");
    setTimeout(() => setToast(null), 2000);
  }
}
```

Nota: `ShareButton` no recibe hoy el `analysisId` ni la ocasión como prop — si se quiere esa
propiedad en el evento, hay que pasárselo desde `result/page.tsx` (`<ShareButton analysisId={id} />`)
igual que se hace con `ScoreViewedTracker`.

### 6. `published`

- **Archivo:** `src/components/community/PublishButton.tsx`
- **Dónde:** dentro de `handlePublish()`, solo si `res.ok`.
- **Propiedades:** `analysis_id`.

```ts
async function handlePublish() {
  setSubmitting(true);
  const res = await fetch("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisId }),
  });
  setSubmitting(false);
  if (res.ok) {
    track("published", { analysis_id: analysisId });
    router.push("/community");
  }
}
```

### 7. `voted`

- **Archivo:** `src/components/community/VoteDeck.tsx`
- **Dónde:** dentro de `vote(bucket)`, en el `try` (éxito) — decidir si también trackear el catch;
  recomendado trackear solo el caso exitoso para no ensuciar el embudo con fallos de red.
- **Propiedades:** `post_id`, `bucket` (lo que votó el usuario), `correct` (comparando contra
  `card.overallScore` una vez que se sabe el bucket real).

```ts
async function vote(bucket: VoteBucket) {
  if (voting || reveal) return;
  setVoting(true);
  try {
    const res = await fetch(`/api/community/posts/${card.postId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket }),
    });
    const data = (await res.json()) as { tally: VoteTally };
    setReveal({ bucket, tally: data.tally });
    track("voted", {
      post_id: card.postId,
      bucket,
      correct: bucketForScore(aiScore) === bucket,
    });
  } catch {
    // ...
  } finally {
    setVoting(false);
  }
}
```

(`bucketForScore` y `aiScore` ya están importados/definidos en ese archivo.)

### 8. `followed`

- **Archivo:** `src/components/community/FollowButton.tsx`
- **Dónde:** dentro de `toggle()`, después de que la respuesta confirma el nuevo estado. Solo
  trackear cuando pasa de `false → true` (empezar a seguir), no cuando deja de seguir — el evento
  de embudo es "trajo/generó un follow", no el unfollow.
- **Propiedades:** `target_user_id`.

```ts
async function toggle() {
  if (pending) return;
  const next = !following;
  setFollowing(next);
  setPending(true);
  try {
    const res = await fetch(`/api/community/users/${userId}/follow`, { method: "POST" });
    if (!res.ok) throw new Error("follow failed");
    const data = (await res.json()) as { following: boolean };
    setFollowing(data.following);
    if (data.following) {
      track("followed", { target_user_id: userId });
    }
  } catch {
    setFollowing(!next);
  } finally {
    setPending(false);
  }
}
```

## Checklist de aceptación

- [ ] `src/lib/analytics.ts` creado con la función `track()`.
- [ ] Los 8 eventos disparan en el punto exacto indicado, con sus propiedades.
- [ ] `score_viewed` no se dispara mientras `ScoringInProgress` está activo (solo cuando ya hay
      `overallScore`), y no se duplica en re-renders (usar `useRef` como en el ejemplo).
- [ ] Los eventos funcionan igual en modo demo (sin Supabase configurado) — no dependen del
      backend real, solo del flujo de UI.
- [ ] Ningún evento puede romper el flujo del usuario si PostHog falla (todo pasa por `track()`,
      que ya atrapa errores).
- [ ] Verificación manual: abrir PostHog → **Activity → Live events** (o **Explore**), recorrer el
      flujo completo una vez (elegir ocasión → sacar/subir foto → validar → ver score → compartir →
      publicar → votar un look ajeno → seguir a alguien) y confirmar que aparecen los 8 eventos con
      sus propiedades.
- [ ] Armar en PostHog un **Funnel insight** con la secuencia
      `occasion_selected → photo → validation → score_viewed → shared/published` para tener el
      "tablero de embudo vivo" que pide el roadmap (Sprint 1, hito de métricas).

## Notas para quien lo implemente

- Mantener el mismo criterio ya usado en `instrumentation-client.ts`: **nunca** dejar que un fallo
  de tracking rompa la experiencia (por eso el `track()` centralizado con try/catch).
- No hace falta un evento nuevo por unfollow, por "repetir foto" ni por "votar catch" — el roadmap
  pide medir el embudo de activación, no cada micro-interacción.
- Si en el futuro se agregan más eventos (roadmap sección 6 menciona también
  `registro`, `onboarding_completo`, `volvió D1/D7/D30` — estos últimos se derivan solos de
  `$pageview`/sesiones en PostHog, no hace falta emitirlos a mano), agregarlos al mismo
  `FunnelEvent` type en `src/lib/analytics.ts` para mantener todo centralizado.
