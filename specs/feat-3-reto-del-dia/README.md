# Feature 3 — Reto del día

## Contexto y objetivo

Diagnóstico PostHog (30d): retención real 3,7% (vuelven un 2º día). La causa es que
la única razón de volver es tener un outfit nuevo que analizar, y eso pasa cada
tanto. El Reto del día da una razón de volver **sin necesitar un outfit propio**:
un juego diario que además es compartible (feed del ad de curiosidad) y sirve de
mejor aterrizaje para tráfico frío.

## Mecánica

**"¿A cuál le dio mejor score la IA para [ocasión]?"** — 3 looks reales de la
comunidad, de la **misma ocasión**, con separación de score clara. El usuario
adivina a cuál le puso mejor puntaje la IA.

- Reformulación clave: no se pregunta "cuál es mejor" (subjetivo, discutible) sino
  "a cuál le dio mejor score **la IA**" (verificable; el score IA *es* la verdad).
- **Global por día** (modelo Wordle): todos ven el mismo trío → rachas comparables
  y conversación viral ("¿vos lo sacaste?").
- **Racha = días jugados** consecutivos (no aciertos: fallar no rompe la racha). El
  **% de acierto** es la métrica de skill aparte.
- **Invitados juegan** (gancho de adquisición). El intento no se persiste; la racha
  vive en el cliente. El muro salta al querer **guardar la racha** (`GuestAction`
  `streak`).
- **Curación:** trío con gap de score ≥12 (relaja a 8 si no hay); rota ocasión por
  día; no repite looks usados en los últimos 7 retos. Se genera on-demand la primera
  vez que alguien abre el reto en el día (service-role) y queda cacheado.

## Datos (migración `0034_daily_challenges.sql`)

- `daily_challenges`: `challenge_date` (PK), `occasion_id`, `look_ids uuid[3]`
  (orden de muestra barajado), `winner_post_id`. Lectura pública; escritura solo
  service-role.
- `challenge_attempts`: `user_id`, `challenge_date`, `picked_post_id`, `correct`,
  único por `(user, date)`. RLS: propio; sin update (respuesta final).

Los scores NO se guardan: se leen de `community_feed_view` al revelar (público).

## API

- `POST /api/challenge/answer` `{ pickedPostId }` → `{ correct, reveal:{winnerPostId,
  scores, reason}, streak }`. Autenticado persiste el intento (uno por día, no se
  puede cambiar) y devuelve la racha. Invitado revela sin persistir (`streak: null`).

## Superficie

- `/challenge` (server component + `ChallengeGame` cliente). Público (middleware).
- Entrada: `ChallengeCard` en Home (arriba, acento coral).
- `src/lib/challenge/challenge.ts`: generación, intento, racha, revelado.

## Medición (PostHog)

`challenge_viewed` (occasion, replay), `challenge_answered` (correct, streak,
occasion), `challenge_shared` (correct), `guest_wall_hit` con `action=streak`.

Preguntas: ¿el reto mueve la retención D1/D7? ¿el % de invitados que juega y después
convierte al querer guardar la racha? ¿comparte más que el score?

## Pendientes / riesgos conocidos

- **Suministro de contenido:** un reto diario come tríos curados. Casual sostiene el
  arranque; alimentar con `seed:community` y rotar ocasiones. Sin flujo, se seca en
  ~1 semana.
- **Verificación con backend real:** la generación, RLS, persistencia y racha se
  probaron por tipos + demo, no contra una base con datos reales. Validar con
  contenido de comunidad real antes de confiar en la curación.
- **Migración `0034` sin aplicar a prod.**
- Futuro: share-card del reto (hoy comparte texto), leaderboard, notificación diaria.
