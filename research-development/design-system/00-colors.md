# Colors

Fuente única de verdad: variables CSS en `src/app/styles/tokens.css` (`:root`), expuestas a Tailwind vía `@theme inline` como `--color-*`. En componentes se usan como clases Tailwind (`bg-coral`, `text-ink`, etc.) o directo como `var(--coral)` en CSS.

## Paleta base

| Token | Valor | Uso |
|---|---|---|
| `--coral` | `#ec5a2e` | Color de marca / acción primaria (botones primarios, tab activo, FAB, selección de ocasión) |
| `--coral-soft` | `#fceee8` | Fondo suave para estados seleccionados/destacados en coral |
| `--ink` | `#1a1712` | Texto principal |
| `--ink-deep` | `#141210` | Texto de mayor contraste (ej. la "M" del isotipo) |
| `--paper` | `#f7f5f0` | Fondo general de la app (`body`) |
| `--card` | `#ffffff` | Fondo de tarjetas |
| `--line` | `#ede9df` | Bordes suaves (separadores de lista) |
| `--line-strong` | `#e7e3d9` | Bordes de inputs, botones outline, chips |
| `--muted` | `#6b655a` | Texto secundario |
| `--faint` | `#9a9488` | Texto terciario / deshabilitado / labels de tabs inactivos |

## Colores semánticos de estado

| Token | Valor | Uso |
|---|---|---|
| `--green` | `#2fa36b` | Éxito, score alto, badge "superior" |
| `--green-soft` | `#e1f1ec` | Fondo de banner de éxito / badge superior |
| `--amber` | `#f5a524` | Score medio |
| `--amber-ink` | `#b67816` | Texto sobre fondo amber (mejor contraste que `--amber` puro), badge "inferior" |
| `--amber-soft` | `#fbf0df` | Fondo badge inferior |
| `--red` | `#e5484d` | Error, score bajo |
| `--red-soft` | `#fbe7e8` | Fondo banner de error |

Mapeo de score a color, vía `--color-score-high/medium/low` (ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#bandas-de-score) para los umbrales 75/60):
- `>=75` → `--green`
- `60-74` → `--amber`
- `<60` → `--red`

## Colores por tipo de análisis (tags/badges)

| Tipo de análisis | Token color | Token fondo |
|---|---|---|
| `completo` | `--violet` (`#5b4fd6`) | `--violet-soft` (`#eceafb`) |
| `superior` | `--green` | `--green-soft` |
| `inferior` | `--amber-ink` | `--amber-soft` |
| `individual` | `--pink` (`#c24c63`) | `--pink-soft` (`#fbe9ec`) |

Estos 4 pares (`--color-tag-<tipo>` / `--color-tag-<tipo>-soft`) son los únicos colores usados para diferenciar `analysisType` en toda la UI (badges de historial, comunidad, etc.). Si se agrega un nuevo `analysisType`, hay que sumarle su propio par color/soft acá, no reusar uno existente.

## Buenas prácticas de color

- No hardcodear valores hex en componentes — siempre referenciar el token semántico (`bg-coral`, `text-muted`, `var(--green)`, etc.). Si hace falta un color que no existe, se agrega como variable nueva en `:root` + su alias en `@theme inline`, no como hex suelto en un archivo `.tsx`.
- Los pares `*-soft` existen para fondos con texto del color base encima (ej. `color: var(--green); background: var(--green-soft)`) — mantiene contraste legible sin usar el color saturado como fondo grande.
- `--coral` es el único color de acción/marca — no introducir un segundo color "primario" compitiendo (ej. no usar `--violet` como CTA solo porque combina).
- Los botones deshabilitados no usan una versión "apagada" de `--coral`: usan grises dedicados (`#e3ded3` fondo, `#b4ae9f` texto) definidos inline en `.btn-primary:disabled` — mantener ese patrón para evitar que un coral desaturado se lea como error/warning.
