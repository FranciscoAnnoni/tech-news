# Relevamiento de fuentes (paso 2)

Foto tomada el lunes 02/11/2026 a la 01:30 (hora Argentina) con `medir.py`, directo de los feeds. Las últimas 24 h son casi todo domingo, así que los números de un día hábil van a ser más altos, sobre todo en ARG. Antes del paso 6 conviene repetir la medición un día hábil a las 08:00 (`python3 -I medir.py`).

## Respuestas

1. **El tope de 100 por categoría alcanza un domingo, y quedó en 200 para cubrir los días hábiles.** Recorta un poco a global (~154 noticias distintas en 24 h), no corta a ARG (~86) y en tech queda justo si se mantiene el filtro de HN de 30 puntos o más (~110).
2. **Las 08:00 con ventana de 24 h está bien.** ARG casi no publica entre las 02 y las 08, global publica parejo y tech tiene su pico entre las 10 y las 19 (mañana en EE.UU.). Una corrida a las 08:00 toma el día anterior completo. La única pérdida es France 24, cuyo feed cubre solo 14 h.
3. **Fuentes a revisar en el paso 5:** El País Europa, BBC Mundo, France 24 y el uso de Google News (detalle abajo).

## Volumen por fuente

| Categoría | Fuente | Ítems en el feed | Últimas 24 h | Ventana que cubre (h) | Texto completo en el feed |
|---|---|---|---|---|---|
| global | Google News Mundo | 64 | 36 | 121 | no |
| global | Google News EE.UU. | 70 | 39 | 144 | no |
| global | Euronews | 50 | 38 | 38 | no |
| global | France 24 | 24 | 24 | **14** | no |
| global | DW | 17 | 14 | 40 | no |
| global | La Nación EE.UU. | 16 | 8 | 48 | sí |
| global | BBC Mundo | 36 | **6** | 212 | no |
| global | El País Europa | 25 | **1** | 420 | sí |
| arg | Google News Argentina | 58 | 33 | 56 | no |
| arg | La Nación Economía | 58 | 25 | 61 | sí |
| arg | La Nación Política | 28 | 15 | 46 | sí |
| arg | Infobae Economía | 100 | 10 | 86 | sí |
| arg | Infobae Política | 100 | 7 | 111 | sí |
| tech | HN (todas las historias) | 766 | 766 | 24 | no |
| tech | r/technology | 25 | 25 | 18 | no |
| tech | Lobsters | 25 | 18 | 39 | no |
| tech | r/artificial | 15 | 15 | 22 | a veces (46 %) |
| tech | r/programming | 8 | 8 | 21 | no |

Las portadas de Google News (Argentina: 26 en 24 h; EE.UU.: 20) no crean noticias: solo marcan las que ya entraron.

**HN por puntos (24 h):** 766 historias en total, 73 con 10 puntos o más, 46 con 30 o más y 20 con 100 o más. Sin filtro, HN solo llenaría el tope de tech con ruido.

## Por categoría

| Categoría | Ítems en 24 h | Noticias distintas (aprox.) | En 2 o más fuentes | Distintas con texto en el feed |
|---|---|---|---|---|
| global | 166 | 154 | 9 | 9 |
| arg | 90 | 86 | 0 | 53 |
| tech | 832 (~110 con HN de 30+ puntos) | 795 | 13 | 7 |

"Distintas" une por título parecido. Revisé los casos al borde: casi todos son noticias diferentes sobre el mismo tema, aunque se cuela alguna repetida (por ejemplo, la elección de Bariloche en Google News y en Infobae). El número real es un poco menor.

## Hallazgos que cambian el diseño

1. **Los links de Google News no se resuelven con un GET simple.** En la muestra de 5, los 5 se quedaron en `news.google.com` y el HTML no trae el link del medio. Google News es el 45 % de lo que entra en global (75 de 166) y el 37 % en ARG (33 de 90). Hay dos caminos:
   - usar Google News solo como señal de cobertura y que las candidatas salgan de los feeds de medios;
   - decodificar sus links con un método no oficial, que se puede romper sin aviso.

   Se decide en el paso 5.
2. **Global casi no trae texto en el feed:** solo 9 de 154. BBC, France 24, DW y Euronews no lo traen, así que hay que bajarlo de la página (paso 6). ARG sí lo trae: Infobae y La Nación vienen con texto completo en el 100 % de los casos. Tech tampoco lo trae, porque linkea a sitios externos.
3. **La cobertura de Google News se satura.** Cada ítem lista como máximo 5 medios, y la mayoría llega a 5 (en Mundo, 26 de 36). Sirve para separar lo cubierto de lo no cubierto, pero no para ordenar entre las cubiertas. Además, entre feeds de medios casi no hay noticias repetidas (9 en global, 0 en ARG), así que el puntaje previo de global y ARG no puede apoyarse solo en "cuántos medios la cubren". Se define en el paso 6.
4. **Fuentes flojas:**
   - **El País Europa:** 1 noticia en 24 h. Su feed cubre 420 h, casi no se actualiza.
   - **BBC Mundo:** 6 noticias en 24 h.
   - **France 24:** cubre solo 14 h, así que a las 08:00 pierde lo de la mañana anterior. El módulo viejo lo resolvía corriendo 3 veces por día.
5. **Reddit:** con 35 s entre pedidos, r/programming devolvió 429. Con 65 s anduvo. El workflow necesita al menos un minuto entre pedidos a Reddit.
6. **ARG solo tiene política y economía** (Infobae y La Nación), más lo que agregue Google News. No hay sociedad, deportes ni policiales de fuentes propias. Si se quieren otros temas, se suma en el paso 5.

## Horas de publicación (hora Argentina, últimas 48 h)

| Franja | Global | ARG | Tech |
|---|---|---|---|
| 00-03 | 35 | 44 | 72 |
| 04-07 | 37 | 17 | 106 |
| 08-11 | 58 | 51 | 157 |
| 12-15 | 56 | 32 | 238 |
| 16-19 | 57 | 38 | 157 |
| 20-23 | 37 | 44 | 109 |

Tech cuenta todo HN, sin filtro de puntos.
