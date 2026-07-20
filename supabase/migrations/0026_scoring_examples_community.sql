-- ============================================================================
-- scoring_examples aprende del consenso de la comunidad (few-shot auto-curado)
-- ============================================================================
-- Hasta ahora los ejemplos few-shot eran 100% curados a mano (verdict good/bad
-- por ocasión; ver 0009). No escala: depende de una persona etiquetando.
--
-- La comunidad ya puntúa outfits a ciegas en el VoteDeck (post_votes, en los 4
-- niveles de SCORE_LEVELS). Medido sobre 541 posts, ese consenso está ~16 puntos
-- POR DEBAJO del score de la IA, de forma sistemática y pareja entre ocasiones:
-- la IA es demasiado generosa. Estos ejemplos le muestran al modelo outfits reales
-- con el nivel que les puso la comunidad, para bajar su escala hacia ese consenso.
--
-- Estas columnas conviven con las manuales: una fila 'manual' las deja en null y
-- se comporta igual que siempre.
-- ============================================================================

begin;

alter table public.scoring_examples
  -- Origen del ejemplo. 'manual' = curado a mano (comportamiento previo).
  -- 'community' = auto-curado desde el consenso de votos.
  add column source text not null default 'manual'
    check (source in ('manual', 'community')),

  -- Nivel de consenso de la comunidad (solo filas 'community'). Es la señal que
  -- se le muestra al modelo: "este outfit la gente lo puntuó 'bien', no 'impecable'".
  add column community_level text
    check (community_level in ('mejorar', 'bien', 'muy_bueno', 'impecable')),

  -- Score numérico del consenso (communityScore) y cuántos votos lo respaldan.
  -- vote_count sirve para priorizar los ejemplos con más respaldo al seleccionar.
  add column community_score int,
  add column vote_count int,

  -- Procedencia. El análisis y el usuario de origen: permiten (1) no curar dos
  -- veces el mismo outfit, y (2) purgar el ejemplo si el usuario borra su cuenta.
  -- ON DELETE CASCADE: si se borra el análisis (o el usuario, que cascadea a sus
  -- análisis), la fila del ejemplo se va sola. La FOTO copiada al bucket
  -- scoring-examples NO la cubre el cascade: la limpia account/delete a mano
  -- (por eso guardamos source_user_id, para encontrarla sin joins).
  add column source_analysis_id uuid references public.analyses (id) on delete cascade,
  add column source_user_id uuid references public.profiles (id) on delete cascade;

-- Un outfit se cura una sola vez. Idempotencia de la curación: correrla de nuevo
-- saltea lo ya cargado en vez de duplicar.
create unique index scoring_examples_source_analysis_uidx
  on public.scoring_examples (source_analysis_id)
  where source = 'community';

-- Búsqueda de la limpieza en account/delete: ejemplos curados de un usuario.
create index scoring_examples_source_user_idx
  on public.scoring_examples (source_user_id)
  where source = 'community';

commit;

-- Nota: las filas 'community' igual llevan verdict (not null en 0009). Se deriva
-- del nivel (impecable/muy_bueno → 'good', bien/mejorar → 'bad') solo para que el
-- balanceador existente de getFewShotExamples siga funcionando; lo que se le
-- muestra al modelo es community_level, no ese verdict.
