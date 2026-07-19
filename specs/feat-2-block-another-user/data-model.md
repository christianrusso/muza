# Modelo de datos

## Historial de bloqueos

Usar una tabla histórica, por ejemplo `user_block_history`, para conservar cada ciclo de bloqueo.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `blocker_id` | uuid | FK a `profiles.id`, obligatorio, `on delete cascade` |
| `blocked_id` | uuid | FK a `profiles.id`, obligatorio, `on delete cascade` |
| `blocked_at` | timestamptz | obligatorio, default `now()` |
| `unblocked_at` | timestamptz | nullable |
| `created_at` | timestamptz | obligatorio, default `now()` |

Restricciones:

- `check (blocker_id <> blocked_id)`;
- un registro con `unblocked_at is null` representa un bloqueo activo;
- índice parcial único sobre `(blocker_id, blocked_id)` donde `unblocked_at is null`, para impedir dos bloqueos activos del mismo par;
- índice sobre `blocked_id, unblocked_at` para filtrar el efecto bidireccional;
- índice sobre `blocked_at` y `unblocked_at` para métricas por período;
- `on delete cascade` debe permitir eliminar una cuenta sin dejar relaciones huérfanas ni impedir `/api/account/delete`.

El historial conserva quién inició cada ciclo. Si después de desbloquear se vuelve a bloquear, se crea un nuevo registro histórico.

## Estado activo

El sistema debe considerar que dos usuarios están bloqueados si existe un registro activo en cualquiera de estas direcciones:

- `(blocker_id = A, blocked_id = B, unblocked_at is null)`;
- `(blocker_id = B, blocked_id = A, unblocked_at is null)`.

La función de consulta debe ocultar la dirección a los usuarios finales.

## Operaciones atómicas

Crear una función `security definer` para:

1. validar que `auth.uid()` exista y que el objetivo sea otra persona;
2. crear el registro histórico activo si no existe;
3. cerrar o eliminar follows en ambas direcciones dentro de la misma transacción;
4. devolver el estado final sin exponer datos privados.

Crear otra operación para desbloquear que:

1. cierre el registro activo iniciado por `auth.uid()`;
2. no restaure follows;
3. sea idempotente;
4. devuelva el estado final.

## RLS y seguridad de datos

- Los usuarios finales sólo pueden crear/cerrar sus propios bloqueos mediante las operaciones autorizadas.
- Un usuario no puede leer el historial completo de bloqueos de terceros.
- El usuario bloqueado no puede consultar quién lo bloqueó ni cuándo.
- Las consultas comunitarias deben usar una función segura para filtrar relaciones activas en ambas direcciones.
- El panel admin usa su ruta privilegiada existente para métricas y puede leer agregados históricos.
- La tabla debe habilitar RLS y las funciones `security definer` deben fijar `search_path` y restringir `execute`.

## Métricas persistidas

Calcular las métricas administrativas desde `user_block_history`:

- activos: `unblocked_at is null`;
- creados en período: `blocked_at` dentro del período;
- desbloqueos en período: `unblocked_at` dentro del período;
- usuarios únicos actualmente bloqueados: objetivos distintos de registros activos, considerando ambas direcciones según el modelo de bloqueo;
- usuarios únicos históricos: usuarios que hayan sido objetivo de al menos un registro histórico;
- promedio por usuario: total de ciclos de bloqueo dividido por usuarios que iniciaron al menos uno;
- evolución diaria: agrupación por fecha de `blocked_at`.

Definir en la implementación una sola función admin agregada para evitar traer filas crudas al navegador, siguiendo el patrón de `admin_metrics()`.

## Compatibilidad

- No reutilizar `profiles.blocked_at`.
- No editar migraciones históricas; agregar una migración nueva.
- Actualizar `src/types/database.ts` y los tipos de métricas admin.
- El modo demo debe conservar un historial equivalente en memoria.

