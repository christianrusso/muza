# Fase 3 — Modelo propio (Opción B de [06-ml-roadmap.md](../06-ml-roadmap.md))

> **En resumen**: entrenar un modelo propio — meses, no semanas, y probablemente necesita sumar a alguien con experiencia en ML. Lejana a propósito: solo se calcula en serio si la Fase 1/2 muestran que hace falta.

Parte de [07-implementation-plan.md](../07-implementation-plan.md). Lejana, y depende del volumen que haya. No se puede estimar en serio en este documento:

- Orden de magnitud: **meses, no semanas**, y normalmente hace falta sumar a alguien con experiencia real en aprendizaje automático o visión por computadora — no es una extensión natural del stack actual (TypeScript/Next.js/Supabase).
- Infraestructura: un proceso de entrenamiento (Python + PyTorch/TensorFlow, o un servicio gestionado de fine-tuning), almacenamiento versionado de los datos de entrenamiento, y tal vez GPU (para entrenar y/o para responder, si no se usa un servicio gestionado).
- Solo tiene sentido calcularlo en detalle si la Fase 1/2 muestran que hace falta (ver el criterio de fases en [06-ml-roadmap.md](../06-ml-roadmap.md#propuesta-de-fases-a-validar-no-una-decisión-cerrada)).

## Open questions

- ¿Quién define y aprueba el presupuesto si se llega a evaluar esta fase en serio (GPU/servicio gestionado y tal vez una nueva contratación)?
