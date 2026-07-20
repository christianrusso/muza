# Multimodal input

**En una frase**: de dónde podría venir más información sobre el estilo del usuario (video, redes sociales, guardarropa digital) — pospuesto hasta validar adaptive-scoring en producción.

Investigación (no implementada) sobre sumar más fuentes de información al perfil de estilo del usuario y al scoring — video, redes sociales, guardarropa digital, y otras ideas. Complementa a [adaptive-scoring/](../adaptive-scoring/) (el motor de scoring en sí) y [ux-growth/](../ux-growth/) (retención) — esta carpeta evalúa **de dónde podría venir más información**, no cómo se calibra ni cómo se ve.

Origen: pedido explícito de evaluar si un usuario podría grabarse en video para tener más señal de fit/caída de la ropa, y si conectar Instagram/TikTok/Facebook podría alimentar su perfil de estilo. Ambas ideas se evaluaron a fondo — la conclusión no es la que se esperaba en el pedido original, ver el detalle en cada documento.

## Documentos

- [00-video-capture-feasibility.md](./00-video-capture-feasibility.md) — ¿las IA leen video? Sí, pero no el proveedor que ya usa LookLab. Compara fotos multi-ángulo (barato, sin proveedor nuevo) contra video real vía Gemini (más caro de integrar, no de usar), y cómo conectar cualquiera de los dos con el clustering que ya existe.
- [01-social-media-integration.md](./01-social-media-integration.md) — **hallazgo importante**: Instagram ya no permite acceso de apps de terceros a cuentas personales desde fines de 2024. Facebook y TikTok tienen fricción real (revisión, licencia paga). Propone una alternativa mucho más barata que resuelve el mismo objetivo de fondo.
- [02-additional-ideas.md](./02-additional-ideas.md) — guardarropa digital (la idea con mejor relación costo/valor de toda la carpeta), Pinterest, "guardar este look" desde cualquier sitio, contexto de clima/calendario.
- [03-provider-and-cost-evaluation.md](./03-provider-and-cost-evaluation.md) — tabla consolidada de proveedores, tipo de costo de cada uno (dólares vs. fricción de proceso), y una fase exploratoria de menor a mayor riesgo.

## Conclusión corta

Las dos ideas más fáciles de imaginar (video, redes sociales) resultan ser las más caras o directamente bloqueadas. Las ideas que más valor real aportan por menos esfuerzo — guardarropa digital, importar fotos ya existentes del teléfono — no dependen de ningún proveedor externo nuevo. Ver [03-provider-and-cost-evaluation.md](./03-provider-and-cost-evaluation.md#resumen-para-decidir) para el resumen ejecutivo.

## Estado

Investigación exploratoria, **deliberadamente pospuesta hasta que la Fase 1 de [adaptive-scoring/](../adaptive-scoring/) esté funcionando y el equipo entienda cómo se comporta en producción** (decisión de equipo, no técnica: primero validar y mejorar el motor de scoring con lo que ya existe, después evaluar sumar fuentes de datos nuevas). No tiene sentido invertir en más fuentes de información para un motor que todavía no se probó con feedback real — ver [07-implementation-plan.md](../adaptive-scoring/07-implementation-plan.md) para el estado de esa fase. No implementado, no es una spec.
