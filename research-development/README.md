# Research & Development

Documentación técnica y de proceso del proyecto LookLab, organizada por tema. Pensada para que alguien nuevo en el equipo pueda leerla y entender rápido qué hacer y qué no.

## En 2 minutos: la iniciativa principal (adaptive scoring)

**La idea.** Hoy, para que LookLab puntúe bien un outfit, alguien del equipo tiene que sentarse y etiquetar fotos a mano (qué es un buen o mal look, ejemplo por ejemplo). Eso no escala: cuantos más usuarios haya, más horas humanas hacen falta. La idea es que el sistema aprenda solo, a partir de cómo la propia comunidad reacciona a los resultados — sin que nadie tenga que revisar casos uno por uno.

**Cómo se haría.** Tres piezas que se construyen en orden:
1. Se le pregunta al usuario si está de acuerdo con su puntaje (👍/👎) — es el dato real de uso que hoy no existe.
2. Los outfits parecidos se agrupan automáticamente (por tipo de prenda, color, ocasión), para saber qué feedback aplica a qué tipo de look.
3. Cuando el modelo de IA puntúa un outfit nuevo, se le muestran los mejores ejemplos de ese mismo grupo — en vez de ejemplos genéricos por ocasión, como hoy.

El **"reto diario"** es el enganche: le pide a la comunidad que opine sobre 3 outfits por día, para juntar ese feedback más rápido y sin que se sienta como trabajo.

**Cuánto tarda.** Con una persona dedicada full-time, la parte central (motor de scoring + reto diario) son **~12-15 semanas** (3-3.5 meses). El equipo real de este proyecto son 2 personas trabajando part-time en esto, así que el tiempo de calendario más realista es **~6-9 meses**. El detalle fase por fase está en [adaptive-scoring/07-implementation-plan.md](./adaptive-scoring/07-implementation-plan.md).

**Qué gana la app.**
- El puntaje deja de depender de horas humanas de etiquetado — mejora con el uso real, no con más trabajo manual.
- El reto diario suma una razón para volver todos los días (retención), y de paso alimenta el punto anterior.
- Es la base para poder auditar por qué el sistema decidió lo que decidió (cada ajuste queda explicado, no es una caja negra) — importante antes de cobrar o escalar.

**Estado hoy.** Todavía es investigación, no código. La única excepción es el prototipo visual del reto diario (la tarjeta que ya se ve en el Home), que usa datos de prueba, no el feedback real todavía.

**¿Por dónde seguir leyendo?** Empezá por [adaptive-scoring/04-is-ml-the-right-answer.md](./adaptive-scoring/04-is-ml-the-right-answer.md) (¿hace falta IA de verdad, o alcanza con reglas más simples?) y después [adaptive-scoring/07-implementation-plan.md](./adaptive-scoring/07-implementation-plan.md) (plan y tiempos). El índice completo del tema está en [adaptive-scoring/README.md](./adaptive-scoring/README.md).

### Glosario rápido

- **Clustering** — agrupar automáticamente outfits parecidos (mismo tipo de prenda/color/ocasión), para tratarlos como un conjunto en vez de uno por uno.
- **Few-shot** — mostrarle a la IA un puñado de ejemplos concretos antes de pedirle que puntúe uno nuevo, para que entienda el criterio.
- **Ajuste gradual / shrinkage** — una regla matemática simple que hace que un grupo con pocos votos pese menos en el resultado final, para que 2 o 3 personas no distorsionen el puntaje de todos.
- **Piso mínimo estadístico** — la cantidad mínima de respuestas que tiene que juntar un grupo de outfits antes de que su feedback cuente para algo.
- **Efecto halo** — el riesgo de que a la gente le guste un outfit por quién lo tiene puesto, no por la ropa en sí — hay que diseñar el sistema para que no aprenda ese sesgo.
- **Semanas-persona** — unidad de esfuerzo (1 persona trabajando full-time una semana), no una fecha de calendario. Con el equipo actual part-time, hay que multiplicar por 2-2.5x para tener el tiempo real.
- **Proceso por lotes / batch job** — una tarea que corre sola, en un horario fijo (ej. una vez al día), en vez de ejecutarse al instante por cada usuario.

## Temas

- [general-app-research/](./general-app-research/) — qué es la app, arquitectura, stack, base de datos, flujos, motor de scoring, riesgos y decisiones abiertas.
- [design-system/](./design-system/) — paleta de colores, tipografía, iconografía y patrones de UI.
- [engineering-guidelines/](./engineering-guidelines/) — buenas prácticas, cosas a evitar, y cómo aplicamos Spec-Driven Development (SDD) en este repo.
- [adaptive-scoring/](./adaptive-scoring/) — investigación en curso sobre cómo evolucionar el motor de scoring con feedback real de uso en vez de curación 100% manual.
- [ux-growth/](./ux-growth/) — investigación sobre retención, activación, y cómo evoluciona la experiencia de usuario sin romper el sistema de diseño existente.
- [architecture-evolution/](./architecture-evolution/) — mejoras de código/infraestructura, alternativas de arquitectura, y qué falta para estar listos para escalar y para cobrar.
- [multimodal-input/](./multimodal-input/) — investigación sobre sumar video, redes sociales, y otras fuentes de información al perfil de estilo del usuario. **Pospuesta a propósito** hasta validar la Fase 1 de `adaptive-scoring/` en producción — no es la prioridad actual.

Cada carpeta nueva de tema sigue el mismo criterio: archivos chicos y específicos, con nombres en inglés, contenido objetivo (sin notas de conversación puntuales), enlazados entre sí con rutas relativas.
