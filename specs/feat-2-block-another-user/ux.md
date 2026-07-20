# UX y flujos

## Perfil de otra persona

En `/community/user/[id]`, cuando el perfil no es el propio, mostrar una acción “Bloquear usuario”. No mostrarla en feed, posts ni comentarios porque el alcance acordado es exclusivamente el perfil.

## Confirmación

Antes de ejecutar:

> ¿Bloquear a [nombre]? Los dos dejarán de ver el contenido del otro y se eliminarán los follows entre ustedes.

Acciones: “Cancelar” y “Bloquear”. El botón debe deshabilitarse mientras se procesa la operación.

## Resultado del bloqueo

- cerrar el diálogo;
- mostrar confirmación de bloqueo;
- ocultar el perfil y su contenido para el usuario actual;
- no mostrar datos parciales del usuario bloqueado;
- volver a la pantalla anterior si el perfil deja de ser accesible.

## Perfil bloqueado

Si una persona intenta acceder a un perfil con una relación activa, mostrar un estado genérico:

> Este perfil no está disponible.

No revelar si el bloqueo fue iniciado por el usuario actual o por la otra persona.

## Usuarios bloqueados

Agregar un acceso “Usuarios bloqueados” dentro de configuración. La pantalla debe mostrar:

- lista de usuarios bloqueados por el usuario actual;
- nombre y avatar disponibles para el bloqueador;
- acción “Desbloquear”;
- estado vacío;
- estado de carga;
- estado de error con reintento;
- confirmación de desbloqueo.

## Resultado del desbloqueo

- eliminar la persona de la lista;
- mostrar confirmación;
- no recrear follows;
- permitir que las superficies normales vuelvan a cargar la visibilidad.

## Accesibilidad

- diálogos navegables por teclado;
- foco controlado y Escape para cancelar;
- nombres accesibles para botones;
- estados de carga comunicados sin depender sólo del color;
- copy en español argentino y diseño mobile-first.

