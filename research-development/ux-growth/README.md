# UX Growth

**En una frase**: cómo hacer que la gente vuelva a usar LookLab mañana — activación, retención y el reto diario — sin romper el sistema de diseño existente.

Investigación (no implementada) sobre cómo evolucionar la experiencia de LookLab para retener más usuarios — sin romper el sistema de diseño que ya existe. Complementa a [adaptive-scoring/](../adaptive-scoring/), que resuelve el problema de fondo (el modelo mejora solo); esta carpeta resuelve "¿por qué alguien vuelve mañana?".

Punto de partida obligatorio antes de proponer cualquier pantalla nueva: [design-system/](../design-system/) — documenta el sistema visual real (clases CSS semánticas + componentes finos, canvas mobile fijo de 430px, tab bar de 4 ítems). Cualquier propuesta acá tiene que encajar ahí, no inventar un lenguaje visual paralelo.

## Documentos

- [00-retention-and-activation.md](./00-retention-and-activation.md) — qué se sabe hoy del embudo de activación (poco, no está medido), y qué mejoras concretas de onboarding/hábito valen la pena antes de construir features nuevas.
- [01-daily-challenge-ui.md](./01-daily-challenge-ui.md) — dónde vive en la navegación el [reto diario](../adaptive-scoring/08-daily-challenge.md), usando los patrones ya existentes (`.fab`, tab bar, `BottomSheet`) en vez de agregar una quinta tab.

## Cómo se relaciona con adaptive-scoring

El [reto diario](../adaptive-scoring/08-daily-challenge.md) es, a la vez, una feature de retención (para esta carpeta) y el mecanismo principal de recolección de feedback (para adaptive-scoring). Se diseñó ahí el qué y el por qué; acá se diseña el cómo se ve y dónde vive.

## Estado

Investigación en curso. Nada de esto está implementado.
