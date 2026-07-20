# Especificación funcional

## Objetivo

Permitir que un usuario autenticado reporte un comentario ajeno desde cualquier foto de la comunidad. El reporte debe llegar a una cola privada del panel admin para revisión.

## Alcance v1

Incluye el reporte desde cada comentario, categorías, observaciones, prevención de duplicados, persistencia, cola admin, resolución del caso, ocultamiento del comentario y bloqueo opcional de su autor.

No incluye notificaciones, apelaciones, historial visible para usuarios ni moderación automática.

## Actores

- **Usuario autenticado:** crea reportes sobre comentarios ajenos.
- **Usuario invitado:** no puede crear reportes.
- **Administrador:** revisa y resuelve reportes desde el panel privado.

## Reglas de negocio

1. Sólo usuarios autenticados pueden reportar.
2. Un usuario puede reportar comentarios de cualquier post visible, propio o ajeno.
3. El autor de un comentario no puede reportar su propio comentario.
4. Un usuario sólo puede reportar una vez el mismo comentario.
5. El reporte es anónimo para el autor del comentario; el admin ve al reportante.
6. Cada reporte requiere una categoría.
7. La categoría `other` requiere observaciones; en las demás categorías son opcionales.
8. Un reporte nuevo queda en estado `pending`.
9. Un admin puede descartarlo (`dismissed`) o confirmarlo (`confirmed`).
10. Una decisión es final en v1.
11. Confirmar un reporte oculta el comentario públicamente, pero conserva el reporte y su evidencia.
12. El bloqueo del autor es una acción administrativa opcional y separada.
13. Un comentario oculto o eliminado no puede recibir nuevos reportes.
14. Si varios usuarios reportaron el mismo comentario, confirmar uno confirma también los reportes pendientes restantes de ese comentario.
15. Descartar un reporte no cambia el estado de otros reportes pendientes del mismo comentario.
16. Si el comentario se elimina antes de la resolución, el admin puede resolver el reporte usando los snapshots.

## Categorías

- `harassment_bullying` — Acoso o bullying
- `hate_discrimination` — Discurso de odio o discriminación
- `threats_violence` — Amenazas o violencia
- `sexual_inappropriate` — Contenido sexual o inapropiado
- `spam_advertising` — Spam o publicidad
- `personal_information` — Información personal
- `other` — Otro

Las categorías se inspiran en las opciones y ámbitos de reporte documentados por Instagram y TikTok, pero son categorías propias de Muza.

## Flujo de usuario

1. El usuario abre el detalle de un post.
2. En un comentario ajeno abre el menú de tres puntos.
3. Selecciona “Reportar comentario”.
4. Elige una categoría.
5. Agrega observaciones si lo desea; para “Otro” son obligatorias.
6. Envía el reporte.
7. Muza muestra “Reporte recibido” y cierra el modal.
8. Si ya lo reportó, se informa que el reporte ya fue recibido.

## Flujo admin

1. El admin abre la sección de reportes.
2. Consulta reportes pendientes, filtrables por estado y categoría.
3. Revisa el comentario, snapshots, post, autor, reportante y observaciones.
4. Descarta o confirma el reporte y puede guardar una nota interna.
5. Al confirmar, el comentario queda oculto.
6. Opcionalmente bloquea al autor usando el mecanismo existente.

## Validaciones

- Las observaciones se recortan con `trim`.
- Las observaciones tienen un máximo de 1000 caracteres.
- Las notas admin tienen un máximo de 2000 caracteres.
- Una observación vacía se guarda como `null`, salvo en `other`, donde se rechaza.

## Panel admin

La cola vive en `/admin/comment-reports` y aparece en la navegación como “Reportes”. Sus endpoints viven bajo `/admin/api/`, siguiendo la estructura actual del panel. Abre por defecto los reportes `pending`, muestra 25 filas por página y permite filtrar por estado y categoría. El detalle se expande en la misma página, sin crear una ruta adicional.

Cada fila muestra fecha, categoría, estado, comentario, autor, post, reportante y observaciones. La resolución requiere una confirmación explícita antes de ocultar el comentario.

Si dos pestañas intentan resolver el mismo reporte, la primera operación gana y la segunda recibe `REPORT_ALREADY_RESOLVED`.
