# Typography & iconography

> **En resumen**: Manrope para toda la UI funcional, Instrument Serif solo para momentos de marca/editorial. Sin librería de íconos externa — todo pasa por Material Symbols vía nombre de string. No hay una escala tipográfica formal tokenizada todavía (tamaños hardcodeados en px).

## Fuentes

Dos familias, cargadas en `src/lib/fonts.ts` y expuestas como variables CSS (`--font-instrument-serif`, `--font-manrope`) consumidas en `src/app/styles/tokens.css` vía `@theme inline` (`--font-serif`, `--font-sans`):

- **Manrope** — fuente por defecto de toda la UI (`body`, inputs, botones, texto general). Peso 600-800 predomina en textos cortos (labels, botones, badges) — la app tiende a texto bold/semibold, no hay uso visible de weight 400 en UI de interacción.
- **Instrument Serif** — uso puntual, reservado para momentos de marca/editorial: el isotipo (`.mark .hole .m`, itálica) y headings destacados vía clase `.font-serif`. No se usa para texto de UI funcional (botones, forms, listas).

Fallbacks: `-apple-system, BlinkMacSystemFont, sans-serif` para Manrope; `Georgia, serif` para Instrument Serif — pensado para que la app siga siendo legible si las fuentes web tardan en cargar.

`lang="es"` en `<html>`, `locale: "es_AR"` en metadata OpenGraph — la app está en español (Argentina) de punta a punta, no hay i18n.

## Escala tipográfica (tal como aparece en el CSS, no hay una escala formal declarada)

Tamaños en uso, de más chico a más grande: `10px` (labels de tab bar, texto de placeholder de fotos), `11-12px` (badges, chips, meta de listas, section labels), `13-14px` (texto de body, botones de tab de feed), `15-16px` (inputs, botones), `19-26px` (íconos). No hay tokens de tamaño (`--text-sm`, etc.) — los tamaños están inline en cada clase de `src/app/styles/`. Si se agrega una nueva escala, considerar tokenizarla en vez de seguir hardcodeando px sueltos.

`section-label` es el único patrón "tipográfico" reutilizable con nombre: `font-weight:700; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--faint)` — usarlo para encabezados de sección en vez de recrear el estilo.

## Iconografía

**Material Symbols Rounded** (Google Fonts), cargado como fuente de íconos vía `<link>` en `layout.tsx` con configuración fija `opsz,wght,FILL,GRAD@24,400,0,0` — es decir, siempre peso 400, óptico 24, grado 0, sin relleno por default.

- Clase `.msym` aplica la fuente de íconos sobre cualquier elemento (normalmente un `<span>` con el nombre del ícono como texto, patrón estándar de Material Symbols).
- Clase `.msym.filled` activa la variante rellena (`font-variation-settings: "FILL" 1`) — usada para distinguir estado activo/inactivo (ej. un ícono de "like" lleno vs. outline).
- Tamaños de ícono varían por contexto vía `font-size` en la clase contenedora (20px en `.btn-icon`, 22px en `.back`/`.fab`, 26px en `.tab`/`.occ`) — no hay un ícono "de un solo tamaño", el tamaño lo define el rol dentro del layout, no el ícono en sí.

No se usa una librería de íconos SVG (ej. lucide-react, heroicons) — todos los íconos pasan por Material Symbols vía nombre de string. Mantener esa consistencia evita mezclar dos sistemas de íconos con pesos visuales distintos.
