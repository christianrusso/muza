-- Muza — Lectura del bucket de ejemplos few-shot (scoring-examples).
-- El bucket es privado y lo crea/puebla el service role (script de import). Sin
-- esta policy, el cliente autenticado de la app no puede firmar URLs de las
-- imágenes de referencia → getFewShotExamples las descarta y el few-shot queda
-- inerte aunque el flag esté prendido. Data curada (no pertenece a un usuario):
-- lectura para cualquier autenticado, igual que la tabla public.scoring_examples.
-- La escritura sigue siendo solo del service role (sin policy de insert/update).

create policy "scoring_examples_bucket_read" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'scoring-examples');
