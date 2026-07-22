# Mapa de features y documentación

## Producto actual

| Área | Estado | Código principal | Documentación |
|---|---|---|---|
| Landing y adquisición | Implementado | `src/app/page.tsx`, analytics | `04-marketing-and-growth.md`, briefs |
| Auth email/Google | Implementado | `src/app/(auth)`, `src/app/auth/callback` | `03-product-and-business.md` |
| Onboarding de género | Implementado | `src/app/onboarding` | `02-domain-and-data.md` |
| Análisis de outfit | Implementado | `src/app/(app)/analysis`, `src/lib/ai` | `03-product-and-business.md` |
| Historial | Implementado | `src/app/(app)/(tabs)/history` | `03-product-and-business.md` |
| Comunidad | Implementado | `src/app/(app)/community`, `src/lib/community` | `02-domain-and-data.md` |
| Actividad | Implementado | `src/app/(app)/community/activity` | `02-domain-and-data.md` |
| Perfil/configuración | Implementado | `src/app/(app)/profile`, `src/components/profile` | `03-product-and-business.md` |
| Placard (guardarropa) | UI mock, gateado por allowlist (`PLACARD_TESTERS`); resto ve "Próximamente" | `src/app/(app)/(tabs)/placard`, `src/app/(app)/placard`, `src/lib/placard/*` | — |
| Colorimetría | Implementado, gateado por participación (compartir un look + 5 votos) | `src/app/(app)/colorimetry`, `src/lib/colorimetry/*`, `src/app/api/colorimetry` | `02-domain-and-data.md` |
| Modo invitado | Implementado | `src/components/community/GuestGate`, `src/lib/viewer` | `03-product-and-business.md`, marketing |
| Modo demo | Implementado | `src/lib/demo*`, `src/lib/demoStore` | `01-architecture.md` |
| Admin métricas | Implementado | `src/app/admin`, `src/lib/admin/metrics` | `01-architecture.md` |
| Admin usuarios/bloqueo | Implementado | `src/app/admin/users`, `src/lib/admin/users` | `01-architecture.md`, `02-domain-and-data.md` |
| Reportar comentarios | Implementado | `src/app/admin/(dashboard)/comment-reports`, `src/app/api/community/comments` | `specs/feat-1-report-comment/` |
| Monetización Pro | Preparado, inactivo | `src/lib/plans` | `03-product-and-business.md` |

## Specs SDD

- [Feature 1 — Reportar comentarios](../../specs/feat-1-report-comment/README.md)

## Documentos históricos o especializados

- `docs/LookLab-Funcionalidades.md`: visión extensa, mapa de funcionalidades y checklist de testing.
- `marketing/copies-reposicionamiento.md`: reposicionamiento, anuncios, guiones y medición.
- `sprint1-modo-invitado-brief.md`: brief de modo invitado.
- `sprint1-shareable-score-card-brief.md`: brief de share cards.
- `sprint1-posthog-funnel-brief.md`: brief de eventos y embudo PostHog.
- `design/`: PDFs, HTMLs, imágenes y guidelines visuales.

Cuando una feature histórica y el código difieran, el código es el estado actual y el documento debe marcarse como desactualizado o corregirse.
