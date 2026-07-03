-- Muza — Sub-contexto opcional de la ocasión (ej. Fiesta de Día vs Noche,
-- Cita Informal vs Formal). Refina el criterio del scoring de la IA. Nullable:
-- los análisis sin variante se puntúan como la ocasión general (comportamiento
-- previo). No toca el banco de few-shot, que sigue indexado por occasion_id.

alter table public.analyses
  add column occasion_variant text;
