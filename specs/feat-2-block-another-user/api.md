# Contrato API

Las respuestas exitosas usan `{ "data": ... }` y los errores `{ "error": { "code": "...", "message": "..." } }`.

## Bloquear o desbloquear

`POST /api/community/users/:id/block`

Request:

```json
{
  "blocked": true
}
```

Para desbloquear se usa el mismo endpoint con `blocked: false`.

Respuesta `200 OK`:

```json
{
  "data": {
    "userId": "uuid",
    "blocked": true
  }
}
```

Errores:

- `400 INVALID_BODY`: body inexistente o `blocked` no booleano.
- `400 CANNOT_BLOCK_SELF`: el objetivo es el usuario actual.
- `401 UNAUTHENTICATED`: no hay sesión.
- `404 USER_NOT_FOUND`: el perfil objetivo no existe.
- `409 BLOCK_STATE_CONFLICT`: conflicto de concurrencia que no pudo resolverse de forma idempotente.
- `500 BLOCK_OPERATION_FAILED`: error inesperado al persistir o eliminar follows.

La operación debe ser idempotente. No aceptar `blocker_id` en el body.

## Listar bloqueados

`GET /api/community/blocked-users`

Devuelve únicamente las personas bloqueadas actualmente por el usuario autenticado:

```json
{
  "data": [
    {
      "userId": "uuid",
      "name": "Pepe",
      "avatarUrl": null,
      "blockedAt": "2026-07-19T12:00:00.000Z"
    }
  ]
}
```

Orden: `blocked_at desc`. No devuelve historial completo ni bloqueos iniciados por terceros.

## Interacciones afectadas

Los endpoints existentes de follow, like, voto y comentario deben comprobar el bloqueo activo antes de escribir. Si existe una relación activa entre actor y propietario del contenido, devolver:

```json
{
  "error": {
    "code": "BLOCKED_RELATION",
    "message": "No podés interactuar con este usuario."
  }
}
```

Status recomendado: `403`.

La validación debe existir en servidor y no depender de que la UI oculte botones.

## Métricas admin

`GET /admin/api/analytics/blocks`

Requiere cookie admin válida. No exponer este endpoint bajo `/api` público.

Respuesta `200 OK`:

```json
{
  "data": {
    "activeBlocks": 0,
    "blocksLast7Days": 0,
    "blocksLast30Days": 0,
    "unblocksLast7Days": 0,
    "unblocksLast30Days": 0,
    "uniqueBlockers": 0,
    "uniqueCurrentlyBlockedUsers": 0,
    "uniqueHistoricallyBlockedUsers": 0,
    "averageBlocksPerBlocker": 0,
    "blocksByDay": [
      { "day": "2026-07-19", "count": 0 }
    ]
  }
}
```

El rango de evolución diaria debe cubrir los últimos 14 días, siguiendo la convención existente del dashboard. Si no hay datos, devolver `[]` y ceros, no error.

