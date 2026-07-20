# Especificación funcional

## Objetivo

Permitir que un usuario autenticado bloquee a otro usuario desde el perfil de esa persona. El bloqueo debe ocultar completamente el contenido y las interacciones entre ambos, eliminar sus follows, poder deshacerse desde configuración y conservar trazabilidad histórica.

## Alcance v1

Incluye:

- acción de bloqueo únicamente desde el perfil de la otra persona;
- bloqueo bidireccional: ninguno ve el contenido ni las interacciones del otro;
- eliminación de follows existentes en ambas direcciones;
- lista privada de “Usuarios bloqueados” en configuración;
- desbloqueo desde esa lista;
- restauración de visibilidad al desbloquear, sin restaurar follows;
- conservación de posts, comentarios, likes, votos y demás datos históricos;
- historial de bloqueos y desbloqueos para trazabilidad y métricas;
- pantalla administrativa `/admin/analytics/blocks`;
- soporte del flujo en modo demo;
- tests, lint, build y regresión de comunidad.

## Fuera de alcance

- reportar usuarios;
- notificaciones sobre bloqueos o desbloqueos;
- mensajes privados;
- silenciar usuarios;
- restringir usuarios;
- modificar el bloqueo administrativo existente;
- borrar datos históricos de la base de datos;
- agregar una acción de bloqueo desde posts o comentarios;
- modificar el comportamiento actual para visitantes no autenticados;
- restaurar automáticamente follows al desbloquear.

## Actores

- **Usuario autenticado:** bloquea y desbloquea usuarios desde las superficies permitidas.
- **Usuario bloqueado:** deja de ver y de interactuar con el bloqueador; no recibe una notificación del bloqueo.
- **Usuario no relacionado:** continúa viendo e interactuando normalmente.
- **Administrador:** consulta las métricas de bloqueos y conserva la visibilidad administrativa existente.

## Requisitos funcionales

### Bloqueo

- **REQ-001:** El usuario autenticado debe poder bloquear a otra persona únicamente desde el perfil de esa persona.
- **REQ-002:** El sistema debe impedir que un usuario se bloquee a sí mismo.
- **REQ-003:** El bloqueo debe ser bidireccional respecto de visibilidad e interacción.
- **REQ-004:** Al confirmar un bloqueo, deben eliminarse los follows existentes en ambas direcciones.
- **REQ-005:** El sistema debe ocultar entre ambos usuarios perfiles, posts, comentarios, likes, votos, follows, actividad y cualquier otra interacción comunitaria existente.
- **REQ-006:** El sistema debe rechazar nuevos follows, likes, votos y comentarios entre usuarios bloqueados.
- **REQ-007:** El bloqueo debe ser idempotente y no crear registros duplicados.
- **REQ-008:** El bloqueo no debe borrar ningún contenido o interacción histórica.
- **REQ-009:** El bloqueo social no debe modificar `profiles.blocked_at`, `auth.users.banned_until` ni el flujo de bloqueo administrativo.

### Desbloqueo

- **REQ-010:** El usuario debe poder consultar desde configuración la lista de personas que bloqueó.
- **REQ-011:** El usuario debe poder desbloquear desde esa lista.
- **REQ-012:** Desbloquear debe restaurar la visibilidad autenticada entre ambos usuarios.
- **REQ-013:** Desbloquear no debe restaurar automáticamente follows.
- **REQ-014:** Después de desbloquear, las personas pueden volver a seguirse e interactuar mediante los flujos normales.
- **REQ-015:** El desbloqueo debe ser idempotente.

### Historial y métricas admin

- **REQ-016:** El sistema debe conservar el historial de cada bloqueo y desbloqueo.
- **REQ-017:** La pantalla `/admin/analytics/blocks` debe ser accesible únicamente a administradores.
- **REQ-018:** La pantalla debe mostrar bloqueos activos actuales.
- **REQ-019:** La pantalla debe mostrar bloqueos creados en los últimos 7 y 30 días.
- **REQ-020:** La pantalla debe mostrar desbloqueos realizados en los últimos 7 y 30 días.
- **REQ-021:** La pantalla debe mostrar usuarios únicos que bloquearon a alguien.
- **REQ-022:** La pantalla debe mostrar usuarios únicos actualmente bloqueados y usuarios únicos bloqueados históricamente.
- **REQ-023:** La pantalla debe mostrar el promedio de bloqueos por usuario.
- **REQ-024:** La pantalla debe mostrar la evolución diaria de bloqueos.
- **REQ-025:** Las métricas deben calcularse sobre datos persistidos y no depender únicamente de eventos de PostHog.

## Reglas de negocio

1. Un usuario sólo puede iniciar el bloqueo desde el perfil de la otra persona.
2. El efecto del bloqueo es mutuo, aunque el historial conserva quién inició la acción.
3. Los follows se eliminan al bloquear y nunca se recrean automáticamente.
4. El contenido histórico se conserva y sólo se oculta para las personas involucradas.
5. Un tercero no afectado continúa viendo el contenido normalmente.
6. El administrador puede consultar las métricas y conserva la capacidad de ver los datos según sus permisos actuales.
7. La relación de bloqueo no se comunica mediante notificaciones.
8. Un bloqueo o desbloqueo repetido no altera el estado histórico de forma duplicada.

