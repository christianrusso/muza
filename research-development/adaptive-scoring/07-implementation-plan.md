# Plan de implementación: fases, stack, infraestructura e impacto

> **En resumen**: con 1 persona full-time, la parte central (Fase 1 + 1B) toma ~12-15 semanas (3-3.5 meses). Con el equipo real (2 personas, probablemente part-time), el tiempo de calendario esperado es **~6-9 meses**. No hace falta stack nuevo para la Fase 1/1B — todo corre con lo que ya existe (Next.js, Supabase, TypeScript). Fase 2 y 3 quedan sin estimar en detalle: dependen de resultados que todavía no existen.

Baja [06-ml-roadmap.md](./06-ml-roadmap.md) a pasos concretos: tiempos estimados, qué lenguajes y prácticas hacen falta, qué infraestructura se necesita, y qué cambia en la app existente. Sigue siendo investigación — no es una spec, no hay fecha comprometida.

El detalle de cada fase vive en [phases/](./phases/) — este documento es el índice: supuestos, un resumen corto de cada fase, y el tiempo total consolidado.

## Supuestos de esta estimación

- **Equipo**: `git shortlog` muestra 2 personas contribuyendo al repo hoy. Estas estimaciones asumen **1 desarrollador a tiempo completo** dedicado a esto por fase. Si en la práctica es part-time (lo más probable con el equipo actual), hay que multiplicar los tiempos por 2-2.5x.
- Los tiempos están en **semanas-persona**, no en fechas de calendario.
- No incluye diseño ni control de calidad por separado — se asume que la misma persona cubre las dos cosas para el alcance de la Fase 1.
- Estos números sirven para ordenar la conversación, no son un compromiso — se ajustan recién al escribir la spec de la Fase 1.

## Las fases

- **[Fase 1 — Feedback explícito + clustering básico + few-shot dinámico](./phases/00-phase-1-feedback-clustering-fewshot.md)** (~5-7 semanas-persona): el motor de scoring automático en sí — la parte que reemplaza la curación 100% manual.
- **[Fase 1B — Reto diario y feedback de recomendaciones](./phases/01-phase-1b-daily-challenge-recommendations.md)** (~5.5-7 semanas-persona): depende de que 1.2 (clustering) ya exista. Reto diario + calibrar las sugerencias de mejora del outfit.
- **[Fase 2 — Ajuste estadístico por cluster](./phases/02-phase-2-statistical-adjustment.md)** (~3-5 semanas-persona): depende de los resultados de la Fase 1.
- **[Fase 3 — Modelo propio](./phases/03-phase-3-custom-model.md)** (meses, no semanas): lejana, solo si la Fase 1/2 muestran que hace falta.

## Costo de las mejoras que no son parte del motor de scoring

Estas no bloquean nada de lo anterior y se pueden hacer en paralelo, intercaladas, sin ocupar a la misma persona full-time:

- **Mejoras baratas de infraestructura** (CI/CD con GitHub Actions, Sentry, `.env.example` — ver [00-code-and-infra-improvements.md](../architecture-evolution/00-code-and-infra-improvements.md)): ~1 semana-persona en total, sumando todos los ítems chicos de esa lista.
- **Activar los límites de plan pago que ya existen en código** (`FREE_MONTHLY_ANALYSES_LIMIT`/`FREE_HISTORY_WINDOW_DAYS`, ver [01-payment-readiness.md](../architecture-evolution/01-payment-readiness.md)): ~0.5 semana-persona. Integrar un proveedor de pago real de verdad (webhook, casos borde de facturación) queda fuera de esta cuenta — no se puede estimar hasta elegir proveedor.

## Cuánto tiempo lleva todo esto, en total

| Bloque | Semanas-persona | Detalle |
|---|---|---|
| Fase 1 (motor de scoring automático) | 5-7 | [phases/00-phase-1-feedback-clustering-fewshot.md](./phases/00-phase-1-feedback-clustering-fewshot.md) |
| Fase 1B (reto diario + recomendaciones) | 5.5-7 | [phases/01-phase-1b-daily-challenge-recommendations.md](./phases/01-phase-1b-daily-challenge-recommendations.md) |
| Mejoras de infraestructura + activar límites de plan | 1.5 | Sección anterior |
| **Total con 1 desarrollador full-time** | **~12-15.5 semanas (3-3.5 meses)** | — |

**El número que importa de verdad**: el equipo real de este proyecto son 2 personas (ver `git shortlog`), casi seguro part-time en esto y no full-time dedicadas. Aplicando el mismo multiplicador de 2-2.5x de los "Supuestos" de arriba, el tiempo de calendario real es **~6-9 meses**, no 3.

**Fuera de esta cuenta, sin estimar**: la Fase 2 y la Fase 3 — la Fase 3 en particular es de "meses, no semanas" y depende de sumar experiencia en ML que hoy el equipo no tiene. Tampoco está estimada la integración real con un proveedor de pagos, que depende de una decisión de negocio (cuál proveedor) que todavía no está tomada.

## Requisitos técnicos e infraestructura — resumen por fase

| Fase | Qué se suma al stack | Costo extra de infraestructura |
|---|---|---|
| 1 | Nada nuevo (Next.js, Supabase, TypeScript) — opcional `pgvector` si se pasa a análisis visual de imagen | Bajo — el proceso por lotes corre en lo que ya existe (cron/edge function), `pgvector` es una extensión de Postgres sin costo extra en Supabase |
| 1B | Nada nuevo — mismo stack, mismas tablas Postgres, mismo batch job | Bajo |
| 2 | Opcional: un script en Python fuera de línea para calcular coeficientes (no corre en producción) | Bajo — cómputo puntual, no continuo |
| 3 | Un proceso completo de entrenamiento (Python, framework de entrenamiento, tal vez GPU o un servicio gestionado) | Medio-alto — a cotizar cuando llegue el momento, no calculado en este documento |

## Open questions

- ¿Cuál es la disponibilidad real del equipo (tiempo completo o parcial, cuántas personas) para ajustar estos tiempos con precisión?

Preguntas específicas de cada fase están en su propio archivo dentro de [phases/](./phases/).
