# Components & patterns

## El patrón: clases semánticas en CSS + wrapper de React fino

LookLab no usa Tailwind utility-first puro ni una librería de componentes externa. El patrón real (confirmado en `src/app/globals.css` + `src/components/ui/Button.tsx`) es:

1. Se define una clase semántica en `globals.css` (ej. `.btn`, `.btn-primary`, `.card`, `.badge--full`, `.chip`, `.toggle`, `.ring`, `.occ`, `.gcard`, `.rec`, `.banner--success`).
2. El componente de React (`src/components/ui/*.tsx`) es un wrapper delgado que mapea una prop (`variant`, etc.) a esa clase, usando `cn()` (`src/lib/utils.ts`) para permitir overrides puntuales vía `className`.

Ejemplo real (`Button.tsx`): la prop `variant` (`primary | outline | ghost | light | icon`) selecciona entre `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-light`, `.btn-icon` — el componente no tiene lógica de estilos propia, solo selecciona la clase.

**Regla práctica**: si necesitás un botón/card/badge nuevo, primero mirá si ya existe una clase en `globals.css` que lo cubra. Si hace falta una variante nueva, se agrega como clase nueva siguiendo el mismo naming (`.btn-*`, `.badge--*`) en vez de armar el estilo a mano con utilities de Tailwind sueltas en el componente. Esto es lo que mantiene consistencia visual entre pantallas hechas por distintas personas en distintos momentos.

## Inventario de componentes UI (`src/components/ui/`)

- `Button.tsx` — variantes `primary | outline | ghost | light | icon`.
- `Card.tsx` — wrapper de `.card` (fondo blanco, borde `--line`, radio 20px).
- `Input.tsx` — wrapper de `.field`/`.input`, con estados `ok`/`err` vía borde verde/rojo.
- `Toggle.tsx` — switch on/off (`.toggle`, `.toggle.on`), usado en settings de notificaciones.
- `Banner.tsx` — mensajes de éxito/error inline en forms (`.banner--success` / `.banner--error`).
- `Spinner.tsx` — loader circular (`.spinner`, animación `muzaspin` 1s linear infinite).
- `BottomSheet.tsx` — modal deslizable desde abajo (mobile pattern).

Componentes de dominio (fuera de `ui/`, en `src/components/analysis/`, `community/`, `navigation/`, `profile/`, `brand/`, `settings/`) combinan estos primitivos con lógica específica de cada pantalla — no deberían definir estilos propios de botón/card desde cero.

## Otros patrones visuales reutilizables (definidos solo en CSS, sin wrapper de componente propio)

- **`.ring`** — el anillo de score (conic-gradient controlado por variables inline `--c` color y `--p` porcentaje). Es el elemento visual central de la pantalla de resultado.
- **`.badge--full/top/bottom/single`** — pills de tipo de análisis, usan los tokens de color de [00-colors.md](./00-colors.md#colores-por-tipo-de-análisis-tagsbadges).
- **`.occ` / `.occ.sel`** — tarjeta de selección de ocasión, con estado seleccionado (borde coral 2px + fondo `--coral-soft` + sombra coral).
- **`.chip` / `.chip.active`** — filtros/selecciones tipo pill (variantes de ocasión).
- **`.gcard` / `.gbadge` / `.gscore`** — tarjeta de grid del historial, con badge de tipo y score superpuestos sobre la foto.
- **`.rec`** — item de recomendación (comentario en el propio CSS: "read-only, no select/simulate" — es decir, deliberadamente no interactivo hoy; si se implementa la feature de Simulación IA, ver [08-open-decisions.md](../general-app-research/08-open-decisions.md#feature-simulación-ia), este patrón probablemente necesite un estado interactivo nuevo).
- **`.feed-tab` / `.react`** — tabs del feed de comunidad y botón de reacción (like/dislike), con estado `.active`/`.on` en coral.

## Micro-interacciones

- Botones: `transform: scale(0.98)` en `:active` — feedback táctil sutil, sin necesidad de JS.
- Transiciones cortas (`0.12s`-`0.2s`) en casi todo — nada de animaciones largas o llamativas, coherente con una app utilitaria de uso frecuente.
- `.fade-enter` (`fadeUp`, 0.32s) para entradas de contenido — el único patrón de animación de entrada, se reutiliza en vez de definir keyframes nuevos por pantalla.

## Qué evitar

- No armar botones/cards con combinaciones de utilities de Tailwind (`rounded-2xl bg-orange-500 ...`) cuando ya existe `.btn-primary`/`.card` — duplica estilos y los desincroniza del resto de la app apenas alguien cambie el token de color en un solo lugar.
- No introducir una segunda fuente de íconos o una librería de componentes externa — rompería la consistencia visual y el peso del bundle sin necesidad, dado que ya hay un sistema propio cubriendo los casos actuales.
- No hardcodear tamaños de radio/sombra/spacing "a ojo" — reusar los valores ya establecidos (`border-radius: 16px` en botones/inputs grandes, `20px` en cards, `18px`/`14px` en variantes chicas) para que los componentes nuevos se sientan parte del mismo sistema.
