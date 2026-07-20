# Marketing, marca y crecimiento

## Posicionamiento vigente

El reposicionamiento de julio de 2026 cambia el eje de “te ponemos un número” a:

> Pedí una opinión sobre cómo estás vestido, gratis.

El score sigue existiendo, pero funciona como mecanismo de la opinión; no es la promesa emocional principal.

## Promesas verificadas

Se puede comunicar:

- análisis con IA según la ocasión;
- qué funciona y qué mejorar;
- 4–6 recomendaciones concretas;
- evaluación de color, calce, ocasión y coherencia;
- nunca evaluación del cuerpo;
- comunidad con publicar, votar, comentar y seguir;
- juego de adivinar el score;
- acceso gratis y visualización sin cuenta.

No comunicar como funcionalidad actual:

- colorimetría avanzada;
- aprendizaje formal de moda;
- tendencias como producto;
- simulación IA si no está activada;
- monetización Pro si sigue desactivada.

## Ángulos de adquisición

Los briefs proponen correr hipótesis en paralelo:

1. **Duda:** “Te cambiaste tres veces y seguís sin saber”.
2. **Ocasión:** el mismo outfit puede recibir evaluaciones distintas según adónde vas.
3. **Comunidad:** adivinar el score y comparar con la IA.
4. **Sin fricción:** mirar la comunidad sin crear cuenta.

El ángulo de comunidad sirve principalmente para retención y contenido compartible; el de duda es la hipótesis fuerte para adquisición.

## Tono y visual

- español argentino, directo y conversacional;
- honesto, cálido, editorial y no corporativo;
- coral `#ec5a2e`, tinta `#141210`, papel `#f7f5f0`;
- Instrument Serif para titulares y Manrope para texto;
- mostrar recomendaciones y desglose, no sólo el número;
- evitar claims que puedan considerarse publicidad engañosa.

## Canales y piezas

- Ads de Meta y TikTok.
- Reels/TikToks verticales 9:16 de 12–20 segundos.
- Capturas reales de la app para mostrar resultado, recomendaciones y juego.
- Guiones documentados en `marketing/copies-reposicionamiento.md`.
- Assets gráficos y audiovisuales en `assets/`, `design/` y `public/`.

El guion “Adiviná” es especialmente barato de producir porque puede construirse con capturas de la app y un look de comunidad.

## Atribución y eventos

PostHog es el sistema principal para comportamiento y embudo. Eventos centrales definidos en `src/lib/analytics.ts`:

- `signed_up`
- `logged_in`
- `onboarding_completed`
- `guest_wall_hit`
- `guest_converted`
- `occasion_selected`
- `photo`
- `validation`
- `score_viewed`
- `shared`
- `published`
- `voted`
- `followed`

Reglas:

- tracking siempre dentro de `try/catch`;
- el fallo de analytics no rompe la UI;
- usar propiedades legibles;
- `utm_content` distingue ángulos: `ang_duda`, `ang_ocasion`, `ang_comunidad`, `ang_sinfriccion`;
- no usar IDs opacos como nombres de ángulo;
- la conversión guest se atribuye con `sessionStorage` y se cose a la identidad Supabase en PostHog.

Meta Pixel y TikTok Pixel se cargan sólo si hay IDs configurados. Las APIs server-side de conversiones requieren tokens adicionales y son opcionales.

## Dominio y metadata

La metadata de producción usa `looklab.io`, `es_AR`, Open Graph y Twitter cards. `NEXT_PUBLIC_SITE_URL` puede sobreescribir la URL; Vercel preview se usa fuera de producción.

Si se cambia dominio, nombre, claim, evento o CTA, actualizar código, este documento, briefs y pruebas de landing/analytics.
