# Layout & responsiveness

> **En resumen**: LookLab es mobile-first con un canvas fijo de 430px, sin rediseño de layout para desktop. Cualquier pantalla nueva se diseña para ese ancho, reusando el padding estandarizado (`.pad`/`.pad-tab`) y respetando el orden de z-index de la tab bar (55) y el FAB (56).

## Mobile-first, canvas fijo

La app se diseña para un ancho de contenedor fijo (`max-w-[430px]`, aplicado en `src/app/(auth)/layout.tsx` y `src/app/(app)/layout.tsx`), centrado en pantallas más anchas. No hay un rediseño de layout para desktop/tablet — LookLab hoy es, deliberadamente, una experiencia mobile (o una web-app que simula un mobile canvas en desktop). Cualquier pantalla nueva debe diseñarse pensando en ese ancho, no en breakpoints responsive tradicionales.

## Altura y scroll

- `min-height: 100dvh` (dynamic viewport height) en `.screen-body`, no `100vh` — evita el salto de layout típico de `vh` cuando el navegador mobile muestra/oculta su barra de UI.
- `overscroll-behavior-y: none` y `overscroll-behavior-x: none` en `html, body` — evita el rubber-band de iOS Safari que revela el fondo real de la página detrás de pantallas full-screen oscuras (ej. `/welcome`). Si se agrega una pantalla nueva con fondo oscuro full-screen, tener en cuenta este detalle.

## Padding de pantalla estandarizado

- `.pad` → `padding: 60px 22px 40px` — pantallas normales (60px arriba para dejar lugar a la status bar/header, 22px laterales, 40px abajo).
- `.pad-tab` → `padding: 60px 22px 0` — pantallas dentro de las tabs (sin padding inferior porque termina en la tab bar).

Reusar estas dos clases en vez de definir padding ad hoc por pantalla — mantiene alineados los márgenes laterales (22px) en toda la app.

## Tab bar y elementos flotantes

- `.tabbar` — 86px de alto, fija al fondo (`position: absolute`), fondo semitransparente con `backdrop-filter: blur(12px)`, `z-index: 55`.
- `.fab` (floating action button) — `position: absolute`, `bottom: 100px` (por encima de la tab bar), `z-index: 56`.
- `.bottom-cta` — contenedor sticky para el botón principal de una pantalla (ej. "Confirmar"), con gradiente hacia `--paper` para que el contenido que scrollea por debajo se desvanezca en vez de cortar abrupto.

Al agregar un elemento flotante nuevo, respetar el orden de `z-index` ya establecido (`tabbar: 55` < `fab: 56`) para que no se solapen mal.

## Accesibilidad y buenas prácticas a mantener

- Contraste: los pares de color `*-soft`/base (ver [00-colors.md](./00-colors.md)) existen específicamente para mantener contraste legible en fondos de color — no reemplazar un fondo `-soft` + texto de color por un fondo saturado + texto blanco sin chequear contraste.
- Área táctil: botones principales (`.btn`) son de 54px de alto, iconos (`.btn-icon`, `.back`) 52px/40px — tamaños ya pensados para touch target mínimo cómodo en mobile. No achicar por debajo de eso para elementos interactivos nuevos.
- `-webkit-font-smoothing: antialiased` aplicado globalmente — mantener en cualquier texto custom para que el peso de Manrope/Instrument Serif se vea consistente entre pantallas.
