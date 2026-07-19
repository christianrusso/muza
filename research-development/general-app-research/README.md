# General App Research

**En una frase**: cómo está construida LookLab hoy — stack, arquitectura, base de datos, motor de scoring y flujos principales.

Índice del research inicial de LookLab (Muza). Cada archivo cubre un tema puntual — son la base de conocimiento para seguir iterando sobre la app.

- [00-objective-and-context.md](./00-objective-and-context.md) — qué es la app, para quién, modelo de negocio actual.
- [01-tech-stack.md](./01-tech-stack.md) — lenguajes, frameworks, librerías, hosting.
- [02-architecture.md](./02-architecture.md) — capas de la app, cómo se conectan entre sí.
- [03-patterns.md](./03-patterns.md) — patrones de diseño recurrentes en el código.
- [04-data-model.md](./04-data-model.md) — tablas de la base de datos y relaciones.
- [05-database.md](./05-database.md) — cómo funciona Supabase acá: RLS, storage, funciones, historial de bugs de seguridad.
- [06-scoring-engine.md](./06-scoring-engine.md) — cómo se calcula el puntaje de un outfit (motor central de la app).
- [07-flows.md](./07-flows.md) — flujos principales: auth, análisis, comunidad.
- [08-open-decisions.md](./08-open-decisions.md) — cosas definidas a medias o pendientes de decisión de producto.
- [09-risks.md](./09-risks.md) — riesgos técnicos y cuestiones a tener en cuenta antes de tocar ciertas partes.

Fecha del research: 2026-07-10. Branch: `research/looklab-app-audit`.
