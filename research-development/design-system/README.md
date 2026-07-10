# Design system

Documentación del sistema visual de LookLab, extraída de `src/app/globals.css`, `src/lib/fonts.ts` y `src/components/ui/`.

- [colors.md](./colors.md) — paleta y su uso semántico.
- [typography-and-iconography.md](./typography-and-iconography.md) — fuentes e íconos.
- [components-and-patterns.md](./components-and-patterns.md) — cómo están armados los componentes de UI y cómo extenderlos sin romper consistencia.
- [layout-and-responsiveness.md](./layout-and-responsiveness.md) — el canvas mobile-first y las reglas de layout.

No hay una librería de componentes externa (no shadcn/Radix/MUI). Todo el sistema visual es propio: clases CSS semánticas en `globals.css` + wrappers de React finitos en `src/components/ui/`.
