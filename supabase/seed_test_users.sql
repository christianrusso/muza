-- ============================================================================
-- Muza — Seed de usuarios de prueba
-- ============================================================================
-- Correr en el SQL Editor de Supabase (o `supabase db execute`).
--
-- Crea usuarios reales (auth.users + identities) que pueden loguearse, cada uno
-- con historial de looks (analyses + categorías + feedback) y publicaciones en
-- la comunidad (posts + reacciones + comentarios + follows).
--
-- Login de todos los usuarios de prueba:
--   email:    <nombre>@muza.test   (ver lista abajo)
--   password: Muza1234!
--
-- Es IDEMPOTENTE: al inicio borra los usuarios previos con dominio @muza.test
-- (el borrado cascada limpia profiles/analyses/community), así que se puede
-- re-correr todas las veces que quieras.
--
-- NOTA sobre las fotos de outfits: las `analyses.photo_path` apuntan al bucket
-- privado `outfit-photos`, que este script NO puede poblar (SQL no sube binarios
-- al storage). Las imágenes de los looks se verán rotas/placeholder hasta que se
-- suban archivos reales. Los AVATARES sí se ven, porque usan URLs públicas.
-- ============================================================================

do $$
declare
  seed_password text := 'Muza1234!';

  -- 8 usuarios de prueba (email = <handle>@muza.test)
  handles  text[] := array['sofia','mateo','valentina','lucas','martina','benjamin','camila','tomas'];
  names    text[] := array[
    'Sofía Martínez','Mateo González','Valentina Rojas','Lucas Fernández',
    'Martina López','Benjamín Díaz','Camila Torres','Tomás Herrera'
  ];
  plans    text[] := array['pro','free','free','pro','free','pro','free','free'];

  occasions_pool text[] := array['casual','work','gym','party','wedding','date','interview','travel'];
  badges_pool    text[] := array['Excelente','Muy bueno','Bueno','A mejorar'];
  types_pool     text[] := array['completo','superior','inferior','individual'];

  descriptors_pool text[] := array['moderno','urbano','clásico','minimalista','elegante','relajado','audaz','sofisticado'];
  superiores_pool  text[] := array['Camisa de lino','Remera básica','Buzo oversize','Blazer','Camisa oxford','Sweater de lana'];
  inferiores_pool  text[] := array['Jean recto','Pantalón chino','Jogger','Falda midi','Bermuda','Pantalón sastrero'];
  calzado_pool     text[] := array['Zapatillas blancas','Botas de cuero','Mocasines','Zapatillas urbanas','Zapatos de vestir'];
  accesorios_pool  text[] := array['Reloj plateado','Gorra','Cinturón de cuero','Anteojos de sol','Mochila','Bufanda'];
  colores_pool     text[] := array['Negro','Blanco','Azul marino','Beige','Gris','Verde oliva','Camel'];
  estilos_pool     text[] := array['Smart casual','Streetwear','Formal','Sport','Minimal chic'];

  cat_keys    text[] := array['ocasion','fit','colores','coherencia','calzado','proporciones','accesorios','estado_prendas','modernidad','originalidad'];
  cat_weights numeric[] := array[0.15,0.15,0.12,0.12,0.10,0.10,0.06,0.08,0.06,0.06];
  cat_labels  text[] := array[
    'Buena adecuación a la ocasión','El calce favorece la silueta','Paleta de colores equilibrada',
    'Las prendas combinan entre sí','Calzado acorde al conjunto','Proporciones bien logradas',
    'Accesorios que suman sin recargar','Prendas en buen estado','Look actual y vigente','Toque personal y original'
  ];

  fortalezas_pool  text[] := array['Excelente combinación de colores.','El calce resalta muy bien tu silueta.','Los accesorios acompañan sin recargar.','Look coherente con la ocasión.'];
  mejoras_pool     text[] := array['Podés ajustar el largo del pantalón.','El calzado podría ser más acorde.','Sumá una prenda que aporte contraste.','Cuidá que los colores no compitan entre sí.'];
  recos_pool       text[] := array['Probá con un cinturón que unifique el look.','Un reloj sobrio elevaría el conjunto.','Animate a una capa extra para dar profundidad.','Elegí un calzado en tono neutro.'];

  captions_pool    text[] := array['Mi look para hoy 🔥','¿Qué les parece?','Probando algo nuevo','Outfit de finde','Listo para la ocasión','Feedback bienvenido 🙌'];
  comments_pool    text[] := array['¡Me encanta! 😍','Buenísimo el conjunto','El calzado la rompe','Le sumaría un accesorio','Muy buen gusto','Copado el estilo 👌'];

  user_ids  uuid[] := '{}';
  uid uuid;
  aid uuid;
  i int; j int; k int;
  n_analyses int;
  score int;
  a_type text;
  o_id text;
  created timestamptz;
begin
  -- ---- Limpieza de seed previo (cascada limpia todo lo dependiente) ----
  delete from auth.users where email like '%@muza.test';

  -- ---- 1) Usuarios (auth) ----
  for i in 1..array_length(handles, 1) loop
    uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      handles[i] || '@muza.test', crypt(seed_password, gen_salt('bf')),
      now(), now() - ((i * 3) || ' days')::interval, now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', names[i]),
      '', '', '', ''
    );

    -- identity (necesaria para el login por email en GoTrue)
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid,
      jsonb_build_object('sub', uid::text, 'email', handles[i] || '@muza.test', 'email_verified', true),
      'email', uid::text,
      now(), now(), now()
    );

    -- el trigger handle_new_user ya creó el profile con full_name;
    -- completamos avatar / plan.
    update public.profiles
    set avatar_url = 'https://i.pravatar.cc/300?u=' || handles[i] || '@muza.test',
        plan_tier = plans[i],
        plan_started_at = case when plans[i] = 'pro' then now() - interval '20 days' else null end,
        created_at = now() - ((i * 3) || ' days')::interval
    where id = uid;

    user_ids := user_ids || uid;
  end loop;

  -- ---- 2) Historial de looks (analyses) + categorías + feedback + comunidad ----
  for i in 1..array_length(user_ids, 1) loop
    uid := user_ids[i];
    n_analyses := 3 + (i % 3);  -- 3..5 looks por usuario

    for j in 1..n_analyses loop
      aid := gen_random_uuid();
      score := 55 + floor(random() * 45)::int;         -- 55..99
      a_type := types_pool[1 + floor(random() * 4)::int];
      o_id := occasions_pool[1 + floor(random() * array_length(occasions_pool,1))::int];
      created := now() - ((i + j) || ' days')::interval - (floor(random()*24) || ' hours')::interval;

      insert into public.analyses (
        id, user_id, occasion_id, photo_path, analysis_type, validity_status,
        overall_score, qualitative_badge,
        style_descriptors, detected_prendas_superiores, detected_prendas_inferiores,
        detected_calzado, detected_accesorios, detected_colores, detected_estilo,
        created_at
      ) values (
        aid, uid, o_id, uid::text || '/' || aid::text || '.jpg', a_type, 'valid',
        score,
        case when score >= 90 then 'Excelente' when score >= 80 then 'Muy bueno'
             when score >= 68 then 'Bueno' else 'A mejorar' end,
        array[
          descriptors_pool[1 + floor(random()*array_length(descriptors_pool,1))::int],
          descriptors_pool[1 + floor(random()*array_length(descriptors_pool,1))::int]
        ],
        array[superiores_pool[1 + floor(random()*array_length(superiores_pool,1))::int]],
        array[inferiores_pool[1 + floor(random()*array_length(inferiores_pool,1))::int]],
        array[calzado_pool[1 + floor(random()*array_length(calzado_pool,1))::int]],
        array[accesorios_pool[1 + floor(random()*array_length(accesorios_pool,1))::int]],
        array[
          colores_pool[1 + floor(random()*array_length(colores_pool,1))::int],
          colores_pool[1 + floor(random()*array_length(colores_pool,1))::int]
        ],
        estilos_pool[1 + floor(random()*array_length(estilos_pool,1))::int],
        created
      );

      -- 10 categorías normalizadas
      for k in 1..10 loop
        insert into public.analysis_categories (analysis_id, category_key, weight, score, justification)
        values (
          aid, cat_keys[k], cat_weights[k],
          greatest(0, least(100, score + floor(random()*20 - 10)::int)),
          cat_labels[k]
        );
      end loop;

      -- feedback: 2 fortalezas / 2 aspectos a mejorar / 2 recomendaciones
      insert into public.analysis_feedback (analysis_id, kind, text, sort_order) values
        (aid, 'fortaleza',       fortalezas_pool[1 + floor(random()*array_length(fortalezas_pool,1))::int], 0),
        (aid, 'fortaleza',       fortalezas_pool[1 + floor(random()*array_length(fortalezas_pool,1))::int], 1),
        (aid, 'aspecto_mejorar', mejoras_pool[1 + floor(random()*array_length(mejoras_pool,1))::int], 0),
        (aid, 'aspecto_mejorar', mejoras_pool[1 + floor(random()*array_length(mejoras_pool,1))::int], 1),
        (aid, 'recomendacion',   recos_pool[1 + floor(random()*array_length(recos_pool,1))::int], 0),
        (aid, 'recomendacion',   recos_pool[1 + floor(random()*array_length(recos_pool,1))::int], 1);

      -- Publicar en comunidad ~1 de cada 2 looks
      if (j % 2 = 0) then
        insert into public.community_posts (user_id, analysis_id, caption, created_at)
        values (uid, aid, captions_pool[1 + floor(random()*array_length(captions_pool,1))::int], created);
      end if;
    end loop;
  end loop;

  -- ---- 3) Reacciones a los posts de comunidad (de otros usuarios) ----
  insert into public.post_reactions (post_id, user_id, reaction)
  select cp.id, x.u, case when random() < 0.82 then 'like' else 'dislike' end
  from public.community_posts cp
  cross join lateral (
    select p.id as u
    from public.profiles p
    where p.id <> cp.user_id and p.id = any(user_ids)
    order by random()
    limit 2 + floor(random() * 4)::int      -- 2..5 reacciones por post
  ) x
  on conflict (post_id, user_id) do nothing;

  -- ---- 4) Comentarios en los posts ----
  insert into public.post_comments (post_id, user_id, body, created_at)
  select cp.id, x.u, comments_pool[1 + floor(random()*array_length(comments_pool,1))::int], cp.created_at + interval '1 hour'
  from public.community_posts cp
  cross join lateral (
    select p.id as u
    from public.profiles p
    where p.id <> cp.user_id and p.id = any(user_ids)
    order by random()
    limit floor(random() * 3)::int          -- 0..2 comentarios por post
  ) x;

  -- ---- 5) Follows entre usuarios ----
  insert into public.follows (follower_id, following_id)
  select f.a, x.b
  from (select unnest(user_ids) as a) f
  cross join lateral (
    select p.id as b
    from public.profiles p
    where p.id <> f.a and p.id = any(user_ids)
    order by random()
    limit 2 + floor(random() * 2)::int      -- sigue a 2..3 usuarios
  ) x
  on conflict do nothing;

  raise notice 'Seed OK: % usuarios @muza.test creados (password: %)', array_length(user_ids,1), seed_password;
end $$;

-- ============================================================================
-- Verificación rápida (opcional)
-- ============================================================================
-- select p.full_name, u.email, p.plan_tier,
--        (select count(*) from public.analyses a where a.user_id = p.id) as looks,
--        (select count(*) from public.community_posts c where c.user_id = p.id) as posts
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where u.email like '%@muza.test'
-- order by u.email;
