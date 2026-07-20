# Contexto vivo del proyecto

Este directorio es el paquete de contexto que debe leer cualquier agente de Codex, Claude u otra herramienta antes de modificar la aplicación.

La finalidad es que un agente entienda el producto, el negocio, la arquitectura y las restricciones principales sin tener que recorrer todo el repositorio en cada tarea.

## Lectura recomendada

1. [Resumen y estado actual](./00-overview.md)
2. [Arquitectura técnica](./01-architecture.md)
3. [Dominio y datos](./02-domain-and-data.md)
4. [Producto y negocio](./03-product-and-business.md)
5. [Marketing y crecimiento](./04-marketing-and-growth.md)
6. [Operación y guía para agentes](./05-operations-and-agents.md)
7. [Mapa de features y documentación](./06-feature-map.md)

## Jerarquía de fuentes de verdad

Cuando dos documentos difieren, usar este orden:

1. Código y migraciones que estén efectivamente desplegados o presentes en la rama actual.
2. Specs de la feature en `specs/` para comportamiento nuevo aún no implementado.
3. Este contexto vivo en `docs/project-context/` para arquitectura, negocio y convenciones.
4. `docs/LookLab-Funcionalidades.md` para visión de producto y checklist histórico.
5. Briefs y materiales de `marketing/` para hipótesis, copy y campañas.

Toda diferencia importante debe registrarse en este contexto o en la spec correspondiente; no se debe “resolver” silenciosamente eligiendo una fuente.

## Regla de actualización

Cada cambio que agregue una ruta, entidad, integración, flujo de negocio, evento analítico, plan comercial o restricción operativa debe actualizar el documento correspondiente en la misma tarea.

El [documento de operación](./05-operations-and-agents.md) contiene el checklist de mantenimiento.
