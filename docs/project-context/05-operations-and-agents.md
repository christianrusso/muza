# Operación y guía para agentes

## Primeros pasos de un agente

Antes de modificar código:

1. Leer `AGENTS.md`.
2. Leer este directorio completo o al menos `00` a `05`.
3. Leer la spec de la feature solicitada en `specs/`.
4. Consultar la documentación local de Next.js en `node_modules/next/dist/docs/`.
5. Inspeccionar sólo los archivos directamente relacionados para confirmar el estado real.
6. Revisar `git status` y preservar cambios existentes.

La documentación de contexto reduce exploración repetitiva, pero no reemplaza verificar los archivos que se van a modificar.

## Comandos

```bash
npm run dev              # desarrollo con backend configurado
npm run dev:demo         # desarrollo sin Supabase, puerto 3007
npm run build            # build de producción
npm run start            # ejecutar build
npm run lint             # ESLint
npm test                 # tests Node con tsx
```

Scripts operativos:

```bash
npm run eval:ai
npm run eval:serve
npm run eval:import
npm run seed:community
npm run seed:migrate
npm run posthog:dashboard
```

Scripts sin alias npm en `package.json` (ejecutar sólo cuando corresponda y revisando sus variables):

```bash
node scripts/seed-photos.mjs
tsx scripts/seed-respread-dates.ts
```

No ejecutar seeds ni migraciones destructivas contra producción sin confirmación explícita y sin revisar el script.

## Variables de entorno

### Necesarias para backend real

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

### URL y despliegue

- `NEXT_PUBLIC_SITE_URL`
- `VERCEL_ENV`
- `VERCEL_URL`

### Analytics y marketing

- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_META_PIXEL_ID`
- `META_CONVERSIONS_API_ACCESS_TOKEN`
- `NEXT_PUBLIC_TIKTOK_PIXEL_ID`
- `TIKTOK_EVENTS_API_ACCESS_TOKEN`

### IA, scoring y costos

- `OPENAI_VISION_MODEL`
- `AI_DAILY_BUDGET_USD`
- `AI_MONTHLY_BUDGET_USD`
- `AI_PRICE_INPUT_PER_1M`
- `AI_PRICE_OUTPUT_PER_1M`
- `SCORING_FEWSHOT_ENABLED`
- `SCORING_FEWSHOT_MAX`
- `SCORING_EXAMPLES_BUCKET`

### Rate limit y performance

- `RATE_LIMIT_ANALYSES_PER_MINUTE`
- `RATE_LIMIT_ANALYSES_PER_HOUR`
- `PERF_LOG`

Nunca documentar valores secretos reales. `.env.local` es sólo local y no debe entrar en commits.

## Flujo de cambios de base de datos

1. Crear una migración numerada nueva en `supabase/migrations/`.
2. Habilitar RLS y definir policies.
3. Agregar o actualizar tipos en `src/types/database.ts`.
4. Actualizar helpers de acceso y views/RPCs dependientes.
5. Actualizar este contexto y la spec de feature.
6. Probar con Supabase local o el entorno indicado.
7. Ejecutar tests, lint y build.

Nunca editar una migración histórica ya aplicada para “arreglarla”. Crear la siguiente migración.

## Convenciones de implementación

- Route handlers validan entrada con Zod.
- `params` de Next 16 se esperan como `Promise`.
- Server Components leen datos; Client Components manejan interacción y estado local.
- La lógica de dominio reutilizable va en `src/lib`, no duplicada en páginas.
- Los componentes reutilizables van en `src/components`.
- Las escrituras de usuario respetan RLS.
- Las operaciones admin usan la cookie propia y service-role sólo en servidor.
- Mantener el copy en español argentino.
- No introducir una dependencia si el stack existente resuelve el problema.
- Usar `apply_patch` para cambios de archivos.

## Verificación de una feature

Una feature no está terminada sólo porque compila. Verificar:

- happy path;
- autenticación y permisos;
- demo si la superficie existente lo soporta;
- errores de red y estados vacíos;
- datos y RLS;
- mobile y desktop encuadrado;
- analytics si es un flujo de adquisición/activación;
- privacidad y borrado;
- tests, lint y build;
- actualización de documentación.

## Checklist de documentación viva

Actualizar en la misma tarea:

- `01-architecture.md` si cambia una ruta, módulo, integración, cliente o flujo técnico;
- `02-domain-and-data.md` si cambia esquema, RLS, Storage, privacidad o lifecycle;
- `03-product-and-business.md` si cambia una capacidad, plan, público, promesa o regla ética;
- `04-marketing-and-growth.md` si cambia copy, canal, campaña, CTA, evento o atribución;
- `06-feature-map.md` si se agrega o completa una feature;
- la spec de la feature si cambia su contrato o acceptance criteria;
- este archivo si cambia tooling, comandos o proceso.

Si el código contradice la documentación, primero documentar el estado real y luego decidir si corresponde corregir código o documentación.
