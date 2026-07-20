# Modelo de datos y seguridad

## Categorías

Tabla: `comment_report_categories`

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text | único, estable |
| `label` | text | obligatorio |
| `sort_order` | integer | obligatorio |
| `is_active` | boolean | default `true` |

Las categorías iniciales se insertan en la migración. No se eliminan físicamente; se desactivan.

IDs iniciales fijos:

| Slug | ID |
|---|---|
| `harassment_bullying` | `00000000-0000-4000-8000-000000000001` |
| `hate_discrimination` | `00000000-0000-4000-8000-000000000002` |
| `threats_violence` | `00000000-0000-4000-8000-000000000003` |
| `sexual_inappropriate` | `00000000-0000-4000-8000-000000000004` |
| `spam_advertising` | `00000000-0000-4000-8000-000000000005` |
| `personal_information` | `00000000-0000-4000-8000-000000000006` |
| `other` | `00000000-0000-4000-8000-000000000007` |

## Reportes

Tabla: `comment_reports`

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `comment_id` | uuid nullable | FK a `post_comments`, `on delete set null` |
| `reporter_id` | uuid nullable | FK a `profiles`, `on delete set null` |
| `category_id` | uuid | FK a categorías |
| `observations` | text nullable | obligatoria para `other` |
| `status` | text | `pending`, `confirmed`, `dismissed` |
| `comment_body_snapshot` | text | obligatorio |
| `comment_author_id_snapshot` | uuid | obligatorio |
| `comment_author_name_snapshot` | text | obligatorio |
| `post_id_snapshot` | uuid | obligatorio |
| `post_caption_snapshot` | text nullable | snapshot del post |
| `comment_created_at_snapshot` | timestamptz | obligatorio |
| `admin_notes` | text nullable | privada |
| `resolved_by` | text nullable | identidad del admin |
| `resolved_at` | timestamptz nullable | fecha de resolución |
| `created_at` | timestamptz | default `now()` |

Agregar también `reporter_name_snapshot text not null`. Si la cuenta del reportante se elimina, `reporter_id` queda en `null` y el panel muestra el snapshot con la indicación “Cuenta eliminada”. Esto preserva auditoría sin impedir el borrado de cuentas existente.

Crear el índice parcial con nombre `comment_reports_reporter_comment_uidx`:

```sql
create unique index comment_reports_reporter_comment_uidx
  on public.comment_reports (reporter_id, comment_id)
  where comment_id is not null;
```

El índice cubre reportes pendientes y resueltos. Si el comentario se elimina y `comment_id` pasa a `null`, la evidencia sigue siendo auditable, pero no se permite crear nuevos reportes porque el comentario ya no es público.

## Comentarios moderados

Agregar a `post_comments`:

- `hidden_at timestamptz null`
- `hidden_by text null`

Las consultas públicas sólo devuelven comentarios con `hidden_at is null`.

Los conteos públicos, el feed, la actividad, el detalle del post, el perfil y cualquier otra consulta pública deben aplicar el mismo filtro.

Si el comentario se elimina después de ser reportado, el reporte conserva los snapshots y `comment_id` pasa a `null`.

## RLS y acceso

- Categorías: lectura para usuarios autenticados.
- Reportes: sin lectura ni actualización para usuarios finales.
- Creación de reportes: sólo mediante operación autenticada que valide `auth.uid()`, autoría y duplicados.
- Administración: acceso mediante el cliente service-role detrás de `verifyAdminToken()`.
- Los comentarios ocultos no deben aparecer en lecturas públicas.

La creación debe usar la función `create_comment_report(p_comment_id, p_category_id, p_observations)` como función `security definer`, validando sesión, autoría, comentario visible, categoría activa y duplicados.

La resolución debe usar la función `resolve_comment_report(p_report_id, p_status, p_admin_actor, p_admin_notes)` desde el cliente service-role. La función debe ser atómica y devolver conflicto si el reporte ya fue resuelto.

Cuando se confirma un reporte, todos los reportes `pending` del mismo comentario se resuelven también como `confirmed`, con el mismo actor y fecha. El comentario se oculta una sola vez.

Si el comentario fue eliminado antes de resolver el reporte, la resolución actualiza el reporte y conserva los snapshots, pero no intenta ocultar un registro inexistente.

## Límites

- `observations`: máximo 1000 caracteres después de `trim`.
- `admin_notes`: máximo 2000 caracteres después de `trim`.
- Las cadenas se recortan con `trim` antes de validar y guardar.
- Una observación vacía después de `trim` se trata como `null`, excepto para `other`, donde es inválida.

Después de aplicar la migración se deben actualizar los tipos de `src/types/database.ts` y los tipos usados por el panel admin.
