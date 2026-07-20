# Rollout y operación

## Orden

1. Crear migración del historial de bloqueos, índices, RLS y funciones.
2. Actualizar tipos y acceso de dominio.
3. Aplicar filtros de lectura y escrituras afectadas.
4. Agregar endpoints y soporte demo.
5. Agregar UI de perfil y configuración.
6. Agregar RPC, route handler y pantalla admin de métricas.
7. Ejecutar tests, lint y build.

## Compatibilidad

- no modificar `profiles.blocked_at`;
- no editar migraciones históricas;
- no depender de PostHog para que el panel admin funcione;
- conservar el comportamiento actual de visitantes no autenticados;
- soportar ausencia de historial con ceros y listas vacías.

## Rollback

No borrar datos históricos de producción para revertir la feature. Si hay problemas:

- ocultar la acción de UI;
- conservar la tabla y los registros;
- corregir filtros o agregaciones con una migración posterior;
- mantener disponible el bloqueo administrativo existente.

## Operación

La pantalla admin debe mostrar timestamp de actualización y errores recuperables. Los fallos de métricas no deben afectar el bloqueo social ni la navegación de usuarios.

