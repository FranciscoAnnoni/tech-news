# Infomate

Lector de noticias en tarjetas de ARG, Global y Tech. La analítica busca entender el hábito de volver y el interés por el contenido.

## Lenguaje

**Mazo**:
Conjunto ordenado de tarjetas que el lector puede abrir o descartar. Llegar al final no implica haber leído todas las noticias.

**Diario**:
Portada con forma de diario de papel que ven las pantallas que no son teléfonos (tablets incluidas). Muestra las mismas tarjetas y en el mismo orden que el Mazo; la primera es la nota principal.
_Evitar_: versión desktop, web.

**Edición**:
Noticias publicadas para un día de Buenos Aires. Se numera por días de calendario desde el 2/11/2026 (Edición Nº 1); varias corridas del mismo día son la misma edición.

**Apertura de noticia**:
Visualización del detalle de una noticia, en una capa del mazo o en su página pública. No demuestra lectura completa.
_Evitar_: lectura completada.

**Descarte**:
Acción de pasar una tarjeta sin abrir su detalle. No demuestra desagrado por la noticia.
_Evitar_: dislike, voto negativo.

**Lector medido**:
Identidad seudónima asociada a un navegador para analizar recurrencia en Infomate. No equivale a una persona identificada ni permite unir automáticamente dispositivos.
_Evitar_: cuenta, usuario registrado, persona única.

**Retorno con interacción**:
Vuelta a Infomate en la que el lector abre una noticia, va a la fuente o comparte. Se analiza por separado del simple retorno a la web, a 1 y 7 días.

**Exposición de tarjeta**:
Presentación de una tarjeta en la parte superior del mazo con la página visible. Para las métricas del recorrido se cuenta una vez por noticia, aunque se vuelva a ella.

**Tarjeta de donación**:
Tarjeta amarilla del Mazo con un mate que se balancea ("¿Nos invitás un mate?") que pide un aporte de $2.000 por Mercado Pago. No es una noticia: no suma al contador, no es una Exposición de tarjeta y "Anterior" la saltea. Aparece cada 3 días como mínimo, nunca el primer día del navegador, y no vuelve en 30 días si tocó Apoyar. En el Diario el mismo pedido es un cupón recortable ("$2.000 de apoyo") entre la portada y las columnas: todo el cupón lleva a Mercado Pago y la ✕ lo cierra; los dos comparten el plan, así que lo que se resuelve en uno no aparece en el otro.
_Evitar_: publicidad, anuncio.

**Modo equipo**:
Marca en el localStorage de un navegador de quienes hacen Infomate, para no ver la Tarjeta de donación. Se activa y desactiva con 5 toques seguidos en el logo INFOMATE del Mazo o del Diario; recargar reinicia la cuenta. Cada toque saca un mate del logo, como easter egg. No identifica a nadie ni da acceso a nada.
