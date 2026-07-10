# Fase 1 — Feedback explícito + clustering básico + few-shot dinámico

Parte de [07-implementation-plan.md](../07-implementation-plan.md) — ver ahí los supuestos de esta estimación (equipo, semanas-persona) y la tabla consolidada de tiempos totales.

### 1.1 Señal de feedback explícita (~1-1.5 semanas)
- Migración: una tabla nueva (ej. `score_feedback`: `analysis_id → analyses`, `user_id → profiles`, `agree boolean`, `reason text` opcional, `created_at`, un voto por análisis y usuario), con reglas de acceso donde cada uno solo puede escribir lo suyo. Para leer el resumen sin mostrar el voto de cada persona, una función especial (mismo patrón que ya usa `admin_metrics()`, ver [05-database.md](../../general-app-research/05-database.md)).
- Pantalla: un componente nuevo en `analysis/[id]/result` (👍/👎 + un motivo opcional).
- Métricas: un evento en PostHog para medir cuánta gente responde.
- Lenguajes/prácticas: TypeScript (Next.js) + SQL (migración en Supabase). Ningún lenguaje nuevo.

### 1.2 Clustering básico de outfits (~2-3 semanas)
- Algoritmo: clustering incremental por superposición de tags (no k-means, no hay un número de clusters fijo de antemano) — ver el detalle completo en [02-clustering.md](../02-clustering.md#con-qué-tecnología-se-construye). Un análisis nuevo se compara contra los clusters ya existentes de la misma ocasión (`detected_prendas_superiores/inferiores/calzado/accesorios`, `detected_colores`, `detected_estilo`) y se asigna al más parecido si supera un umbral, o crea uno nuevo si no. Sin análisis visual de la imagen todavía — más barato y más rápido de probar que arrancar directo con eso.
- **Calibrar el umbral es parte del alcance de esta sub-fase, no un detalle de implementación menor**: correr el algoritmo sobre los análisis históricos (o sobre `labels.json`/`scoring_examples` si el volumen real todavía es bajo), inspeccionar a mano una muestra de los clusters resultantes, y ajustar el número hasta que la agrupación se vea razonable (outfits claramente distintos no quedan juntos, outfits parecidos no quedan separados). Sin este paso, cualquier umbral fijado sin mirar datos reales es una adivinanza.
- Migración: una tabla `outfit_clusters` o una columna `cluster_id` en `analyses`. Se recalcula por lotes (una vez al día, mismo job que el resto de la iniciativa — ver [00-code-and-infra-improvements.md](../../architecture-evolution/00-code-and-infra-improvements.md#dónde-corren-los-procesos-por-lotes-clustering-armado-del-reto-diario)), no al instante.
- Infraestructura: ninguna nueva — el cálculo corre en Node/TypeScript, sin librería de clustering externa. Si más adelante hace falta pasar a un análisis visual de la imagen, hay que sumar `pgvector` como extensión de la base de datos en Supabase (hoy no está habilitada, ver [01-tech-stack.md](../../general-app-research/01-tech-stack.md)) y un modelo que genere esos vectores (API de OpenAI u otro proveedor) — descartado para esta fase, ver [02-clustering.md](../02-clustering.md#con-qué-tecnología-se-construye).
- Lenguajes/prácticas: TypeScript, SQL. Testeable con el mismo runner nativo de Node que ya usa el repo (`node --test`) — la función de similitud y el algoritmo de asignación son lógica pura, sin dependencias externas que mockear.

### 1.3 Selección dinámica de few-shot (~1-1.5 semanas)
- Cambia `src/lib/ai/scoreOutfit.ts` para elegir los `scoring_examples` por `(cluster, ocasión)` con el piso mínimo y el ajuste gradual descritos en [01-feedback-signal.md](../01-feedback-signal.md), en vez de filtrar solo por ocasión como hoy.
- Depende de verdad de 1.1 y 1.2 — no se puede hacer en paralelo del todo, necesita datos ya juntados de las dos.
- Pruebas: ampliar `tests/scoring.test.ts` (el único test que existe hoy sobre esta lógica, ver [09-risks.md](../../general-app-research/09-risks.md)) y correr `scripts/eval/run.ts` antes y después para comparar contra `labels.json` como punto de partida.

### 1.4 Instrumentación (~0.5-1 semana)
- Ampliar `admin_metrics()` con las métricas nuevas: cuánta gente no está de acuerdo con su score, cuánto feedback hay por cluster, cuántos `scoring_examples` siguen cargándose a mano contra cuántos se eligen solos.

**Total Fase 1: ~5-7 semanas-persona.**

## Cuándo se considera "lista"

No por sensación — los criterios de aceptación y casos de prueba concretos de cada paso están en [10-acceptance-criteria-and-testing.md](../10-acceptance-criteria-and-testing.md#11-señal-de-feedback-explícita), junto con los 4 frenos obligatorios (legal, escala mínima, interruptor de apagado, equidad) que hay que resolver antes de activar cualquier parte de esta fase en producción.

## Qué cambia en la app (Fase 1)

- El usuario ve un elemento chico y nuevo en la pantalla de resultado (el pedido de feedback). No cambia el flujo de sacar la foto → validarla → puntuarla → ver el resultado.
- El score puede empezar a variar un poco para outfits que antes no tenían buenos ejemplos — riesgo de que se perciba como "inconsistente" (el mismo tipo de outfit puntuado distinto que hace un mes). Se puede suavizar con un aviso discreto tipo "seguimos mejorando el modelo".
- Sin tiempo de caída ni cambios que rompan la API pública.
- **Hay que actualizar la Política de Privacidad antes de activar esto en producción** — ver [12-legal-and-privacy.md](../12-legal-and-privacy.md), es un freno de proceso, no técnico.

## Open questions

- ¿Vale la pena `pgvector` desde esta fase, o arrancar con parecido por tags (más simple, ya disponible) y migrar solo si no alcanza? Recomendación: arrancar simple.
