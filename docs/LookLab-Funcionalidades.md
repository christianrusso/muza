# LookLab — Documento de Funcionalidades

> **LookLab — "Tu outfit, evaluado"**
> App móvil que analiza tu vestimenta con inteligencia artificial, te da un puntaje y recomendaciones concretas para mejorar, y suma una comunidad donde comparás tu ojo con el de la IA y con otros usuarios.

Este documento sirve para dos cosas:
1. **Vender la app** — explica qué hace, para quién y por qué es valiosa.
2. **Testear la app** — al final hay una guía de testing con checklists por módulo.

*Última revisión del documento: 13 de julio de 2026.*

---

## 1. Resumen ejecutivo

LookLab es una aplicación pensada para el celular donde el usuario **se saca una foto de su outfit** (o sube una de la galería) y en segundos recibe:

- Un **puntaje general de 0 a 100** (el "Outfit Score").
- Un **desglose por 10 categorías** (fit, colores, calzado, etc.), cada una con su nota y una justificación.
- **Fortalezas, aspectos a mejorar y recomendaciones accionables** ("agregá un cinturón de cuero", "sumá un abrigo liviano", etc.).

Todo el análisis está atado a **la ocasión** para la que se viste (trabajo, fiesta, casamiento, gimnasio…), porque la misma ropa puede estar perfecta para una situación y fuera de lugar en otra.

Además de la herramienta de análisis, LookLab tiene una **comunidad**: los usuarios publican sus looks, juegan a "adiviná qué puntaje le puso la IA", se siguen entre sí, dan "me gusta" y comentan.

**Principio central (y diferenciador de marca):** LookLab **evalúa la ropa, nunca el cuerpo**. No comenta ni juzga el físico, el peso, la altura ni ningún atributo personal. Esto está reforzado tanto en el diseño como en las instrucciones que recibe la IA.

---

## 2. Propuesta de valor

**Para quién es:**
- Personas que quieren una segunda opinión rápida y honesta antes de salir.
- Gente que se está armando para una ocasión importante (entrevista, cita, casamiento) y duda del outfit.
- Quienes quieren mejorar su estilo con feedback concreto, no genérico.
- Un público social al que le gusta compartir y comparar looks.

**Qué resuelve:**
- La duda de "¿estoy bien vestido para esto?" sin depender de la opinión de otra persona.
- Feedback **objetivo, inmediato y accionable** (no un "estás bien" vacío).
- Un espacio lúdico y social alrededor de la moda personal.

**Diferenciales:**
- Puntaje **contextual a la ocasión** (con matices: fiesta de día vs. de noche, cita formal vs. informal, etc.).
- Evaluación **respetuosa**: solo la ropa, jamás el cuerpo.
- **Personalización por códigos de moda** (femenina / masculina) según lo que declara el usuario.
- Componente **social y de juego** ("adiviná el score") que genera recurrencia.

---

## 3. Cómo funciona (el flujo en 3 pasos)

1. **Elegís la ocasión** (y opcionalmente un matiz, ej. "Fiesta · Noche · Cóctel", o un texto libre como "cumpleaños infantil").
2. **Sacás o subís la foto** del outfit. La IA primero **valida** que la foto sirva (buena luz, nítida, que se vea la ropa).
3. **Recibís el resultado**: puntaje, desglose por categoría, fortalezas, mejoras y recomendaciones. Podés guardarlo en tu historial, compartirlo o publicarlo en la comunidad.

---

## 4. Funcionalidades detalladas

### 4.1 Registro e ingreso

- **Pantalla de bienvenida** con dos formas de entrar:
  - **Continuar con Google** (login con un toque; trae automáticamente nombre y foto de perfil).
  - **Continuar con email** (registro con email y contraseña).
- **Iniciar sesión** para usuarios que ya tienen cuenta.
- **Recuperación de contraseña**: "¿Olvidaste tu contraseña?" → email de reseteo → pantalla para definir una nueva.
- **Onboarding obligatorio (una sola vez):** al entrar por primera vez, el usuario elige **cómo se viste** (Femenino / Masculino / Prefiero no decirlo). Esto ajusta el criterio de estilo de la IA. Aclaración visible: *"Puntuamos la ropa, nunca tu cuerpo."*
  - Si el usuario ya lo completó, no se le vuelve a pedir (va directo al inicio).
- **Deep links post-login:** si alguien abre un enlace a un post compartido sin estar logueado, después de loguearse lo lleva directo a ese contenido.

### 4.2 Inicio (Home)

Panel principal después de ingresar. Incluye:
- **Saludo personalizado** con el nombre y la fecha.
- **Último Outfit Score**: tarjeta con la última foto analizada (tipo "completo"), su puntaje y la ocasión.
- **Promedio histórico** de todos los puntajes.
- **Cantidad total de análisis** realizados.
- **Botón grande "Nuevo análisis"** para arrancar el flujo principal.
- Si todavía no hay análisis, un mensaje invita a sacar la primera foto.

### 4.3 Análisis de un outfit (funcionalidad estrella)

**Paso 1 — Elegir ocasión.** Grilla de 9 ocasiones, cada una con ícono:

| Ocasión | Matices disponibles (opcionales) |
|---|---|
| **Casual** | Estilo: Relajado / Arreglado |
| **Trabajo** | Código: Formal / Business casual / Creativo |
| **Gimnasio** | Actividad: Pesas / Running / Yoga / Outdoor |
| **Fiesta** | Momento: Día / Noche · Tipo: Casual / Cóctel / Boliche |
| **Casamiento** | Momento: Día / Noche · Lugar: Salón / Jardín / Playa |
| **Cita** | Formalidad: Informal / Formal · Momento: Día / Noche |
| **Entrevista** | Rubro: Corporativo / Creativo · Startup |
| **Viaje** | Destino: Playa / Ciudad / Montaña · Frío / Naturaleza |
| **Otro** | (sin matices) |

- Además de los matices por chips, el usuario puede escribir un **contexto libre** (hasta 200 caracteres) para dar detalle que los chips no capturan (ej. *"boda en la playa"*).

**Paso 2 — Capturar la foto.** Pantalla de cámara con:
- **Cámara en vivo** (frontal o trasera, con botón para girar).
- **Disparador** para sacar la foto, con paso de confirmación ("Repetir" / "Usar esta").
- **Subir desde galería** como alternativa.
- Guías en pantalla: "Buscá buena luz y que se vea el outfit completo" + marco punteado para encuadrar.
- La foto se **comprime/redimensiona** antes de subir (más rápido) y se guarda de forma privada.

**Paso 3 — Validación automática (IA).** Antes de puntuar, la IA revisa que la foto sea usable. Puede dar tres resultados:
- **Válida** → sigue al puntaje.
- **Parcial** → solo se ve una parte del outfit (ej. solo la parte de arriba). Se avisa y se ofrece continuar con un análisis parcial.
- **Inválida** → foto borrosa, mala luz, sin persona/prenda, o directamente no es un outfit (una mascota, comida, un paisaje, un meme, etc.). Se muestra pantalla de error y se puede reintentar.

La validación también **clasifica el tipo de análisis** automáticamente:
- **Completo** (cuerpo entero), **Superior** (solo torso), **Inferior** (solo piernas), **Individual** (una prenda o accesorio suelto, sin persona).

**Paso 4 — Resultado.** Mientras la IA puntúa, se muestra la foto con un indicador de carga; al terminar aparece:
- **Outfit Score** (0–100) en un anillo, con color según la banda (verde ≥75, ámbar 60–74, rojo <60).
- **Ocasión + descriptores de estilo** (ej. "Cita nocturna · Elegante").
- **Insignia cualitativa** corta (ej. "Buen look", "Excelente elección").
- **Miniatura nítida de la foto analizada**, que se puede tocar para verla a pantalla completa.
- **Desglose por categoría**: cada categoría con su nota, barra de color y **justificación siempre visible**.
- **Fortalezas** (con tilde verde).
- **Aspectos a mejorar** (con ícono ámbar).
- **Recomendaciones** accionables (4–6, concretas y variadas).
- Botón para **compartir** el resultado.

### 4.4 Cómo se calcula el puntaje (para explicar el "cerebro" de la app)

El Outfit Score sale de **10 categorías fijas con pesos**, que la IA puntúa de 0 a 100:

| Categoría | Peso |
|---|---|
| Adecuación a la ocasión | 20% |
| Fit | 15% |
| Combinación de colores | 15% |
| Coherencia del outfit | 15% |
| Calzado | 10% |
| Proporciones | 10% |
| Accesorios | 5% |
| Estado de las prendas | 5% |
| Modernidad | 3% |
| Originalidad | 2% |

Reglas inteligentes que hacen el puntaje más justo:
- **La ocasión es un "techo":** si el outfit es muy inadecuado para la ocasión, el puntaje final no puede ser alto por más que las demás categorías estén bien (ej. una remera de fútbol para un casamiento no puede quedar en "aprobado").
- **Categorías que no aplican no penalizan:** en una foto que solo muestra la parte superior, "calzado" no se evalúa ni aparece; su peso se reparte entre las categorías visibles.
- **Se evalúa adecuación, no cantidad:** para el gimnasio o un look minimalista, *no* tener accesorios es lo correcto y no baja la nota.
- **Personalización por género declarado:** el criterio de fit, proporciones y modernidad se ajusta a códigos de moda femenina o masculina (o se infiere de la foto si el usuario prefirió no decirlo).
- **Ejemplos de referencia (few-shot):** el sistema puede usar casos de referencia por ocasión para calibrar mejor los puntajes.
- **La app también "detecta" prendas:** guarda las prendas superiores, inferiores, calzado, accesorios y colores identificados.

### 4.5 Historial

- Grilla con **todos los análisis válidos** del usuario, del más nuevo al más viejo.
- Cada tarjeta muestra la foto, el puntaje (con color según banda), el tipo de análisis y la ocasión + fecha.
- **Filtros por tipo**: Todos / Completo / Superior / Inferior.
- Tocar una tarjeta abre el resultado completo.

### 4.6 Comunidad

Dos pestañas: **Votá** y **Siguiendo**.

**Pestaña "Votá" (modo juego, principal):**
- Se muestran looks de otros usuarios, de a uno.
- El score está **oculto**: el usuario adivina en qué franja cae — **Bajo** (menos de 25), **Medio** (25–75) o **Alto** (más de 75).
- Al votar se **revela** el puntaje real de la IA y se le dice si acertó.
- Se muestra una comparación **IA vs. Comunidad** (el consenso de todos los que votaron ese look) y el voto propio.
- Se puede **seguir al autor** ahí mismo.
- La cola prioriza looks del **mismo género** del usuario (más relevantes) y los más nuevos.
- En cada carta se ven claramente el **tipo de análisis** y el **sexo del perfil**.

**Pestaña "Siguiendo" (feed social):**
- Muestra los posts de los perfiles que el usuario sigue, del más nuevo al más viejo, con **scroll infinito**.
- Si todavía no sigue a nadie, invita a ir a "Votá".

**Publicar un look:**
- Botón "Publicar" → lista de los análisis del usuario que todavía no publicó → elige uno y lo comparte (con texto opcional).

**Interacciones sobre cada post:**
- **Me gusta** (corazón, con contador).
- **Comentarios**.
- **Compartir** (usa el menú nativo del celular o copia el enlace).
- El autor puede **borrar** su propio post.

**Perfiles de usuario:**
- Foto, nombre, contadores de **Seguidores / Siguiendo / Looks**.
- **Portfolio**: solo los looks que esa persona **publicó** (no todos sus análisis privados).
- Botón **Seguir / Dejar de seguir**.

**Actividad (notificaciones):**
- Pantalla con las novedades sobre los posts propios: **quién dio me gusta, quién comentó y quién empezó a seguirte**, del más nuevo al más viejo.
- **Badge de no leídas** en el ícono de la barra inferior.

### 4.7 Perfil y Configuración

**Perfil (pestaña):**
- Avatar (subible), nombre y **plan** (Gratis / Pro).
- Métricas: **Promedio**, **Análisis** y **Publicaciones**.
- Grilla con **tus publicaciones** (con likes y comentarios de cada una).
- Accesos a: Editar nombre, Género, Configuración, Legales.

**Configuración:**
- **Tarjeta de LookLab Pro** ("Próximamente") para usuarios del plan gratis.
- **Editar nombre**.
- **Idioma** ("Próximamente").
- **Notificaciones** (interruptor on/off).
- **Sesión**: cerrar sesión y **borrar cuenta** (elimina la cuenta, las fotos y el avatar de forma permanente).
- **Legales**: política de privacidad y términos de uso (página pública).

### 4.8 Planes (Free / Pro)

- **Estado actual (lanzamiento):** todo **gratis y sin topes** — análisis ilimitados e historial completo.
- La arquitectura ya contempla un futuro **plan Pro** con: análisis avanzado, prioridad de procesamiento, recomendaciones avanzadas y una función de **Simulación con IA** (fuera de alcance por ahora).
- Precios y límites del plan gratis (topes por mes, ventana de historial) están **definidos pero desactivados**, listos para encender cuando se active la monetización.

### 4.9 Panel de administración (interno)

Panel privado, con **login de administrador propio** (separado del de usuarios), que muestra métricas del negocio:
- **Usuarios**: registrados, nuevos (7 y 30 días), Pro vs. Free, registros por día.
- **Actividad**: análisis totales, válidos, usuarios con score, score promedio, pendientes/inválidos, análisis por día, por ocasión, top usuarios.
- **Comunidad**: posts, reacciones, comentarios, follows, cuántos publicaron, top posts por likes.
- **Embudo de activación**: registrados → hicieron ≥1 score → publicaron en comunidad.

---

## 5. Privacidad y ética

- **Solo se evalúa la ropa.** Tanto la validación como el puntaje tienen instrucciones estrictas de **nunca** comentar el cuerpo, el físico, el peso, la altura ni atributos personales.
- **Fotos privadas:** las imágenes se guardan de forma privada y se acceden con enlaces firmados temporales.
- **Datos que se recolectan** (según la política de privacidad de la app): cuenta (email, nombre, y foto si entra con Google), fotos de outfits, y datos de uso (análisis, puntajes, publicaciones, likes, comentarios).
- **Borrado de cuenta:** el usuario puede eliminar su cuenta y todos sus datos y fotos.

---

## 6. Contexto técnico (resumen para no técnicos)

- **App web pensada para el celular** (mobile-first). En computadora se ve enmarcada como un teléfono. Se puede "instalar" como app en el inicio del celular.
- **Inteligencia artificial de visión** para validar y puntuar las fotos.
- **Backend en la nube** para cuentas, fotos, análisis y comunidad.
- Idioma de la interfaz y del feedback: **español (Argentina)**.

---

## 7. Mapa de pantallas (para referencia rápida)

| Sección | Pantallas |
|---|---|
| **Acceso** | Bienvenida · Registro (email) · Login · Olvidé contraseña · Resetear contraseña · Onboarding (género) |
| **Inicio** | Home |
| **Análisis** | Elegir ocasión · Cámara/Captura · Validando · Inválida · Parcial · Resultado |
| **Historial** | Historial (con filtros) |
| **Comunidad** | Votá · Siguiendo · Publicar · Detalle de post · Perfil de usuario · Actividad |
| **Perfil** | Perfil · Editar nombre · Editar género · Configuración · Legales |
| **Admin** | Login admin · Dashboard de métricas |

---

## 8. Guía de testing (checklist para el/la tester)

> Objetivo: recorrer **todas** las funcionalidades y reportar cualquier cosa que no funcione, se vea mal o confunda. Probar en **varios celulares** (iPhone y Android) y en **navegador de escritorio**.

### 8.1 Registro e ingreso
- [ ] Registrarse con **email y contraseña** nuevos.
- [ ] Registrarse con **Google** → verificar que aparezca **nombre y foto de perfil** de Google.
- [ ] Iniciar sesión con una cuenta existente.
- [ ] Probar **contraseña incorrecta** y email inexistente (mensajes de error claros).
- [ ] **Recuperar contraseña**: pedir reseteo, recibir el email, definir una nueva y entrar con ella.
- [ ] **Onboarding**: elegir cada opción de género; verificar que no se vuelve a pedir tras completarlo.
- [ ] Abrir un **enlace a un post compartido sin estar logueado** → tras loguearse, ¿lleva a ese post?
- [ ] Cerrar sesión y verificar que las pantallas privadas ya no son accesibles.

### 8.2 Análisis de outfit
- [ ] Elegir **cada una de las 9 ocasiones**.
- [ ] Elegir **matices/variantes** (día/noche, formal/informal, etc.) y verificar que se reflejan.
- [ ] Escribir un **contexto libre** y verificar que se puede continuar.
- [ ] Sacar foto con **cámara trasera y frontal**, y **girar** la cámara.
- [ ] Usar "Repetir" y "Usar esta" en la confirmación.
- [ ] Subir una foto **desde la galería**.
- [ ] Probar el flujo con **mala conexión** (¿spinner de "Subiendo…"? ¿mensaje de error?).
- [ ] **Validación — casos válidos:** foto de cuerpo completo, solo parte superior, solo inferior, una prenda suelta → verificar que clasifica bien el tipo.
- [ ] **Validación — casos inválidos:** foto borrosa, muy oscura, sin persona, una mascota, comida, un paisaje, un screenshot → verificar que **rechaza** y muestra la pantalla de inválida.
- [ ] **Validación — parcial:** foto donde solo se ve una parte → verificar el aviso de análisis parcial.
- [ ] **Resultado:** ver que aparecen puntaje, colores correctos (verde/ámbar/rojo), desglose con **justificaciones visibles sin clic**, fortalezas, mejoras y recomendaciones.
- [ ] Tocar la **miniatura de la foto** → ¿se abre a pantalla completa?
- [ ] **Compartir** el resultado.
- [ ] Repetir análisis de la **misma foto** → confirmar que no se duplica ni rompe (idempotencia).

### 8.3 Home e Historial
- [ ] Home muestra el **último score**, **promedio** y **cantidad** correctos.
- [ ] Con cuenta nueva sin análisis, Home muestra el estado vacío.
- [ ] Historial lista todos los análisis, ordenados del más nuevo.
- [ ] Probar **cada filtro** (Todos / Completo / Superior / Inferior).
- [ ] Verificar que **no queda espacio vacío raro** al final de la pantalla al scrollear.
- [ ] Tocar una tarjeta abre el resultado correcto.

### 8.4 Comunidad — Votá
- [ ] Aparecen looks de otros usuarios (no los propios, no los ya votados).
- [ ] El score está **oculto** hasta votar.
- [ ] Votar Bajo / Medio / Alto → se **revela** el score y dice si acertó.
- [ ] Verificar la barra **IA vs. Comunidad** y el voto propio.
- [ ] Se ven claramente el **tipo de análisis** y el **sexo** del perfil.
- [ ] Los **botones de votar entran en pantalla** sin tener que scrollear.
- [ ] **Seguir** al autor desde la carta.
- [ ] Botón "Siguiente" avanza al próximo look; al terminar la cola, mensaje de "votaste todo".

### 8.5 Comunidad — Siguiendo, publicar e interacciones
- [ ] Con 0 seguidos, el feed muestra el estado vacío e invita a "Votá".
- [ ] Seguir a alguien → su último post aparece en "Siguiendo".
- [ ] **Scroll infinito**: cargar varias tandas.
- [ ] **Publicar** un análisis (con y sin texto). Verificar que ya no aparece como "disponible para publicar".
- [ ] Dar y **quitar me gusta**; verificar contador.
- [ ] **Comentar** un post; verificar que aparece.
- [ ] **Compartir** un post (menú nativo o "enlace copiado").
- [ ] **Borrar** un post propio; verificar que ya no se ve.
- [ ] Intentar borrar un post ajeno → no debería ser posible.

### 8.6 Perfiles y actividad
- [ ] Abrir el **perfil de otro usuario**: contadores y **solo sus looks publicados**.
- [ ] Seguir / dejar de seguir y ver el contador actualizarse.
- [ ] Generar novedades (que otro te dé like, comente o te siga) y verificar la pantalla de **Actividad** y el **badge de no leídas**.

### 8.7 Perfil y configuración
- [ ] Subir / cambiar **avatar**.
- [ ] Editar **nombre** y verificar que se refleja en toda la app.
- [ ] Cambiar **género** y verificar que se guarda.
- [ ] Activar/desactivar **notificaciones**.
- [ ] Abrir **Legales**.
- [ ] **Cerrar sesión**.
- [ ] **Borrar cuenta** (con una cuenta de prueba): verificar que se elimina y no se puede volver a entrar.

### 8.8 General / transversal
- [ ] Probar en **iPhone (Safari)** y **Android (Chrome)**.
- [ ] Probar en **escritorio** (marco tipo teléfono).
- [ ] Rotación, tamaños de pantalla chicos y grandes.
- [ ] Verificar textos en **español**, sin cortes ni solapamientos.
- [ ] Tiempos de carga razonables; spinners donde corresponde.
- [ ] **Que la app nunca comente el cuerpo** en ningún feedback (regla clave).
- [ ] Navegación con el **botón atrás** del navegador sin romperse.

---

## 9. Estado y pendientes conocidos

- **Monetización desactivada:** en el lanzamiento todo es gratis e ilimitado. Precios y límites del plan Free están definidos pero apagados.
- **LookLab Pro:** marcado como "Próximamente" (incluye la idea de Simulación con IA, aún fuera de alcance).
- **Idioma:** solo español por ahora ("Próximamente" el selector de idioma).

---

*Documento generado a partir del código fuente de la aplicación. Ante cualquier diferencia entre este documento y el comportamiento real observado durante el testing, reportar la diferencia.*
