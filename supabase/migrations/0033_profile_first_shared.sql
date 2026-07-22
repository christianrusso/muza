-- ============================================================================
-- Flag de "ya compartió": desbloqueo de colorimetría por share
-- ============================================================================
-- La colorimetría dejó de pedir posts + comentarios y ahora pide COMPARTIR un
-- look (además de votar). Compartir un score externo (WhatsApp/IG) no es
-- verificable en el server, así que esto es un gate BLANDO: cuando el usuario
-- toca "compartir" en el resultado, el cliente llama a POST /api/me/shared y
-- marcamos la primera vez acá. Guardamos el timestamp (no un booleano) para poder
-- medir en analítica cuánto tarda del alta al primer share.
-- ============================================================================

alter table public.profiles
  add column if not exists first_shared_at timestamptz;

comment on column public.profiles.first_shared_at is
  'Primera vez que el usuario compartió un look (gate blando de colorimetría). NULL = nunca compartió.';
