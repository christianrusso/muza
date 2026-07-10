# Spec-Driven Development (SDD)

Este proyecto adopta un flujo donde **toda feature no trivial arranca con una spec escrita, no con código**. El objetivo es pensar el problema (alcance, datos, flujos, casos borde) antes de comprometerse a una implementación, y dejar un registro de por qué se tomó cada decisión — algo que hoy el repo no tiene (ver [risks.md](../general-app-research/risks.md), no hay documentación de por qué existen ciertos placeholders/decisiones).

## Dónde viven las specs

`specs/` en la raíz del repo, un archivo por feature: `specs/<feature-slug>.md`. Ver [specs/README.md](../../specs/README.md) y la plantilla en [specs/TEMPLATE.md](../../specs/TEMPLATE.md).

Separado de `research-development/`: `research-development/` documenta el estado y los criterios del proyecto (arquitectura, diseño, lineamientos — conocimiento de referencia). `specs/` documenta features puntuales en curso o ya implementadas — conocimiento atado a un cambio concreto.

## Cuándo escribir una spec

Sí:
- Feature nueva visible para el usuario (pantalla, flujo, endpoint nuevo).
- Cambio de modelo de datos (tabla nueva, columna nueva, cambio de RLS).
- Cambio en el motor de scoring o en las reglas de gating de planes.
- Cualquier cosa que toque autenticación (usuarios o admin).

No hace falta:
- Fixes de bugs acotados a un archivo.
- Refactors que no cambian comportamiento.
- Cambios de estilo/copy sin impacto de lógica.

Ante la duda, mejor una spec corta que ninguna.

## Qué lleva una spec (ver plantilla completa en `specs/TEMPLATE.md`)

1. **Goal** — qué problema resuelve, en una o dos oraciones.
2. **Context** — por qué ahora, qué la motiva.
3. **Scope** — qué entra y qué explícitamente no entra en esta iteración.
4. **Data model** — tablas/columnas nuevas o modificadas, políticas RLS necesarias.
5. **Flows** — el paso a paso del usuario (o del sistema, si es server-to-server).
6. **Edge cases** — qué pasa en los casos raros (sin conexión, datos parciales, límites de plan, etc.).
7. **Open questions** — lo que todavía no está decidido, explícito en vez de asumido.

## Proceso

1. Se escribe la spec en `specs/<feature-slug>.md` antes de tocar código.
2. Se discute/ajusta la spec (con el equipo o async) hasta que el alcance esté claro.
3. Se implementa siguiendo la spec. Si algo cambia de alcance durante la implementación, **se actualiza la spec en el mismo cambio** — no queda desactualizada.
4. Al mergear, la spec queda como referencia de por qué la feature es como es (útil para debugging futuro y para onboarding).

## Relación con el resto de la documentación

Si una spec introduce un patrón nuevo que debería aplicar a todo el proyecto (no solo a esa feature), ese patrón se termina reflejando en [best-practices.md](./best-practices.md) o en `design-system/` — las specs son el punto de entrada de una decisión, los docs de `research-development/` son donde esa decisión se consolida como criterio general.
