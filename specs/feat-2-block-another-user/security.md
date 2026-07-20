# Seguridad y privacidad

## Bloqueo social

La relación de bloqueo es privada. El usuario bloqueado no debe poder consultar quién lo bloqueó, cuándo ocurrió ni la dirección del registro.

## Contenido filtrado

Para una sesión autenticada afectada por el bloqueo, filtrar:

- perfiles;
- posts y portfolios;
- comentarios;
- likes y votos visibles;
- follows;
- actividad;
- conteos y estados derivados;
- acceso directo a posts.

Un usuario no relacionado continúa viendo e interactuando normalmente.

## Datos históricos

No eliminar posts, comentarios, likes, votos ni otras interacciones por un bloqueo. El historial de bloqueo se conserva para trazabilidad y métricas administrativas.

## Separación de admin

El bloqueo social no usa `profiles.blocked_at`, `auth.users.banned_until` ni `admin_set_user_blocked`. El bloqueo administrativo existente conserva sus efectos actuales.

## Controles

- derivar el actor de `auth.uid()`;
- validar bloqueo en servidor para cada escritura afectada;
- aplicar RLS a la tabla histórica;
- no usar service-role para acciones normales de usuarios;
- el endpoint admin sólo devuelve agregados;
- no enviar nombres, contenido ni motivos de bloqueo a PostHog;
- no emitir notificaciones sobre la acción.

