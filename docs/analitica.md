# Analítica de Infomate — exploración

Estado: decisiones de producto acordadas, 2026-11-02; formalizadas por pedido del usuario mediante `to-spec`. La especificación implementable está en [spec.md](../.scratch/analitica-infomate/spec.md). Este documento conserva la exploración y las decisiones previas.

Publicada como [GitHub issue #13](https://github.com/FranciscoAnnoni/tech-news/issues/13), con etiqueta `ready-for-agent`.

## Decisiones aceptadas

- Objetivo principal: entender el hábito de volver a Infomate. El interés por categoría y fuente sirve como diagnóstico secundario.
- Integrar Mixpanel y Vercel Speed Insights. Sentry queda fuera del alcance actual.
- Medición con identidad seudónima por navegador, sin registro ni nombres o emails. No equivale a identificar personas entre dispositivos.
- Usar eventos explícitos y un módulo tipado de analítica en cliente. Autocapture y grabaciones de sesiones desactivados inicialmente.
- Aceptado el conjunto inicial de eventos y propiedades de esta exploración, sujeto a precisar sus disparadores y deduplicación.
- Separar producción de pruebas y evitar que fallas de analítica interrumpan el uso de la web.
- Medir retorno a la web y retorno con interacción (abrir una noticia, ir a la fuente o compartir), a 1 y 7 días. El resultado observable de compartir se desglosará para no confundir una cancelación con una acción exitosa.
- Registrar exposición cuando la tarjeta queda arriba con la página visible, una vez por noticia y recorrido. Conservar aperturas repetidas como acciones; calcular la tasa de apertura con noticias únicas dentro del recorrido.
- Medir sin mostrar banner ni preferencia de analítica, por decisión explícita del usuario. No recoger nombres, emails ni contenido completo de noticias. Esto no significa ausencia de datos: se necesita un identificador persistente seudónimo para reconocer el navegador y se envían eventos y propiedades. Esta decisión describe la experiencia de producto; no establece una conclusión legal.
- Agregar `utm_source=share&utm_medium=referral` a los enlaces compartidos, tanto mediante API nativa como portapapeles, sin identificar emisor ni destinatario. Estos parámetros indican el origen marcado del enlace, no la app utilizada ni una relación demostrable entre personas.
- Medir apertura de guía, aceptación/cancelación del prompt cuando esté disponible, confirmación por evento de instalación cuando exista e inicio en modo PWA. En iOS el uso en modo PWA es observable, pero no confirma cuándo se instaló.

## Hechos verificados en el repositorio

- La web usa Next.js App Router y componentes interactivos de React. No tiene un SDK de analítica declarado en `web/package.json` ni un flujo de cuentas en los componentes revisados.
- `Mazo` presenta tarjetas de ARG, Global y Tech. Abre detalles en una capa sin cambiar la URL, permite descartar, volver a la anterior y reiniciar.
- Las tres tarjetas montadas no equivalen a tres exposiciones: solo la superior es la tarjeta activa.
- Alcanzar el final del mazo no implica leer: se puede descartar todo.
- La página pública `/noticia/[identificador]` permite entrar directamente al detalle y volver a las noticias de hoy. Un link puede mostrar una noticia no disponible.
- `BotonCompartir` distingue compartir mediante la API nativa, copiar, cancelar y error. Su resultado no demuestra que un destinatario recibió o abrió el enlace.
- La guía de instalación y el estado de PWA existen. No todos los navegadores permiten confirmar una instalación del mismo modo.

## Eventos acordados

| Evento | Disparador / significado |
| --- | --- |
| `mazo_iniciado` | Mazo listo para usar; incluir cantidad de tarjetas y recorrido. |
| `tarjeta_vista` | Tarjeta superior expuesta con la página visible; una vez por noticia y recorrido, sin umbral temporal adicional. |
| `noticia_abierta` | Detalle visible; distinguir capa y página pública. No significa lectura completa. |
| `noticia_descartada` | Descarte confirmado. No implica desagrado. |
| `fuente_abierta` | Clic en el enlace externo. No confirma lectura en el sitio de origen. |
| `compartir_solicitado` / `compartir_resultado` | Intención y resultado observable: API nativa, copia, cancelación o error. |
| `mazo_completado` | Llegada al final de un recorrido no vacío, con abiertas y descartadas. |
| `guia_instalacion_abierta` | Apertura de la guía; no equivale a instalar. |
| `instalacion_resultado` | Resultado observable del prompt: aceptación, cancelación o error; aceptar no demuestra instalación completada. |
| `app_instalada` | Confirmación mediante el evento del navegador, solo donde esté disponible. |
| `app_iniciada` | Entrada a la web, con modo navegador/PWA y atribución de entrada depurada. No emitir por cada cambio de tarjeta. |
| `noticia_no_disponible_vista` | Entrada a un link que ya no puede mostrar la noticia. |
| `donacion_vista` | Tarjeta de donación arriba del Mazo con la página visible; una vez por día. `posicion` es cuántas noticias van antes. |
| `donacion_descartada` | Tarjeta de donación deslizada a la izquierda o "Ahora no". |
| `donacion_abierta` | Apoyar tocado o deslizado en la tarjeta (`superficie` `tarjeta`). Abre el link de pago de Mercado Pago; no confirma que haya donado. |

Propiedades propuestas: identificador de noticia, edición, categoría, fuente, posición y tamaño del mazo, superficie (tarjeta/capa/página), identificador de recorrido, modo navegador/PWA y atribución de entrada depurada. No enviar texto completo ni URLs con parámetros arbitrarios.

## Enfoque de integración aceptado

- SDK `mixpanel-browser` inicializado una sola vez en cliente y encapsulado en un módulo de eventos tipados.
- Eventos explícitos para los gestos y las capas. Autocapture y grabación de sesiones desactivados inicialmente.
- Identidad seudónima por navegador, sin inventar cuentas ni usar `identify()` para visitantes sin identificar. La retención resultante se mide por navegador, no por persona entre dispositivos.
- Separar producción de pruebas, evitar duplicados por remontajes y revisitas, y hacer que fallas de analítica no interrumpan lectura, navegación ni compartir.
- Tableros tentativos: uso recurrente, apertura por exposición y categoría/posición, avance del mazo y entrada por enlaces compartidos.

## Configuración pendiente durante la implementación

- Token público y región del proyecto Mixpanel.
- Configuración de Speed Insights en Vercel.
- Depuración de propiedades automáticas del SDK (URLs, parámetros y geolocalización por IP) para respetar el alcance de datos acordado.

## Lecturas que debe habilitar la integración

- Retorno a 1 y 7 días, distinguiendo visita e interacción.
- Aperturas sobre exposiciones únicas por recorrido, categoría, fuente y posición.
- Avance y finalización del mazo, diferenciando aperturas y descartes.
- Compartir solicitado y resultado observable; entradas con origen compartido e interacción posterior, sin atribuir una entrada a una persona que compartió.
- Recurrencia en modo navegador frente a PWA. No asumir que ambos modos comparten siempre la misma identidad persistente.
- Rendimiento real de la web mediante Vercel Speed Insights.

## Complementos a evaluar

- Sentry excluido por decisión del usuario; alertas de fallas del feed para una etapa posterior.
- Rendimiento real con Vercel Speed Insights incluido en el alcance aceptado.
- Feedback breve sobre las noticias y monitoreo de frescura del feed.
- Grabación de sesiones y experimentos solo si aparece una pregunta concreta que los justifique.

## Fuentes primarias consultadas

- [SDK JavaScript de Mixpanel](https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript): eventos, identidad y opt-out.
- [Autocapture de Mixpanel](https://docs.mixpanel.com/docs/tracking-methods/autocapture).
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights).
- [Sentry: detalle de errores](https://docs.sentry.io/product/issues/issue-details/).

El vocabulario acordado está en `CONTEXT.md` y la decisión de identidad y alcance en `docs/adr/0001-analitica-por-navegador.md`.
