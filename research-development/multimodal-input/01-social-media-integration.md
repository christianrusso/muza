# Conectar Instagram/TikTok/Facebook para entender el estilo del usuario

Research hecho en julio 2026 contra el estado actual de cada API — este terreno cambia con frecuencia (Meta y TikTok modifican política de acceso seguido), re-verificar antes de construir nada acá.

## El hallazgo que cambia la conversación: Instagram ya no deja hacer esto para cuentas personales

**Instagram Basic Display API** — la que permitía a una app de terceros leer las fotos de una cuenta **personal** (no comercial) — terminó su soporte el 4 de diciembre de 2024 y hoy no funciona más. Lo que queda activo (Instagram Graph API) **solo da acceso a cuentas Business o Creator**, no a cuentas personales. [Fuente: guías de desarrollador de Instagram API 2026, ver Elfsight y Zernio].

Esto es un dato central para la idea, no un detalle técnico menor: **la enorme mayoría de los usuarios de LookLab van a tener una cuenta de Instagram personal, no Business/Creator.** Con el estado actual de la API, no hay forma de que un usuario común conecte su Instagram y la app lea sus fotos — no es "difícil o costoso" como intuía el pedido original, es **no disponible** para el caso de uso principal, salvo pedirle al usuario que convierta su cuenta a Business/Creator (fricción alta, y cambia el propósito de su cuenta de Instagram solo para usar LookLab — muy poco realista esperar que la gente haga eso).

## Facebook: técnicamente posible, con una revisión de Meta exigente

El permiso `user_photos` (fotos que la persona subió o en las que está etiquetada) sigue existiendo, pero pedirlo obliga a pasar **App Review de Meta**: justificar por qué hace falta cada permiso, mandar un video mostrando exactamente cómo se usa, y tener una política de privacidad pública que cubra qué se hace con esos datos. Meta rechaza seguido por justificaciones vagas o falta de esos requisitos. Desde el caso Cambridge Analytica, Meta es sistemáticamente más restrictivo con cualquier acceso a datos personales, no menos. [Fuente: Meta for Developers — Permissions Reference, 2026].

Viable, pero: semanas de proceso de revisión (con riesgo real de rechazo), una política de privacidad que hay que escribir y mantener actualizada, y quedar expuesto a que Meta cambie las reglas de nuevo (ya pasó con Instagram).

## TikTok: acceso existe, pero ya no es gratis para uso comercial

La Display API de TikTok da perfil básico + contenido/videos del usuario, con permiso vía OAuth. La diferencia real en 2026: **"la API de TikTok ya no es gratuita para ningún caso de uso comercial o de producto práctico"** — hay una barrera de licenciamiento pago, no solo un proceso de revisión. [Fuente: guías de desarrollador TikTok 2026, ver SociaVault].

## Lo que las tres plataformas comparten, más allá de la disponibilidad técnica

Aunque alguna de las tres estuviera 100% disponible, hay fricciones que no desaparecen:

1. **Proceso de revisión de la app** (Meta, TikTok): semanas, con riesgo real de rechazo, y hay que volver a pasar por esto si se agregan permisos nuevos más adelante.
2. **Cumplimiento continuo de los términos de cada plataforma**: varias imponen restricciones sobre qué se puede hacer con los datos importados (ej. borrarlos si el usuario desconecta la cuenta, o restricciones sobre usarlos para entrenar modelos sin permiso explícito) — no es "pedile permiso al usuario y ya", también hay que respetar lo que cada plataforma le permite a la app hacer con esos datos, sin importar lo que el usuario consienta.
3. **El contenido de un feed social no es mayormente outfits**: comida, viajes, memes, capturas de pantalla. Cualquier importación masiva necesita filtrar qué fotos sirven — buena noticia: la validación que ya existe (`ValidationResultSchema`, veredicto `valid`/`partial`/`invalid`, ver [scoring-engine.md](../general-app-research/06-scoring-engine.md)) se puede reusar tal cual para esto, no hace falta construir un filtro nuevo desde cero.
4. **Esto es un salto legal más grande que las fotos que el usuario sube directo**: son datos de un tercero (la plataforma social) reusados para otro fin. Actualizar la Política de Privacidad ya era un freno obligatorio para la Fase 1 de adaptive-scoring (ver [legal-and-privacy.md](../adaptive-scoring/12-legal-and-privacy.md)) — conectar redes sociales sube la exigencia todavía más, probablemente necesita su propia sección de consentimiento explícito, separada del resto.

## Alternativa mucho más barata que resuelve la mayor parte del objetivo real

El objetivo de fondo del pedido no es "conectar Instagram" en sí — es **entender el estilo del usuario a partir de fotos que ya tiene**, para alimentar su perfil/cluster. Eso se puede lograr sin ninguna API de redes sociales:

**Dejar que el usuario importe varias fotos de su rollo de cámara de una vez**, usando el selector nativo de fotos del teléfono (algo que iOS/Android ya soportan sin pedir ningún permiso especial de red social) — la persona misma elige qué fotos de outfits quiere sumar a su perfil. Mismo flujo de validación y scoring que ya existe, corrido varias veces en batch.

- Costo: prácticamente cero — es una extensión chica del flujo de subida actual (selección múltiple en vez de una foto).
- Riesgo legal: mucho más bajo — son fotos que el usuario elige y sube activamente, mismo consentimiento que ya cubre el resto de la app, no datos importados de un tercero.
- Cubre el caso de uso real ("quiero que la app entienda mi estilo a partir de lo que ya tengo") sin depender de que Meta o TikTok mantengan una API abierta que pueden cambiar o cerrar en cualquier momento (como ya pasó con Instagram).

## Recomendación

**No construir integración con Instagram/TikTok/Facebook para esta fase.** No es una cuestión de esfuerzo — Instagram directamente no lo permite hoy para el tipo de cuenta que va a tener la mayoría de los usuarios, y TikTok/Facebook suman costo de licenciamiento o revisión sin garantía de aprobación, para un problema que la importación manual de fotos ya resuelve con una fracción del riesgo y el esfuerzo.

Vale la pena revisar esta decisión solo si en el futuro Meta o TikTok abren de nuevo el acceso a cuentas personales (pasó antes, podría volver a pasar) — no es una puerta cerrada para siempre, es una puerta cerrada **hoy**, con el estado actual de cada API.

## Open questions

- ¿La importación en batch desde el rollo de cámara consume el límite mensual de análisis si más adelante hay plan pago? Mismo criterio que ya se definió para el reto diario (ver [payment-readiness.md](../architecture-evolution/01-payment-readiness.md)) — probablemente no debería, para no desalentar la construcción del perfil.
- Si Meta reabre el acceso a cuentas personales de Instagram más adelante, ¿vale la pena priorizarlo por sobre otras fuentes de datos? Depende de cuánto valor real agregue sobre la importación manual, algo que no se puede medir hasta tener el perfil de usuario funcionando de alguna forma.
