# Contrato API

## Crear reporte

`POST /api/community/comments/:commentId/report`

Request:

```json
{
  "categoryId": "uuid",
  "observations": "texto opcional"
}
```

Responses:

- `201 CREATED`:

  ```json
  {
    "data": {
      "id": "uuid",
      "status": "pending",
      "createdAt": "2026-07-19T12:00:00.000Z"
    }
  }
  ```
- `400 INVALID_BODY`: payload inválido o falta observación para `other`.
- `401 UNAUTHENTICATED`: sesión ausente.
- `403 OWN_COMMENT`: el usuario intenta reportar su propio comentario.
- `404 COMMENT_NOT_FOUND`: comentario inexistente.
- `409 DUPLICATE_REPORT`: el usuario ya reportó el comentario.
- `500 CREATE_FAILED`: error inesperado.

No devolver el contenido privado de observaciones ni información de otros reportes.

Los errores usan siempre `{ "error": { "code": "...", "message": "..." } }`.

## Listar reportes admin

`GET /admin/api/comment-reports?status=pending&category=...&page=1&pageSize=25`

Requiere cookie admin válida. Ordenar por `created_at desc`.

Parámetros por defecto: `status=pending`, `page=1`, `pageSize=25`. `pageSize` permitido: 1 a 100. `category` filtra por `slug`.

Respuesta:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "totalPages": 0
  }
}
```

Cada elemento incluye `id`, `status`, `category`, `observations`, `adminNotes`, `createdAt`, `resolvedAt`, `reporter`, `comment`, `post` y `commentSnapshot`. `comment` puede ser `null` si el comentario fue eliminado.

## Resolver reporte admin

`POST /admin/api/comment-reports/:reportId/resolve`

Request:

```json
{
  "status": "confirmed",
  "adminNotes": "nota interna opcional"
}
```

Sólo acepta `confirmed` o `dismissed`. No permite modificar un reporte ya resuelto.

- `confirmed`: cambia el reporte y oculta el comentario en una operación atómica.
- `confirmed`: también resuelve como `confirmed` los demás reportes pendientes del mismo comentario.
- `dismissed`: cambia el reporte seleccionado y conserva visible el comentario; no modifica otros reportes pendientes.

Respuesta `200 OK`:

```json
{
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "resolvedAt": "2026-07-19T12:00:00.000Z"
  }
}
```

Errores adicionales:

- `400 INVALID_STATUS`: estado no permitido.
- `404 REPORT_NOT_FOUND`: reporte inexistente.
- `409 REPORT_ALREADY_RESOLVED`: otro request ya lo resolvió.
- `500 RESOLVE_FAILED`: error inesperado.

## Categorías

`GET /api/community/comment-report-categories`

Devuelve únicamente categorías activas para usuarios autenticados:

```json
{
  "data": [
    { "id": "uuid", "slug": "other", "label": "Otro", "sortOrder": 7 }
  ]
}
```

## Bloqueo desde admin

El bloqueo no forma parte de la resolución del reporte. Después de confirmar, el panel muestra una acción explícita que reutiliza `POST /admin/api/users/:id/block` con `{ "blocked": true }` y la confirmación del admin.

Si el bloqueo falla, el reporte permanece confirmado y el comentario permanece oculto; se muestra el error de bloqueo para permitir reintentar.
