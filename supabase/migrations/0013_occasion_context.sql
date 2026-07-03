-- Muza — Contexto libre opcional de la ocasión. El usuario puede sumar detalle
-- en texto ("cumpleaños infantil", "asado con amigos", "boda en la playa") que
-- se inyecta en el prompt de scoring. Es la vía escalable de darle más contexto
-- a la IA sin multiplicar chips, y le da sentido a la ocasión "Otro". Nullable y
-- retrocompatible. No toca el banco de few-shot (indexado por occasion_id).

alter table public.analyses
  add column occasion_context text;
