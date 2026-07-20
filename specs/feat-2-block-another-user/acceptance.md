# Criterios de aceptación

## Bloqueo desde perfil

- [ ] **AC-001:** La acción de bloqueo aparece únicamente en el perfil de otra persona.
- [ ] **AC-002:** Un usuario no puede bloquearse a sí mismo.
- [ ] **AC-003:** La confirmación explica que ambos dejarán de verse y que se eliminarán los follows.
- [ ] **AC-004:** Confirmar crea un bloqueo bidireccional efectivo.
- [ ] **AC-005:** Repetir el bloqueo no crea duplicados.
- [ ] **AC-006:** Se eliminan los follows en ambas direcciones.
- [ ] **AC-007:** No se borran posts, comentarios, likes, votos ni otros datos históricos.

## Ocultamiento e interacción

- [ ] **AC-008:** Cada usuario bloqueado deja de ver el perfil, posts, comentarios, likes, votos, follows y actividad del otro.
- [ ] **AC-009:** Un usuario bloqueado no puede interactuar mediante requests directos.
- [ ] **AC-010:** El feed, portfolio, detalle de post y actividad respetan el bloqueo.
- [ ] **AC-011:** Un usuario tercero no afectado sigue viendo el contenido normalmente.
- [ ] **AC-012:** El bloqueo social no modifica el bloqueo administrativo.

## Desbloqueo

- [ ] **AC-013:** Configuración contiene “Usuarios bloqueados”.
- [ ] **AC-014:** La lista sólo muestra usuarios bloqueados por el usuario actual.
- [ ] **AC-015:** La lista contempla estado vacío, carga, error y reintento.
- [ ] **AC-016:** Desbloquear restaura la visibilidad.
- [ ] **AC-017:** Desbloquear no restaura follows.
- [ ] **AC-018:** Un nuevo follow puede crearse manualmente después del desbloqueo.

## Historial y métricas admin

- [ ] **AC-019:** Cada bloqueo y desbloqueo queda trazado en base de datos.
- [ ] **AC-020:** `/admin/analytics/blocks` sólo es accesible para administradores.
- [ ] **AC-021:** `/admin` conserva sus métricas generales sin incorporar el detalle de bloqueos.
- [ ] **AC-022:** La pantalla muestra bloqueos activos actuales.
- [ ] **AC-023:** La pantalla muestra bloqueos creados en 7 y 30 días.
- [ ] **AC-024:** La pantalla muestra desbloqueos realizados en 7 y 30 días.
- [ ] **AC-025:** La pantalla muestra usuarios únicos que iniciaron bloqueos.
- [ ] **AC-026:** La pantalla muestra usuarios únicos actualmente bloqueados.
- [ ] **AC-027:** La pantalla muestra usuarios únicos bloqueados históricamente.
- [ ] **AC-028:** La pantalla muestra el promedio de bloqueos por usuario.
- [ ] **AC-029:** La pantalla muestra evolución diaria de bloqueos de los últimos 14 días.
- [ ] **AC-030:** La pantalla no muestra cantidad de follows eliminados.

## Demo y calidad

- [ ] **AC-031:** El modo demo soporta bloqueo, ocultamiento, desbloqueo, restauración de visibilidad e historial.
- [ ] **AC-032:** El admin demo puede visualizar las métricas definidas con datos del store demo.
- [ ] **AC-033:** Pasan tests, lint y build.

