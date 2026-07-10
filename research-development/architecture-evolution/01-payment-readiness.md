# Estar listos para cobrar, sin cobrar todavía

## Lo que ya existe

`08-open-decisions.md` ya documenta el estado real: `PLAN_LIMITS.free`/`.pro` están sin límite (`monthlyAnalyses: null`, `historyWindowDays: null`) desde julio de 2026, con constantes ya definidas pero sin usar (`FREE_MONTHLY_ANALYSES_LIMIT`, `FREE_HISTORY_WINDOW_DAYS`), y un placeholder de precio (`PRO_MONTHLY_PRICE_USD_PLACEHOLDER = 0`). No hay ningún proveedor de pagos integrado (ver [08-open-decisions.md](../general-app-research/08-open-decisions.md#pricing--monetización)).

Lo importante: la tabla `plan_usage` y la función `increment_analysis_usage()` **ya existen y ya cuentan uso real**, aunque hoy no se use ese conteo para bloquear nada. Es decir, la parte más difícil de medir (cuánto usa cada usuario) ya está resuelta.

## Qué falta para poder activar un plan pago, en orden

1. **Elegir proveedor de pagos.** Dado que la app está en español-Argentina (`locale es_AR`) pero puede tener usuarios fuera (ver el propio ejemplo de [12-legal-and-privacy.md](../adaptive-scoring/12-legal-and-privacy.md#jurisdicción-qué-ley-aplica-dónde), "alguien en Beijing"), conviene un proveedor que soporte pagos internacionales sin fricción extra — no es una decisión técnica de este documento, pero sí condiciona el resto.
2. **Activar los límites que ya existen en código** — volver a usar `FREE_MONTHLY_ANALYSES_LIMIT`/`FREE_HISTORY_WINDOW_DAYS` en vez de `null`. Esto se puede hacer y probar **antes** de tener un proveedor de pagos real — simplemente hace que el plan free tenga un límite, sin todavía ofrecer upgrade. Es la forma más barata de probar el gating sin haber integrado nada de cobros.
3. **Webhook de pago → actualizar `plan_tier`** — cuando haya proveedor, un endpoint que reciba la confirmación de pago y actualice `profiles.plan_tier` (`free`/`pro`). Reusa el campo que ya existe hoy.
4. **Manejo de casos borde de facturación** — pago rechazado, cancelación, período de gracia. No hay nada de esto diseñado todavía, y depende del proveedor elegido (paso 1) — no se puede avanzar en detalle sin esa decisión primero.

## Cómo se conecta con adaptive-scoring

- El [reto diario](../adaptive-scoring/08-daily-challenge.md) ya definió que tiene que quedar disponible para todos los planes, con el plan pago dando beneficios extra (no acceso exclusivo) — ver la sección de monetización de ese documento. Esto es importante para no repetir acá una decisión que ya se tomó ahí.
- Si algún día se activa un plan pago con límite de análisis mensuales, el reto diario **no debería consumir ese límite** — es una interacción distinta a "crear un análisis nuevo", y consumirlo generaría el incentivo perverso de que la gente evite participar del reto para no gastar sus análisis del mes.

## Qué NO hacer todavía

- No integrar un proveedor de pagos real antes de decidir el precio y el mercado principal (paso 1) — sería construir sobre una decisión de negocio que todavía no está tomada.
- No complicar el modelo de datos de `plan_usage` para anticipar features de facturación que no están definidas (descuentos, planes anuales, etc.) — se agregan cuando haya una decisión de producto concreta que lo pida, no antes.

## Open questions

- ¿Cuál es el mercado principal a priorizar para elegir proveedor de pagos (Argentina, LatAm, o algo más global)? Depende de dónde estén los usuarios reales — mismo dato pendiente que ya aparece en [12-legal-and-privacy.md](../adaptive-scoring/12-legal-and-privacy.md).
- ¿El precio placeholder (`PRO_MONTHLY_PRICE_USD_PLACEHOLDER = 0`) tiene algún número real en mente, aunque no esté en el código todavía? Es una decisión de negocio fuera del alcance de este documento.
