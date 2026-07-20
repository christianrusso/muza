# Fase 2 — Ajuste estadístico por cluster (Opción C de [06-ml-roadmap.md](../06-ml-roadmap.md))

> **En resumen**: ~3-5 semanas-persona para calcular, por cada grupo de outfits, un factor de corrección sobre el score — un paso intermedio entre "solo elegir mejores ejemplos" (Fase 1) y "entrenar un modelo propio" (Fase 3). Solo tiene sentido si los resultados de la Fase 1 muestran que hace falta.

Parte de [07-implementation-plan.md](../07-implementation-plan.md). Depende de los resultados de la Fase 1 (ver [00-phase-1-feedback-clustering-fewshot.md](./00-phase-1-feedback-clustering-fewshot.md)).

- ~3-5 semanas-persona: diseñar la función de ajuste, una tabla de coeficientes por `(cluster, ocasión)`, recalculo periódico, pruebas de regresión contra `labels.json`.
- Infraestructura: sin grandes cambios si la Fase 1 ya tiene el clustering funcionando — es una capa más de cálculo, no un sistema nuevo.
- Lenguajes: TypeScript para la función final (mismo lugar que `computeOverallScore`). Si el ajuste se vuelve más complejo (con más variables), puede convenir un script en Python (`pandas`/`scikit-learn`) para calcular los coeficientes fuera de línea — el resultado (los coeficientes, no el modelo en sí) se importa como configuración fija a TypeScript. No hace falta correr Python en producción.
