# Tech stack

## Lenguaje

TypeScript estricto (`strict: true` en `tsconfig.json`), alias `@/*` → `src/*`. Cero usos de `any` en `src/`.

## Framework

Next.js **16.2.9** (App Router) + React **19.2.4**.

⚠️ Esta versión de Next.js tiene diferencias de convención respecto a lo habitual (ver `AGENTS.md` del repo). Confirmado en código: **el middleware no es `middleware.ts`**, es `src/proxy.ts` con una función exportada `proxy()`. Cualquier trabajo sobre routing/middleware debe usar esa convención. Antes de escribir código que dependa de una API de Next.js "de memoria", conviene chequear si esta versión custom la cambió.

## Styling

Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline`) + design system propio de variables CSS en `src/app/globals.css` (paleta coral/paper/ink, colores semánticos por tag de tipo de análisis). No usa una librería de componentes externa (no shadcn/Radix) — todo es UI propia en `src/components/ui/`. Fuentes: Instrument Serif + Manrope + Material Symbols.

## Backend / datos

- **Supabase**: Postgres + Auth + Storage. Cliente vía `@supabase/ssr` y `@supabase/supabase-js`. Ver [05-database.md](./05-database.md) y [04-data-model.md](./04-data-model.md).
- Migraciones SQL versionadas en `supabase/migrations/` (14 archivos a la fecha de este research).

## IA

OpenAI SDK (`openai@6.45.0`), modelo de visión, salida estructurada con `zod` vía `zodTextFormat` (`responses.parse()`, `temperature: 0` para consistencia del score). Ver [06-scoring-engine.md](./06-scoring-engine.md).

## Analítica

PostHog (`posthog-js`), inicializado en `src/instrumentation-client.ts` con pageviews manuales (necesario en App Router, no automático).

## Hosting

Vercel, región `gru1` (São Paulo) — elegida por latencia hacia Supabase US East (hay instrumentación de perf específica para medir esto, ver [02-architecture.md](./02-architecture.md)).

## Testing / calidad

- Test runner nativo de Node (`node --import tsx --test`), no Jest/Vitest.
- ESLint 9 flat config (`eslint-config-next/core-web-vitals` + `/typescript`). Sin Prettier explícito.
- Sin CI/CD configurado (ver [09-risks.md](./09-risks.md)).
