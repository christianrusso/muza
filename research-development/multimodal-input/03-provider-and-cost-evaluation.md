# Proveedores evaluados y costos, por fase

> **En resumen**: tabla consolidada de todo lo evaluado en esta carpeta. Ninguna idea prioritaria (guardarropa digital, importar fotos, multi-ángulo) necesita sumar un proveedor de pago ni pasar por revisión de ninguna plataforma — eso solo aplicaría si más adelante se evalúa video real (Gemini) o redes sociales (no recomendado).

Consolida los proveedores externos que aparecen en esta carpeta, con el tipo de costo real de cada uno (no todos cobran en dólares por request — algunos cobran en tiempo de ingeniería y riesgo de rechazo). Todos los precios están sujetos a cambiar; re-verificar contra la documentación oficial de cada proveedor antes de presupuestar en serio.

## Los dos tipos de costo que no hay que mezclar

1. **Costo de IA por uso** ($/request o $/token) — proveedores tipo OpenAI, Gemini. Escala con el volumen de análisis, previsible una vez que se conoce el precio por unidad.
2. **Costo de acceso/cumplimiento** (tiempo de ingeniería, revisión de la plataforma, riesgo de rechazo, mantenimiento continuo de políticas) — proveedores tipo Meta (Instagram/Facebook), TikTok. No es un precio por request, es fricción de proceso y riesgo de que la plataforma cambie las reglas (ya pasó con Instagram, ver [social-media-integration.md](./01-social-media-integration.md)).

## Proveedores de IA (procesamiento)

| Proveedor | Qué aporta | Modelo de costo | Estado hoy | Ya en el stack |
|---|---|---|---|---|
| OpenAI (`responses.parse()`, actual) | Scoring por imagen, incluye el flujo de fotos multi-ángulo (Camino A de [video-capture-feasibility.md](./00-video-capture-feasibility.md)) sin cambios | $/token, según modelo — ver [tech-stack.md](../general-app-research/01-tech-stack.md) | En producción | Sí |
| Google Gemini (video nativo) | Entendimiento real de video (frames + audio), solo si el Camino A no alcanza | $/token, ~300 tokens/segundo de video (barato, ver el detalle en [video-capture-feasibility.md](./00-video-capture-feasibility.md#el-costo-real-de-gemini-calculado)) | Disponible, no integrado | No — sumarlo es una decisión de arquitectura nueva (segundo proveedor de IA) |
| APIs de clima (para contexto automático de ocasión, ver [additional-ideas.md](./02-additional-ideas.md#contexto-de-clima-y-calendario-idea-más-chica-complementaria)) | Clima del día para sugerir ocasión | Generalmente nivel gratuito amplio para bajo volumen | No evaluado en detalle — bajo riesgo, bajo costo esperado | No |

## Proveedores de datos de redes sociales (acceso, no procesamiento de IA)

| Proveedor | Qué permitiría | Costo real | Estado hoy | Recomendación |
|---|---|---|---|---|
| Instagram (Graph API) | Leer fotos de la cuenta del usuario | Gratis en teoría, pero requiere cuenta Business/Creator | **Cuentas personales bloqueadas desde dic. 2024** — no disponible para el caso de uso principal | No construir |
| Facebook (Graph API, `user_photos`) | Leer fotos que el usuario subió/en las que está etiquetado | Gratis, pero App Review de Meta (semanas, riesgo de rechazo) + política de privacidad dedicada | Técnicamente disponible, fricción alta | No priorizar |
| TikTok (Display API) | Perfil + videos del usuario | **Pago para uso comercial/de producto en 2026** — no hay nivel gratuito para esto | Disponible con licencia paga | No priorizar |
| Pinterest | Boards públicos (señal aspiracional, no de guardarropa real) | Más abierto que los anteriores, igual requiere OAuth | Disponible, menor fricción relativa | Evaluar más adelante, no urgente |

## Costo por fase (si se decide avanzar)

No se agregan estas ideas al plan de fases de [implementation-plan.md](../adaptive-scoring/07-implementation-plan.md) todavía — son exploratorias, sin priorizar. Si en algún momento se decide avanzar, este sería el orden de menor a mayor costo/riesgo:

**Fase exploratoria A — costo casi nulo, sin proveedores nuevos**
- Guardarropa digital + importación desde rollo de cámara (ver [additional-ideas.md](./02-additional-ideas.md)) + fotos multi-ángulo (Camino A de video). Todo corre sobre el proveedor que ya existe (OpenAI), mismo modelo de costo que hoy, sin App Review de nadie.
- Costo de desarrollo: mismo orden de magnitud que una sub-fase chica de [implementation-plan.md](../adaptive-scoring/07-implementation-plan.md) (semanas, no meses) — no estimado en detalle en este documento porque depende de decisiones de alcance que todavía no están tomadas.

**Fase exploratoria B — un proveedor de IA nuevo, sin proveedores de redes sociales**
- Video real vía Gemini, solo si la Fase A muestra que hace falta. Costo de IA bajo (ver tabla arriba), costo de ingeniería medio (segundo proveedor, unificar criterio de scoring entre los dos).

**Fase exploratoria C — proveedores externos de datos, no recomendada por ahora**
- Cualquier integración con Instagram/Facebook/TikTok. Costo de acceso alto (revisión, licencia paga en el caso de TikTok, riesgo de que la plataforma cierre el acceso) para un valor que la Fase A ya cubre en gran parte. Revisar esta fase solo si las plataformas cambian su política de acceso, o si hay evidencia concreta de que el guardarropa/importación manual no alcanza.

## Resumen para decidir

Ninguna de las ideas de esta carpeta necesita, para arrancar, sumar un proveedor de pago nuevo ni pasar por la revisión de ninguna plataforma externa — el guardarropa digital y la importación manual de fotos (Fase exploratoria A) resuelven la mayor parte del objetivo original ("entender el estilo del usuario a partir de más información") con el stack y el proveedor que ya existen hoy.
