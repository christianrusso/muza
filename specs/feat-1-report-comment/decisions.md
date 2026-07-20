# Decisiones

## D-001 — Cola administrativa incluida

El reporte no es sólo un registro: v1 incluye su revisión desde el panel admin.

## D-002 — Reporte anónimo para usuarios

El autor del comentario no ve al reportante. El admin sí conserva esa identidad para auditoría y detección de abuso.

## D-003 — Un reporte por usuario y comentario

Se evita duplicar reportes del mismo usuario, pero diferentes usuarios pueden reportar el mismo comentario.

## D-004 — Categorías persistidas

Las categorías viven en una tabla con `slug` estable para que el texto visible pueda cambiar sin romper datos históricos.

## D-005 — Observaciones para “Otro”

Las observaciones son obligatorias sólo cuando la categoría seleccionada no encaja en las opciones existentes.

## D-006 — Ocultar, no eliminar

Confirmar un reporte oculta el comentario públicamente y conserva sus datos para auditoría.

## D-007 — Evidencia ante borrado

Los snapshots permiten conservar el caso aunque el autor elimine posteriormente el comentario.

## D-008 — Resolución final en v1

Los estados confirmados y descartados no se reabren desde el panel en esta versión.

## D-009 — Bloqueo separado

El bloqueo del autor no se ejecuta automáticamente al confirmar un reporte. Es una acción explícita del admin y reutiliza el flujo de bloqueo existente.

## D-010 — Modo demo

La UI debe poder probarse sin Supabase, incluyendo el comportamiento principal del reporte y la moderación simulada.

## D-011 — Resolución de reportes duplicados

Si un comentario tiene varios reportes pendientes y uno se confirma, todos los reportes pendientes de ese comentario se confirman con la misma resolución. Se conserva la categoría y observación original de cada reporte.

## D-012 — Contrato de respuestas

Las respuestas exitosas usan `{ data: ... }`, los errores usan `{ error: { code, message } }` y las listas admin usan `data` más `pagination`.

## D-013 — Límites de texto

Las observaciones tienen máximo 1000 caracteres y las notas admin máximo 2000. Ambos valores se aplican después de `trim`.

## D-014 — Exclusión pública de contenido moderado

Ocultar un comentario debe afectar no sólo el listado de comentarios, sino también todos los conteos y superficies públicas que lo consumen.

## D-015 — Cola admin

La cola se implementa como `/admin/comment-reports`, con navegación propia, 25 elementos por página, filtro por estado/categoría y detalle expandible en la misma página.

## D-016 — Competencia entre administradores

La resolución es compare-and-set: sólo puede resolver un reporte pendiente. Una segunda resolución recibe conflicto y no modifica datos.

## D-017 — Demo

El modo demo usa una identidad demo única para el flujo normal y expone una cola admin en memoria para pruebas. Los tests pueden crear identidades sintéticas para validar reportes de distintos usuarios.

## D-018 — Borrado de cuentas

El reportante se conserva mediante `reporter_name_snapshot`, pero `reporter_id` usa `on delete set null` para no bloquear el flujo existente de eliminación de cuentas. El panel identifica esos casos como “Cuenta eliminada”.

## D-019 — Rutas admin

Las páginas admin usan `/admin/comment-reports` y sus route handlers usan `/admin/api/comment-reports`, de acuerdo con la estructura actual de `src/app/admin/api`.

## D-020 — IDs de categorías

Las categorías usan los UUID fijos documentados en `data-model.md`; el `slug` es la clave legible y estable para filtros y código.
