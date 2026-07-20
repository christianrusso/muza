# Resumen y estado actual

## Identidad

- **Nombre del repositorio y paquete:** `muza` / `muza-app`.
- **Nombre de producto visible:** LookLab.
- **Dominio de producción configurado en código:** `https://looklab.io`.
- **Idioma principal:** español rioplatense/Argentina (`es_AR`).
- **Tipo de producto:** aplicación web mobile-first para analizar outfits con IA y compartirlos en una comunidad.

El nombre “Muza” aparece en el repositorio, assets y contexto de desarrollo; “LookLab” es el nombre de producto utilizado en la interfaz, metadata, documentación funcional y marketing. No cambiar ninguno de los dos nombres sin una decisión explícita de marca.

## Qué hace el producto

El usuario elige una ocasión, saca o sube una foto de su outfit y recibe:

- Outfit Score de 0 a 100.
- evaluación por categorías de ropa;
- fortalezas, aspectos a mejorar y recomendaciones accionables;
- historial de análisis;
- posibilidad de publicar un look en la comunidad;
- juego para adivinar el score de otros looks;
- votos, likes, follows y comentarios.

El diferenciador ético y de producto es: **se evalúa la ropa, nunca el cuerpo**. Los prompts de validación y scoring deben conservar esta regla.

## Estado funcional actual

La aplicación ya contiene:

- autenticación por email y Google vía Supabase;
- onboarding de género/preferencia de estilo;
- análisis de outfit con validación y scoring mediante OpenAI;
- almacenamiento privado de fotos y URLs firmadas;
- historial y resultados compartibles;
- comunidad con posts, likes, votos, follows, comentarios y actividad;
- perfiles y configuración;
- modo invitado para ver contenido público y pedir registro al ejecutar acciones;
- modo demo sin credenciales Supabase;
- panel admin separado con métricas, usuarios, detalle de usuario y bloqueo;
- instrumentación de PostHog, Meta Pixel y TikTok Pixel cuando las variables están configuradas.

La Feature 1 de reportar comentarios está documentada en `specs/feat-1-report-comment/`; esas specs describen el estado deseado, no funcionalidad ya implementada.

## Estado comercial actual

El lanzamiento funciona gratis y sin límites efectivos de análisis ni historial. La arquitectura contiene preparación para Free/Pro, pero precios, límites de monetización y simulación avanzada no están activos.

No prometer funcionalidades que no estén verificadas en código. En particular, colorimetría, tendencias y “aprender de moda” aparecen como ideas futuras y no forman parte de la promesa actual.
