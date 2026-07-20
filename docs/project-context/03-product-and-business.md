# Producto, negocio y modelo comercial

## Problema

Las personas dudan si están bien vestidas para una ocasión concreta. Buscan una opinión rápida, honesta y accionable, no solamente un número ni una explicación genérica.

## Propuesta de valor

LookLab analiza una foto del outfit según el contexto —trabajo, cita, fiesta, casamiento, gimnasio, viaje, etc.— y explica qué funciona, qué cambiaría y cómo mejorarlo.

El score es el mecanismo visible; la promesa principal es reducir la duda y dar feedback útil.

## Público objetivo

- Personas que quieren una segunda opinión antes de salir.
- Personas que se preparan para entrevistas, citas, fiestas o eventos importantes.
- Usuarios interesados en mejorar su estilo con recomendaciones concretas.
- Público social que disfruta compartir looks, votar y comparar opiniones.

## Producto principal

### Flujo de análisis

1. Elegir ocasión y variantes/contexto.
2. Sacar o subir una foto.
3. Comprimir y guardar la foto de manera privada.
4. Validar con IA si la imagen sirve.
5. Clasificar el tipo de análisis.
6. Puntuar y generar feedback.
7. Mostrar resultado, historial y opciones para compartir/publicar.

### Score

El score combina diez dimensiones: ocasión 20%, fit 15%, colores 15%, coherencia 15%, calzado 10%, proporciones 10%, accesorios 5%, estado 5%, modernidad 3% y originalidad 2%.

La implementación puede ajustar pesos para análisis parciales, pero no debe cambiar el principio de evaluar ropa y ocasión, nunca atributos corporales.

### Comunidad

La comunidad agrega recurrencia y retención:

- feed “Votá” para adivinar score;
- feed “Siguiendo”;
- publicación de análisis;
- likes, comentarios, follows y perfiles;
- actividad sobre publicaciones propias.
- reportes de comentarios y moderación administrativa.

La comunidad es principalmente un motor de retención y participación, no la promesa primaria de adquisición.

### Modo invitado

El visitante puede explorar contenido público sin cuenta. Las acciones que requieren identidad —analizar, votar, seguir, comentar y publicar— disparan un guest wall y luego registro/login. Esto reduce fricción de adquisición y permite medir intención antes del registro.

## Monetización

Estado actual: gratis e ilimitado en el lanzamiento.

Preparado pero inactivo:

- Free/Pro.
- límites mensuales;
- ventana de historial;
- recomendaciones avanzadas;
- prioridad de procesamiento;
- simulación IA.

Los placeholders comerciales están centralizados en `src/lib/plans/limits.ts`. No se debe mostrar un precio ni activar un límite sin una decisión comercial y actualización de producto, copy, legal, tracking y tests.

## Métricas de negocio

El panel admin actual mide usuarios, análisis, scores, comunidad y embudo de activación. PostHog mide el embudo de adquisición/activación y eventos de producto.

Preguntas de negocio relevantes:

- ¿La promesa de “opinión sobre tu outfit” convierte mejor que “score”?
- ¿La ocasión es un diferencial de adquisición?
- ¿El modo invitado mejora la calidad/retención del usuario registrado?
- ¿La comunidad retiene después del primer análisis?
- ¿Qué segmento está dispuesto a pagar por Pro?

No inferir respuestas a partir de pocas visitas; los briefs de marketing piden medir retención D1/D7/D30 y usar PostHog como fuente de análisis de comportamiento.

## Ética y seguridad de producto

- La IA nunca debe comentar cuerpo, peso, altura, físico o atributos personales.
- La app debe evaluar prendas, combinación, ocasión y estilo.
- Las fotos son sensibles y deben permanecer privadas salvo publicación explícita.
- Los reportes y moderación deben proteger a quien reporta y dar herramientas al admin.
- No prometer capacidades futuras como si fueran actuales.
