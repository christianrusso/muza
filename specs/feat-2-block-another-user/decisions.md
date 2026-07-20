# Decisiones

## D-001 — Entrada únicamente desde perfil

El usuario inicia el bloqueo entrando al perfil de la otra persona. No se agrega acción de bloqueo en posts ni comentarios en v1.

## D-002 — Efecto bidireccional estilo Instagram

Si Juan bloquea a Pepe, ninguno ve el contenido ni las interacciones del otro. El efecto se aplica a perfiles, publicaciones, comentarios, likes, votos, follows, actividad y demás superficies comunitarias.

## D-003 — Eliminar follows, no restaurarlos

Al bloquear se eliminan los follows de ambas direcciones. Al desbloquear vuelve la visibilidad, pero los follows no se recrean automáticamente.

## D-004 — Conservar datos históricos

Posts, comentarios, likes, votos y demás datos permanecen en la base de datos y sólo se ocultan para las personas involucradas.

## D-005 — Historial de bloqueos y desbloqueos

Se conserva el historial de cada ciclo para trazabilidad y para poder medir bloqueos activos, usuarios históricos y desbloqueos por período.

## D-006 — Métricas en pantalla hija

Las métricas viven en `/admin/analytics/blocks`, hija de `/admin`. El dashboard general conserva su foco y no se modifica con el detalle de bloqueos.

## D-007 — Métricas confirmadas

La pantalla muestra bloqueos activos, bloqueos y desbloqueos por períodos de 7/30 días, usuarios únicos que bloquearon, usuarios actualmente bloqueados, usuarios históricamente bloqueados, promedio de bloqueos por usuario y evolución diaria. No muestra follows eliminados.

## D-008 — Separación del bloqueo administrativo

La feature no modifica el bloqueo admin existente, que continúa representado por `profiles.blocked_at` y administrado desde el panel de usuarios.

## D-009 — Fuera de alcance social

Reportes, notificaciones, mensajes, silenciar y restringir quedan fuera de esta feature.

## D-010 — Estado de la spec

La documentación se crea como `draft` para permitir una revisión final del detalle técnico antes del plan de implementación.

