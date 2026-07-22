# Runbook — Email digest de actividad

Cómo se envía el digest de actividad (retención) y cómo operarlo. Para el diseño
del feature ver también `docs/project-context/03-product-and-business.md` y las
migraciones `supabase/migrations/0027`–`0030`.

## Qué es

Email periódico que le avisa al usuario la actividad nueva (votos, likes,
comentarios, follows) sobre el look propio con **más** movimiento, para traerlo de
vuelta a la app. Cadencia efectiva: **como mucho cada ~2 días por usuario**, y solo
si tuvo actividad nueva.

## Cómo se dispara (automático)

El envío lo agenda **GitHub Actions**, NO el cron de Vercel.

- Workflow: `.github/workflows/activity-digest.yml` (vive en `main`).
- Horario: `0 13 * * *` y `0 20 * * *` **UTC** → 10:00 y 17:00 AR.
- Cada corrida hace `GET https://looklab.io/api/cron/activity-digest` con el header
  `Authorization: Bearer <CRON_SECRET>`.
- El endpoint ([src/app/api/cron/activity-digest/route.ts](../../../src/app/api/cron/activity-digest/route.ts))
  arma y manda los mails por SendGrid; devuelve `{ok, candidates, inSlot, sent, failed}`.

### Por qué GitHub Actions y no el cron de Vercel

En el plan **Hobby**, el cron de Vercel corre como mucho una vez por día a una hora
impredecible y sin garantías — nunca disparaba el digest de forma confiable. El
`vercel.json` conserva sus dos entradas de cron pero son inofensivas: si llegaran a
correr, el gate de 44h (abajo) evita envíos duplicados. Si en el futuro se pasa a
Vercel Pro, se puede volver al cron nativo y quitar el workflow.

## Quién recibe (lógica del gate)

La RPC `activity_digest_pending()` (última versión: migración
`0030_activity_digest_every_2_days.sql`) devuelve un usuario solo si se cumple TODO:

- `notifications_enabled = true` (opt-in) y `blocked_at is null`;
- `is_seed = false` (las cuentas semilla **nunca** reciben);
- tiene email en `auth.users`;
- `last_activity_email_at < now() - interval '44 hours'` (gate de cadencia);
- tiene actividad **nueva** desde `last_activity_email_at` sobre sus posts.

Cada envío exitoso avanza `last_activity_email_at` a `now()` (solo ante un 2xx de
SendGrid; los fallos NO avanzan la marca, así la actividad no se pierde). Por eso el
mismo mail **no sale dos veces**: tras enviarlo, el usuario queda gateado 44h.

> Nota: `profiles.last_activity_email_at` tiene `default now()`, así que un usuario
> recién registrado arranca con la marca en su fecha de alta (no es un envío).

## Envío manual (probar o forzar)

Desde **GitHub → Actions → "Activity digest email" → Run workflow**:

- `all = false` → respeta la franja horaria (como el cron normal).
- `all = true` → procesa **todos** los candidatos sin filtrar por franja (útil para
  un envío inmediato). Igual respeta el gate de 44h.

El log del step "Trigger digest endpoint" muestra el HTTP y el JSON de respuesta.
`HTTP 200` con `sent:N` = ok. `HTTP 401` = el `CRON_SECRET` de GitHub y el de Vercel
no coinciden.

Equivalente por `curl` (necesitás el valor del secret):

```bash
curl -sS -H "Authorization: Bearer <CRON_SECRET>" \
  "https://looklab.io/api/cron/activity-digest?all=1"
```

## Configuración (sin valores secretos)

| Dónde | Nombre | Qué |
|---|---|---|
| Vercel · Env Vars | `CRON_SECRET` | secreto compartido; al cambiarlo **redeployar** |
| Vercel · Env Vars | `SENDGRID_API_KEY`, `EMAIL_FROM` | envío real (sin esto `sendEmail` es no-op) |
| GitHub · Actions Secrets | `CRON_SECRET` | **mismo valor** que en Vercel |
| GitHub · Actions Variables | `DIGEST_BASE_URL` | URL de prod, ej. `https://looklab.io` |

Ambos `CRON_SECRET` (Vercel y GitHub) deben ser **idénticos** o el endpoint devuelve 401.

## Troubleshooting

- **No llega ningún mail y el run da `sent:0`:** normal si nadie tiene actividad
  nueva o todos están dentro del gate de 44h. Verificable con `activity_digest_pending()`.
- **`HTTP 401`:** desincronía de `CRON_SECRET` entre GitHub y Vercel (o falta el
  redeploy tras cambiarlo en Vercel).
- **`HTTP 503` "config faltante":** falta `SENDGRID_API_KEY` o `EMAIL_FROM` en Vercel.
- **No corre el workflow programado:** GitHub pausa los cron de un repo tras 60 días
  sin commits; reactivar desde la pestaña Actions. También puede demorarse unos
  minutos respecto de la hora exacta bajo carga de GitHub.
- **Pushear el workflow falla** con "refusing to allow a Personal Access Token to
  create or update workflow ... without `workflow` scope": el PAT necesita el scope
  `workflow`, o crear/editar el archivo por la web de GitHub.
