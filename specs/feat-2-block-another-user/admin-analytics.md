# Analytics administrativos

## Ubicación

La pantalla vive en:

`/admin/analytics/blocks`

Es una pantalla hija del área de métricas administrativas. `/admin` conserva sus métricas generales y no debe llenarse con el detalle de bloqueos.

## Acceso

- sólo administradores autenticados con la cookie `ll_admin`;
- protección en proxy, layout y route handler según el patrón admin existente;
- no accesible para usuarios normales ni visitantes;
- el cliente nunca recibe filas crudas de `user_block_history`.

## Métricas

Mostrar:

1. Bloqueos activos actuales.
2. Bloqueos creados en los últimos 7 días.
3. Bloqueos creados en los últimos 30 días.
4. Desbloqueos en los últimos 7 días.
5. Desbloqueos en los últimos 30 días.
6. Usuarios únicos que iniciaron al menos un bloqueo.
7. Usuarios únicos actualmente bloqueados.
8. Usuarios únicos bloqueados históricamente.
9. Promedio de ciclos de bloqueo por usuario que bloqueó.
10. Evolución diaria de bloqueos de los últimos 14 días.

No mostrar cantidad de follows eliminados por bloqueos.

## Fuente de verdad

Las métricas deben salir de datos persistidos en Supabase, no sólo de PostHog. PostHog no es necesario para calcular esta pantalla.

Seguir el patrón de `admin_metrics()`:

- agregación en Postgres;
- función o RPC privilegiada;
- respuesta JSON agregada;
- tipos explícitos en `src/lib/admin/metrics.ts` o helper específico;
- route handler bajo `/admin/api/analytics/blocks`.

## Estados de UI

- loading;
- datos con ceros;
- error de carga con mensaje y reintento;
- timestamp de última actualización;
- gráfico vacío sin error cuando no hay bloqueos.

