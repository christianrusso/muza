# Estructura del CSS

Históricamente todo el CSS vivía en un único `src/app/globals.css` gigante. Hoy ese archivo es solo un **manifiesto de imports**: las reglas viven en `src/app/styles/`, un archivo por componente o pantalla.

## Cómo está organizado

`globals.css` importa, en este orden (el orden importa para la cascada):

| Archivo | Cubre |
|---|---|
| `tokens.css` | Variables de color/fuente (`:root`) + el `@theme inline` de Tailwind. **Fuente única de verdad de la paleta.** |
| `base.css` | Reset, tipografía global, helpers `.font-serif`/`.msym`/`.section-label`. |
| `layout.css` | Andamiaje de pantalla (`.screen-body`, `.pad`, `.pad-tab`, `.screen-head`). |
| `buttons.css` | `.btn*`, `.btn-icon`, `.back`. |
| `forms.css` | `.field`, `.input`, `.toggle`, `.banner*`. |
| `cards.css` | `.card`, `.list-card`, `.row*`, `.badge*`, `.chip`. |
| `navigation.css` | `.tabbar`, `.tab*`, `.fab*`, `.bottom-cta`. |
| `placeholder.css` | Texturas de placeholder de fotos (`.ph*`) y el brand mark. |
| `analysis-result.css` | Pantalla de resultado: `.ring`, `.bar`, `.pt`, `.rec`, `.palette-*`. |
| `occasion-grid.css` | `.occ*` (pantalla de nuevo análisis). |
| `history.css` | `.gcard`, `.gbadge`, `.gscore`, `.gmeta`. |
| `community.css` | `.feed-tab`, `.react`. |
| `daily-challenge.css` | Reto diario: sheet, voto, racha, dots. |
| `animations.css` | Primitivas compartidas (`.spinner`, `.fade-enter`) + la regla global de `prefers-reduced-motion`. Va último a propósito. |

## Reglas al agregar CSS

- **No** escribir reglas nuevas en `globals.css` — va al partial que corresponda (o uno nuevo, importado en `globals.css`).
- Los `@import` deben ir todos antes que cualquier otra regla CSS; por eso los tokens también son un import y no van inline en `globals.css`.
- Si una clase sobreescribe a otra (ej. `.ring--pending` sobre `.ring`), su archivo se importa **después** del que define la base. `daily-challenge.css` va después de `analysis-result.css` por esto.
- `animations.css` va último para que la regla de reduced-motion aplique sobre todo lo anterior.

## Por qué así y no CSS Modules

La app usa a propósito clases semánticas globales (`.btn`, `.card`, `.fab`) referenciadas como strings en muchos componentes (ver [02-components-and-patterns.md](./02-components-and-patterns.md)). Migrar a CSS Modules rompería ese sistema. Partir en archivos importados mantiene las clases funcionando idénticas y solo mejora la navegabilidad — el cambio es de organización, no de arquitectura.
