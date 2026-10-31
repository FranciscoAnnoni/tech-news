# Historia del recolector

## Antes (hasta ~10/10/2026)

El módulo tech arrancó con cinco workflows:
- `Tech · Recolector`: juntaba HN, Dev.to y Reddit.
- `Tech · Edición`: le pasaba a la IA las 30 mejores y elegía 10.
- `Tech · Herramientas`: bajaba el texto de una nota a pedido.
- `Asistente · Especialista Tech`: un agente de Telegram para preguntar por las noticias.
- `Tech · Envío automático`: mandaba la edición los lunes y jueves.

Hacia el 10/10 se unificó el envío con el de las noticias generales (`Noticias · Envío` y `Noticias · Resúmenes`). Los cuatro workflows tech que no son el recolector quedaron apagados.

## Relevamiento (26/10)

Se revisó qué había en el servidor: n8n, la base `noticias` y el panel.

- El recolector andaba: corría todos los días a las 22:00 y sus 14 ejecuciones habían salido bien.
- Había 297 noticias (del 07/10 al 25/10): hn 102, devto 100, r/programming 45, r/technology 44, r/artificial 22.
- Entraban exactamente 15 nuevas por día. Cada corrida recibía entre 36 y 49 candidatas, y de esas se descartaban de 20 a 30 por el cupo.

Problemas encontrados:
1. **El ranking no usaba los puntos**, solo la posición dentro de cada fuente. Una nota de Dev.to con 47 reacciones quedaba por encima de una de HN con 468 puntos.
2. **Las repetidas casi nunca se unían** (de 0 a 3 por corrida).
3. **Dev.to ocupaba un tercio de la base**, y casi todo era opinión o autopromoción, no noticias.
4. **No se bajaba el texto de los artículos** (solo 1 de 297 lo tenía).
5. **Reddit no traía puntos** (el RSS no los incluye).

## Arreglos (28 y 29/10)

Lo que estaba mal:
1. **No se actualizaba.** HN se pedía solo para las últimas 24 h y el recolector corre una vez por día, así que cada historia se veía una sola vez, con 7 a 16 h de vida. Los puntos quedaban congelados: por ejemplo, 729 guardados contra 1131 reales. Solo 9 de 327 noticias habían aparecido en más de una corrida.
2. **No se ordenaba.** Como `lugar` usaba solo el puesto, el 1º de cada fuente valía 4,60. En el resumen del 26/10, 14 de 15 noticias empataban en 4,60 y el orden lo decidía el desempate.
3. **Dev.to no son noticias.** De las últimas 30, solo 2 o 3 lo eran.

Lo que se cambió:

| Dónde | Cambio |
|---|---|
| `n8n/nodos/fuentes.js` | Sale Dev.to y entra Lobsters (`lobste.rs/hottest.json`, cupo 5). Se agrega `hn·refresco`: HN de las últimas 72 h, solo para actualizar. |
| `n8n/nodos/parsear.js` | Parser de Lobsters: descarta los posts sin link y las etiquetas `meta`, `event` y `ask`. Las fuentes de refresco salen aparte, en `refrescar`. |
| `sql/01-esquema.sql` | Nueva `tech_refrescar(items)`: sube puntos y comentarios solo de las noticias que tienen esa fuente. No inserta. |
| `sql/01-esquema.sql` | `tech_ranking.lugar` pasa a ser el percentil de puntos dentro de su fuente. Reddit sigue por puesto. |
| `n8n/construir.py` | `Guardar sin repetidas` corre `tech_ingresar` y además `tech_refrescar`. |
| Resúmenes y panel (fuera de este repo) | La vista `noticias_todas` agrega la columna `puntos`, y los resúmenes y el panel desempatan por puntos. |
| Asistente de Telegram (fuera de este repo) | El criterio de noticias dice "Hacker News, Reddit, Lobsters". |

Arreglos de una sola vez:
- Se volvieron a leer de Algolia y de la API de Dev.to los puntos de las 220 noticias de HN y Dev.to guardadas: 216 cambiaron.
- El 29/10 se repararon 5 noticias de Lobsters y Reddit a las que el primer refresco les había puesto puntos de HN. De ahí sale la regla de que `tech_refrescar` solo toca las noticias que tienen esa fuente.

Las noticias viejas de Dev.to no se borraron a propósito, porque hay resúmenes viejos que las nombran. Se van solas a los 30 días.

Verificado: la corrida del 28/10 trajo 15 nuevas (hn 5, lobsters 5, reddit 2+2+1), 3 unidas y 17 refrescadas. En el resumen siguiente arriba quedaron las de HN ordenadas por puntos, sin empates en 4,60.

## Publicación (30/10)

El código se sacó del repo privado de configuración del servidor y se publicó acá, para trabajarlo con Santi. Se dejó afuera todo lo que no es el recolector y lo que identifica al servidor: IPs, IDs de credenciales, el chat de Telegram y la API key de n8n, que ahora se pasa por variables de entorno.
