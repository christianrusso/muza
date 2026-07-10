# Agrupar sin usar datos de las personas

## Decisión: agrupar por outfit, no por usuario

Se descartó, para esta fase, agrupar por datos del usuario (ubicación, edad, tipo de cuerpo). Motivo: `profiles` hoy no tiene ninguno de esos campos (ver [04-data-model.md](../general-app-research/04-data-model.md#tablas-núcleo-de-usuario)) — pedirlos suma fricción al registro y datos sensibles nuevos que hay que cuidar (reglas de acceso, consentimiento, y en algunos casos son datos considerados especialmente protegidos).

En cambio, se agrupa por **parecido entre los outfits**, usando datos que la IA ya detecta en cada análisis (`detected_prendas_superiores/inferiores/calzado/accesorios/colores`, `detected_estilo`, `style_descriptors`, `occasion_id` — ver [04-data-model.md](../general-app-research/04-data-model.md#análisis-de-outfit)) y, más adelante, tal vez un análisis visual de la foto.

Un "cluster" (grupo) es algo como *"outfits casuales con colores neutros y calzado deportivo"*, no *"usuarios de Buenos Aires"*.

## Cómo se conecta con el scoring

1. Cada análisis nuevo se asigna al cluster más parecido (o crea uno si no hay ninguno lo bastante parecido — el punto de corte queda por definir).
2. El feedback de calibración (ver [01-feedback-signal.md](./01-feedback-signal.md)) se junta por `(cluster, ocasión)`, no por usuario ni por foto individual.
3. Cuando un cluster junta suficiente feedback (mismo mecanismo de piso mínimo y ajuste gradual que en [01-feedback-signal.md](./01-feedback-signal.md#evitar-que-pocos-usuarios-distorsionen-el-score-de-todos)), ese resumen puede:
   - **Fase 1 (barato)**: influir en qué ejemplos se le muestran a la IA para outfits de ese cluster/ocasión — reemplaza o complementa la carga manual de `scoring_examples`.
   - **Fase 2 (más costoso, ver [06-ml-roadmap.md](./06-ml-roadmap.md))**: aportar un ajuste aprendido sobre el score final de ese cluster.

## Lo que esto no resuelve: el contexto cultural o geográfico

El ejemplo que arrancó esta investigación (CABA vs. Beijing) es, en el fondo, una diferencia de **código de vestimenta regional**, no solo de estilo visual. Agrupar por parecido de outfit puede coincidir en parte con grupos regionales, si las fotos de cada lugar terminan siendo visualmente distintas en la práctica — pero no lo garantiza. Dos outfits que se ven parecidos pueden ser adecuados en un lugar e inadecuados en otro por razones que la foto sola no muestra (clima, normas culturales, qué tan formal se espera en ese lugar puntual).

Esto queda anotado como una limitación conocida de esta primera versión, no como algo resuelto. Si en el futuro se decide que el contexto geográfico/cultural hace falta de verdad, el camino más simple sería agregar un campo **opcional** (nunca obligatorio) de ubicación en `profiles`, usado solo para armar grupos regionales como una dimensión más — pero recién si el agrupado por outfit muestra, con datos reales, que la diferencia importa (no de entrada, por intuición).

## Relación con el onboarding de preferencias

Esta decisión (no usar datos de la persona) es específica de **cómo se calibra el score**. Por separado, [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md) propone pedir edad/gustos en el onboarding — pero con otro fin: decidir qué outfits de otros usuarios mostrarle a cada uno para puntuar, no cómo se calcula el score de nadie. Ver la tabla de ese documento para la diferencia completa.

## Con qué tecnología se construye

Agrupar por tags detectados (categóricos: prendas, colores, estilo) no es un problema de clustering de ML clásico (k-means, DBSCAN) — no hay coordenadas numéricas, hay atributos compartidos. Se resuelve con ingeniería de software común, sin sumar nada al stack:

- **Cálculo**: una función pura en TypeScript, corriendo en el mismo batch job que el resto de esta iniciativa (ver [00-code-and-infra-improvements.md](../architecture-evolution/00-code-and-infra-improvements.md#dónde-corren-los-procesos-por-lotes-clustering-armado-del-reto-diario)). Sin librería nueva, sin runtime nuevo.
- **Algoritmo de asignación**: no es K-means — K-means exige decidir de antemano cuántos grupos `K` va a haber, y acá no sabemos cuántos "tipos de outfit" van a aparecer; forzar un `K` fijo de entrada sería inventar un número sin base. En cambio, los clusters se arman solos por aglomeración incremental: cuando llega un análisis nuevo, se calcula su similitud (ej. superposición tipo Jaccard entre `detected_prendas_superiores/inferiores/calzado/accesorios`, `detected_colores`, `detected_estilo`) contra los clusters ya existentes de la misma ocasión, y se asigna al más parecido si supera un umbral definido; si ninguno lo supera, se crea un cluster nuevo. Esto responde la pregunta de "qué tan parecidos tienen que ser dos outfits" con un número concreto a calibrar (el umbral), no con un análisis visual de la imagen.
- **Representante del cluster (centroide)**: para elegir qué ejemplos mostrarle al LLM (ver [06-ml-roadmap.md](./06-ml-roadmap.md)), no conviene inventar un outfit promedio sintético — el representante de un cluster es **el análisis real más cercano al centro del grupo** (el que menos distancia acumula contra el resto de los miembros), no un objeto artificial armado combinando tags de varios outfits distintos. Concretamente: de todos los análisis ya asignados a un cluster, el/los que se usan como few-shot son los que tienen menor distancia promedio a los demás miembros — outfits que existieron de verdad, con su foto y su feedback real.
- **Almacenamiento**: Postgres/Supabase (`outfit_clusters` o `cluster_id` en `analyses`, ver [00-fase-1-feedback-clustering-fewshot.md](./phases/00-fase-1-feedback-clustering-fewshot.md#12-clustering-básico-de-outfits-2-3-semanas)). Se recalcula por lotes (una vez al día, junto al resto de los procesos de esta iniciativa), no al instante — más simple, y no hay ninguna parte de la app que necesite el cluster de un análisis apenas se crea.
- **Explícitamente descartado para esta fase**: `pgvector` + embeddings de imagen. Sumaría una extensión de base de datos que hoy no está habilitada en Supabase más un modelo que genere los vectores, a cambio de resolver un problema (agrupar por atributos compartidos) que ya resuelve una función corta. Revisar esta decisión solo si la auditoría de calidad de cluster (siguiente sección) muestra que el enfoque por tags mezcla outfits que claramente no deberían estar juntos.

## Cómo medir si un cluster es bueno, sin mirarlo a mano caso por caso

[05-alternatives-and-tradeoffs.md](./05-alternatives-and-tradeoffs.md#2-cómo-agrupar-clustering-por-outfit-vs-alternativas) dejaba esto como pregunta abierta ("¿qué tan puros son los clusters?"), a resolver con revisión manual de una muestra. Hay un criterio más objetivo que se puede calcular automáticamente en vez de depender de que alguien mire: **la varianza (dispersión) interna de un cluster tiene que ser sensiblemente menor que la varianza de toda la población de análisis.**

Aplicado acá: calcular la distancia promedio entre pares de outfits dentro de un mismo cluster, y compararla contra la distancia promedio entre pares de outfits tomados al azar de toda la base. Si un cluster tiene una dispersión interna parecida a la de la población general, no está agrupando nada de verdad — es un cluster "de relleno" y el umbral de similitud está mal calibrado (demasiado permisivo). Este número se puede calcular en el mismo batch job que arma los clusters, y sirve como alarma automática (ej. loguearlo en `admin_metrics()`) en vez de depender de que alguien audite a mano una muestra — coherente con la restricción de no depender de revisión humana recurrente (ver [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md)).

## Open questions

- ¿Cuál es el umbral de similitud (Jaccard u otra métrica de superposición de tags) que separa "mismo cluster" de "cluster nuevo"? No hay forma de fijarlo sin datos reales — arrancar con un número conservador, medir la varianza interna de los clusters resultantes (sección anterior), y ajustar el umbral hasta que la dispersión interna quede claramente por debajo de la de la población general.
- ¿Un cluster puede cruzar distintas ocasiones, o siempre es `(cluster, ocasión)`? La ocasión ya actúa como techo del score (ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#techo-de-ocasión-occasionceiling)) — probablemente conviene mantenerla siempre separada, no mezclarla dentro del cluster visual.
