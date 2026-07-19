-- Muza — género del usuario para personalizar el scoring
--
-- El scoring hoy infiere el género desde la foto (falla en looks andróginos y no
-- respeta la identidad/preferencia). Declararlo mejora fit/proporciones/modernidad
-- y las recomendaciones. Se inyecta al prompt como CÓDIGO DE MODA, no como juicio
-- del cuerpo (ver src/lib/ai/prompts/scoring.prompt.ts).
--
-- Nullable a propósito: null = usuario que todavía no pasó el onboarding. El gate
-- del middleware (apoyado en user_metadata.onboarded del JWT) fuerza el onboarding
-- obligatorio; no hacemos backfill para no inventar un género.
alter table public.profiles
  add column if not exists gender text check (gender in ('masculino', 'femenino', 'no_especifica'));
