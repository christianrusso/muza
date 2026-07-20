# Fase 1B — Reto diario y feedback de recomendaciones

> **En resumen**: ~5.5-7 semanas-persona para construir el reto diario (backend + pantalla + racha) y calibrar las recomendaciones de mejora (👍/👎 + detectar automáticamente si alguien siguió un consejo). Depende de que el clustering de la Fase 1 ya exista, pero no de la Fase 2/3.

Parte de [07-implementation-plan.md](../07-implementation-plan.md). No depende de la Fase 2/3, pero sí de que 1.2 (clustering, ver [00-phase-1-feedback-clustering-fewshot.md](./00-phase-1-feedback-clustering-fewshot.md)) ya exista — ambas features reusan los mismos clusters para agregar su señal. Se pueden construir en paralelo entre sí una vez que 1.2 está lista.

### 1.5 Reto diario (~3-4 semanas-persona)
- Backend: 3 tablas nuevas (`daily_challenge`, `daily_challenge_items`, `daily_challenge_responses`, ver [08-daily-challenge.md](../08-daily-challenge.md#modelo-de-datos-propuesta-inicial-a-validar-en-la-spec)), el job diario que arma el reto (mismo batch job que el clustering), y el recorte/difuminado de cara en las fotos que se muestran — ~1.5-2 semanas.
- Frontend: pantalla del reto, reveal del resultado, contador de racha, y el `.fab` + `BottomSheet` que lo integran a la navegación existente (ver [01-daily-challenge-ui.md](../../ux-growth/01-daily-challenge-ui.md)) — ~1.5-2 semanas.

### 1.6 Feedback loop de recomendaciones (~2.5-3 semanas-persona)
- Auto-reporte 👍/👎 sobre las recomendaciones del propio resultado (mismo patrón y misma pantalla que 1.1) — ~0.5 semana.
- Señal implícita: comparar `detected_*` entre dos análisis del mismo usuario dentro de una ventana de tiempo, para detectar si una recomendación se siguió (ver [09-recommendations-feedback-loop.md](../09-recommendations-feedback-loop.md#señales-automáticas-sin-efecto-halo-sin-revisión-humana)) — ~1-1.5 semanas.
- Agregación por cluster y selección de qué recomendaciones mostrar como referencia (se monta sobre el mismo mecanismo de 1.3) — ~1 semana.

**Total Fase 1B: ~5.5-7 semanas-persona.**
