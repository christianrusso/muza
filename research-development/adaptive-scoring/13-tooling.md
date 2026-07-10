# Herramientas/skills de Claude Code para esta iniciativa

Revisión de si hay algún skill instalable que ayude puntualmente a pensar o construir la parte de aprendizaje automático de esta iniciativa.

## Resultado: no hay ningún skill dedicado a ML/ciencia de datos disponible hoy

Se revisaron los skills disponibles en este entorno. Son, en su mayoría, de dos familias: **engineering** (genéricos de ingeniería de software) y **anthropic-skills** (documentos de oficina, búsqueda de empleo, y un set de skills de "migración de país" sin relación con este proyecto). No hay ninguno pensado para diseñar modelos, entrenar, elegir variables, medir resultados de forma estadística, o revisar sesgos — que es justo el tipo de trabajo que hace falta para las Fases 2-3 de [06-ml-roadmap.md](./06-ml-roadmap.md).

## Lo que sí puede ayudar, con su límite

| Skill | Para qué sirve acá | Límite |
|---|---|---|
| `engineering:system-design` | Ordenar el diseño detallado de la arquitectura de la Fase 1 (feedback → clustering → few-shot dinámico) antes de escribir la spec | No aporta criterio de ML o estadística en sí, es proceso de diseño de sistemas |
| `engineering:architecture` | Parecido, para decisiones de cómo se organiza el código y los datos | Lo mismo |
| `engineering:testing-strategy` | Ordenar cómo se prueba el pipeline de calibración (hoy el único set de pruebas es `tests/scoring.test.ts`, ver [09-risks.md](../general-app-research/09-risks.md)) — importa porque cualquier cambio en scoring debería tener una red de contención | No dice qué métricas de ML usar, solo cómo armar la estrategia de pruebas en general |
| `claude-api` | Referencia de la API de Claude/Anthropic — útil solo si en algún momento se evalúa sumar o cambiar de proveedor de IA (hoy todo corre sobre OpenAI, ver [01-tech-stack.md](../general-app-research/01-tech-stack.md)) | No es una decisión tomada, es una opción a futuro, sin apuro |
| `skill-creator` | Permite armar un skill **propio** del proyecto — candidato concreto: envolver el uso de `scripts/eval/run.ts` + revisar `labels.json` en un skill repetible para el equipo, en vez de acordarse de las opciones de línea de comandos cada vez | Ayuda a la comodidad del proceso que ya existe, no reemplaza el criterio de alguien con experiencia en ML |

## Qué falta que ningún skill de este entorno cubre

Diseñar el clustering, el piso mínimo de confianza, y (si se llega a la Fase 2/3) el ajuste estadístico o el modelo propio, necesita criterio de ML/estadística aplicada que no viene empaquetado como skill acá — es conocimiento de dominio, no algo que un skill automatice. Para la Fase 1 alcanza con el razonamiento ya escrito en [01-feedback-signal.md](./01-feedback-signal.md) y [02-clustering.md](./02-clustering.md) más buen criterio de ingeniería (ahí ayudan los skills de `engineering:*`). Para la Fase 2/3, lo más realista es que haga falta sumar a alguien con experiencia real en ML o ciencia de datos, en el equipo o como consultor — ningún skill reemplaza eso (ver también la estimación de la Fase 3 en [03-fase-3-modelo-propio.md](./phases/03-fase-3-modelo-propio.md#fase-3--modelo-propio-opción-b-de-ml-roadmapmd)).

## Recomendación concreta

1. Usar `engineering:system-design` cuando se pase de este research a la spec de la Fase 1, para bajar el diseño a algo que se pueda construir.
2. Evaluar armar (con `skill-creator`) un skill chico y propio del repo que envuelva el uso del harness de evaluación — es barato y mejora directamente un proceso que ya existe y hoy se usa a mano.
3. No hay nada más que instalar hoy — el resto es experiencia de una persona, no una herramienta.

## Skills externos revisados (fuera de los disponibles en este entorno)

Se revisaron 3 skills/plugins de terceros para instalar, a pedido explícito. La revisión se hizo clonando cada repo y leyendo el código (no solo el README): sin scripts de instalación sospechosos, sin `curl|bash` ni ejecución de contenido remoto, sin llamadas de red a lugares desconocidos, dependencias comunes y conocidas. Los tres tienen buena reputación (cantidad de estrellas/forks en GitHub).

| Skill | Qué es | Para qué sirve acá | Estado (revisado en disco, `%USERPROFILE%\.claude`) |
|---|---|---|---|
| [`ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Sistemas de diseño, paletas de color, tipografía (104k★) | Útil si se llega a diseñar la pantalla del feedback explícito o del onboarding de preferencias (ver [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md)) | ✅ Instalado — `~/.claude/skills/ui-ux-pro-max/` con `SKILL.md` + `data/` + `scripts/`. El instalador también trajo skills complementarios del mismo paquete: `brand`, `design`, `design-system`, `banner-design`, `slides`, `ui-styling` |
| [`gsd-core`](https://github.com/open-gsd/gsd-core) (antes `gsd-build/get-shit-done`, hoy archivado) | Sistema completo de meta-prompting/desarrollo guiado por especificaciones (comandos, subagentes, hooks) (6.3k★) | Se solapa con el proceso que ya usa este repo (ver [02-spec-driven-development.md](../engineering-guidelines/02-spec-driven-development.md)) — más una alternativa/complemento de proceso que una herramienta de ML en sí | ✅ Instalado — y es una instalación grande: cerca de 70 skills `gsd-*`, más `~/.claude/hooks/` (se engancha a `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, etc. en el `settings.json` **global**, así que afecta todas las sesiones de Claude Code en esta máquina, no solo `muza`), agentes propios, y una barra de estado personalizada. Se revisaron los hooks que corren solos: avisan pero no bloquean nada, salvo uno (`gsd-worktree-path-guard`) que solo actúa dentro de flujos de ejecución aislada propios de GSD — no debería molestar en el trabajo normal acá |
| [`agent-skills-for-context-engineering`](https://github.com/muratcankoylan/agent-skills-for-context-engineering) | 16 skills sobre cómo manejar el contexto de un agente/LLM (17.1k★) | El más directamente relacionado con este trabajo: manejo de contexto, evaluación, diseño de herramientas — aplica al trabajo con los prompts de `src/lib/ai/prompts/scoring.prompt.ts` | ❌ No instalado — no hay `~/.claude/plugins/` ni ningún skill `context-*` de este paquete en el disco. El comando `/plugin marketplace add` no dejó rastro; probablemente no llegó a correrse en una sesión donde funcione |

`ui-ux-pro-max` y `gsd-core` no resuelven el trabajo de criterio de ML/estadística en sí (ver arriba) — son herramientas de proceso/diseño, no de modelado. `context-engineering` sí hubiera sido útil para eso y quedó pendiente.

## Herramienta relacionada, no instalada: `llm-council`

[`karpathy/llm-council`](https://github.com/karpathy/llm-council) (22.5k★) no es un skill de Claude Code — es una aplicación aparte (backend + frontend) que reparte una pregunta entre varios LLMs usando OpenRouter, hace que se revisen y ordenen entre sí de forma anónima, y un modelo "Presidente" arma la respuesta final. Código chico y prolijo, revisado sin encontrar riesgos, pero sin mantenimiento activo (el propio autor dice: *"99% vibe coded... no lo voy a mantener"*) y necesita una API key de OpenRouter paga (cada consulta dispara unas 8-9 llamadas a modelos de punta).

**Por qué igual vale la pena tenerlo anotado, sin instalarlo**: el patrón "varios modelos puntúan lo mismo y se revisan entre sí antes de dar un veredicto" sirve como técnica de calibración *fuera de producción* — por ejemplo, para decidir con más confianza si una foto nueva merece entrar al banco `scoring_examples` (hoy es el criterio de una sola persona, ver [00-current-state.md](./00-current-state.md)), o para revisar casos de desacuerdo en `scripts/eval/labels.json` con más de un criterio antes de darlos por buenos. **No aplica a producción**: el diseño de `scoreOutfit.ts` usa a propósito una sola llamada predecible (`temperature: 0`, ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md)) — meter un patrón de consenso entre varios modelos ahí multiplicaría el costo y el tiempo de espera por 8-9 veces sin que esté claro que mejora el resultado.

Queda anotado como técnica a considerar para la etapa de curación/calibración de la Fase 1 (ver [07-implementation-plan.md](./07-implementation-plan.md)), no como herramienta a instalar ahora.

## Open questions

- ¿Vale la pena invertir tiempo en el skill del harness de evaluación ahora, o esperar a que el pipeline de la Fase 1 esté más definido (para no envolver un proceso que todavía va a cambiar de forma)? Sugerido: esperar a la spec de la Fase 1.
- Si se prueba `llm-council` más adelante para calibración fuera de producción, ¿quién paga la API de OpenRouter?
