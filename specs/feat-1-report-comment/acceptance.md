# Criterios de aceptación

## Reporte de usuario

- [ ] Un invitado no puede crear un reporte.
- [ ] Un usuario autenticado puede reportar un comentario de una foto propia.
- [ ] Un usuario autenticado puede reportar un comentario de una foto ajena.
- [ ] El autor de un comentario no ve la acción de reportarlo o recibe un rechazo seguro si intenta usar la API.
- [ ] El formulario exige una categoría.
- [ ] “Otro” exige observaciones.
- [ ] El usuario recibe confirmación al enviar correctamente.
- [ ] Un segundo reporte del mismo usuario y comentario no crea otro registro.
- [ ] Dos usuarios distintos pueden reportar el mismo comentario.
- [ ] Confirmar un reporte confirma también los reportes pendientes restantes del mismo comentario.
- [ ] Descartar un reporte no resuelve los demás reportes del comentario.
- [ ] El autor del comentario no puede saber quién lo reportó.

## Moderación

- [ ] El reporte aparece en la cola admin como pendiente.
- [ ] El admin puede filtrar por estado y categoría.
- [ ] El admin ve el comentario, snapshots, post, autor, reportante y observaciones.
- [ ] El admin puede descartar un reporte con nota opcional.
- [ ] El admin puede confirmar un reporte con nota opcional.
- [ ] Confirmar oculta el comentario de la vista pública.
- [ ] Los conteos, feed, actividad, perfil y detalle excluyen comentarios ocultos.
- [ ] Descartar mantiene visible el comentario.
- [ ] Resolver dos veces el mismo reporte devuelve conflicto sin cambiar la primera decisión.
- [ ] Un reporte resuelto no puede volver a modificarse en v1.
- [ ] El admin puede bloquear opcionalmente al autor mediante la función existente.

## Auditoría y datos

- [ ] El reporte conserva snapshots si el comentario se elimina.
- [ ] El comentario oculto no aparece en listados públicos ni incrementa contenido visible.
- [ ] Las políticas impiden que usuarios finales lean o modifiquen reportes.
- [ ] Las categorías se cargan mediante migración con IDs estables.
- [ ] Un comentario eliminado conserva snapshots en el reporte.
- [ ] Si se elimina la cuenta del reportante, el reporte conserva su nombre snapshot y no bloquea el borrado de la cuenta.
- [ ] Si se elimina la cuenta del autor, el reporte conserva el nombre snapshot del autor.
- [ ] Un comentario oculto o eliminado no acepta nuevos reportes.
- [ ] Se aplican los límites de 1000 caracteres para observaciones y 2000 para notas admin.

## Demo y regresión

- [ ] El modo demo permite crear, duplicar, confirmar y descartar reportes.
- [ ] El modo demo conserva reportes en memoria durante el proceso y puede mostrar la cola admin.
- [ ] Crear y leer comentarios existentes sigue funcionando.
- [ ] Se actualizan `src/types/database.ts` y los tipos admin después de la migración.
- [ ] Pasan tests, lint y build.
