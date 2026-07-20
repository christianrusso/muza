# Objetivo y contexto

> **En resumen**: LookLab es una app que puntúa outfits con IA para una ocasión concreta (no "¿queda bien?" en abstracto), con capa social e historial. Hoy está en lanzamiento gratis — los límites de plan pago ya existen en código pero están desactivados.

## Qué es

LookLab (nombre interno del repo: "Muza") es una app mobile-first que analiza una foto de un outfit con IA y devuelve un puntaje (0-100) desglosado en 10 categorías, con fortalezas, aspectos a mejorar y recomendaciones concretas. Tiene una capa social (comunidad con feed, likes, comentarios) e historial personal de análisis.

Tagline: *"Tu outfit, evaluado"* — *"Analizá tu outfit con IA: puntaje, recomendaciones y comunidad"*.

## Para quién

Usuario final que quiere feedback objetivo/rápido sobre si un outfit es adecuado para una ocasión concreta (trabajo, cita, entrevista, casamiento, etc.), no solo si "queda bien" en abstracto. El sistema pondera fuerte la adecuación a la ocasión (ver [06-scoring-engine.md](./06-scoring-engine.md)) — es el eje central del producto, no un factor más.

## Modelo de negocio

- Planes `free` / `pro` modelados en `src/lib/plans/limits.ts`, pero **actualmente en "lanzamiento gratis"**: los límites reales están hardcodeados a `null` (sin tope) para ambos planes.
- Existen constantes de límites definidas pero no usadas (`FREE_MONTHLY_ANALYSES_LIMIT = 5`, `FREE_HISTORY_WINDOW_DAYS = 30`) — quedaron ahí con un comentario explícito de revertir cuando se active la monetización.
- Precio del plan Pro es un placeholder: `PRO_MONTHLY_PRICE_USD_PLACEHOLDER = 0`.
- Diferencia funcional Free/Pro ya modelada mas no activa: `canSimulate` (feature de "Simulación IA", fuera de alcance actual — sin implementación visible más allá del flag) y `advancedRecommendations`.
- Ver detalle completo de esta decisión pendiente en [08-open-decisions.md](./08-open-decisions.md).

## Panel admin

Existe un dashboard interno (`/admin`) con métricas de negocio (usuarios, actividad de scoring, comunidad, embudo de activación), con su propio sistema de login desacoplado de Supabase Auth. Ver [07-flows.md](./07-flows.md#auth-admin).
