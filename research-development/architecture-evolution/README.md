# Architecture evolution

**En una frase**: qué falta en código e infraestructura para escalar y para empezar a cobrar, sin sobre-construir un MVP que hoy no lo necesita.

Investigación (no implementada) sobre mejoras de código e infraestructura, alternativas de arquitectura, y qué hace falta para estar listos para escalar y para cobrar — sin perder de vista que hoy el objetivo es un MVP, no un sistema para un millón de usuarios que todavía no existen.

Punto de partida: [02-architecture.md](../general-app-research/02-architecture.md), [01-tech-stack.md](../general-app-research/01-tech-stack.md) y [09-risks.md](../general-app-research/09-risks.md) — documentan el estado real del código hoy. Esta carpeta propone cambios, no describe lo que ya existe.

## Documentos

- [00-code-and-infra-improvements.md](./00-code-and-infra-improvements.md) — mejoras concretas ordenadas por costo/beneficio, más las decisiones de arquitectura que trae la iniciativa de [adaptive-scoring/](../adaptive-scoring/) (dónde corren los procesos por lotes, qué pasa cuando crece el volumen de datos).
- [01-payment-readiness.md](./01-payment-readiness.md) — qué hace falta para poder activar un modelo de pago sin tener que rehacer lo ya construido.

## Principio general

MVP no significa "sin cuidado" — significa **no construir hoy lo que no hace falta hoy**, pero sin tomar decisiones que sean caras de deshacer más adelante (ver la distinción entre las dos categorías en [00-code-and-infra-improvements.md](./00-code-and-infra-improvements.md#dos-categorías-distintas-lo-simple-hoy-y-lo-que-no-se-puede-simplificar-después)).

## Estado

Investigación en curso. Nada de esto está implementado.
