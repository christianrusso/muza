# Estrategia de testing

## Base de datos

- migración limpia y reversible por corrección posterior no destructiva;
- self-block rechazado;
- un solo bloqueo activo por par y dirección efectiva;
- segundo bloqueo del mismo ciclo idempotente;
- desbloqueo cierra el historial correcto;
- nuevo bloqueo posterior crea un nuevo ciclo;
- follows eliminados en ambas direcciones dentro de la operación;
- borrado de cuenta no queda impedido;
- RLS impide leer o modificar historial ajeno;
- métricas calculadas correctamente con cero, uno y múltiples ciclos.

## API

- visitante o sesión ausente recibe `401`;
- self-block recibe `CANNOT_BLOCK_SELF`;
- bloqueo desde rutas distintas al perfil no se agrega a la UI;
- body inválido recibe `INVALID_BODY`;
- requests repetidos son idempotentes;
- interacciones directas entre bloqueados reciben `BLOCKED_RELATION`;
- errores no revelan quién inició el bloqueo;
- endpoint admin requiere cookie admin.

## UI

- confirmar y cancelar bloqueo;
- estado de perfil no disponible;
- lista vacía, cargando, error y reintento;
- desbloquear desde configuración;
- follows no reaparecen después de desbloquear;
- usuario no relacionado sigue viendo el contenido;
- pantalla `/admin/analytics/blocks` sólo para admin;
- métricas con datos, sin datos y error.

## Demo

Probar en modo demo:

1. crear o usar dos identidades demo;
2. bloquear desde perfil;
3. ocultar contenido e interacciones;
4. eliminar follows;
5. desbloquear desde configuración;
6. restaurar visibilidad sin follow;
7. conservar historial y mostrar métricas demo.

## Regresión

Ejecutar `npm test`, `npm run lint` y `npm run build`, además de verificar comunidad, cuenta/borrado y bloqueo administrativo.

