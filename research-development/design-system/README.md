# Design system

**En una frase**: el sistema visual real de LookLab — colores, tipografía, componentes y layout — para que cualquier pantalla nueva encaje sin inventar un estilo paralelo.

Documentación del sistema visual de LookLab, extraída de `src/app/styles/`, `src/lib/fonts.ts` y `src/components/ui/`.

- [00-colors.md](./00-colors.md) — paleta y su uso semántico.
- [01-typography-and-iconography.md](./01-typography-and-iconography.md) — fuentes e íconos.
- [02-components-and-patterns.md](./02-components-and-patterns.md) — cómo están armados los componentes de UI y cómo extenderlos sin romper consistencia.
- [03-layout-and-responsiveness.md](./03-layout-and-responsiveness.md) — el canvas mobile-first y las reglas de layout.
- [04-css-structure.md](./04-css-structure.md) — cómo está partido el CSS en `src/app/styles/` y dónde agregar reglas nuevas.

No hay una librería de componentes externa (no shadcn/Radix/MUI). Todo el sistema visual es propio: clases CSS semánticas organizadas en `src/app/styles/` (ver [04-css-structure.md](./04-css-structure.md)) + wrappers de React finitos en `src/components/ui/`.
