# Cómo funciona hoy: recolección, puntaje y resumen

Estado al 30/10/2026. Lo armamos para revisarlo juntos. Las partes 1 y 2 salen del código de este repo. La parte 3 vive en el repo privado del servidor y se copió de lo que está desplegado en skynet (`preparar_resumen`, `candidatas`, `periodo_automatico`, `guardar_resumen`, la vista `noticias_todas` y el workflow `Noticias · Resúmenes`).

```
22:00 todos los días                                     lun y jue 07:30
──────────────────────────────────────────────           ─────────────────────────────────────────
Fuentes ─> Bajar ─> Parsear ─> tech_ingresar ─> tech_noticias ─> tech_ranking ─> noticias_todas
(6 URLs)   (1/30s)  (JS)       tech_refrescar                    (puntaje)       (puntaje_base)
                                                                                      │
                                                         candidatas (top 15) <────────┘
                                                                │
                                                     preparar_resumen ─> OpenRouter ─> guardar_resumen ─> Telegram
```

## 1. Qué recolectamos

Código: `n8n/nodos/fuentes.js` y `n8n/nodos/parsear.js`.

| Fuente | API / URL | Qué trae | Cupo de nuevas por día |
|---|---|---|---|
| Hacker News | Algolia: `hn.algolia.com/api/v1/search?tags=story`, últimas 24 h, más de 30 puntos, hasta 50 | puntos, comentarios, fecha | 5 |
| Lobsters | `lobste.rs/hottest.json` (unas 25 de las últimas ~40 h) | `score`, comentarios, tags, descripción | 5 |
| r/technology | RSS `top/.rss?t=day&limit=10` | **sin puntos**: solo el orden y el texto del post | 2 |
| r/programming | igual | igual | 2 |
| r/artificial | igual | igual | 1 |
| `hn·refresco` | Algolia, últimas 72 h, hasta 1000 | no agrega noticias, solo actualiza puntos y comentarios | - |

- Reddit va por RSS porque el `.json` devuelve 403. El RSS no trae votos.
- Las URLs se bajan de a una cada 30 s para que Reddit no devuelva 429.
- Dev.to se dejó de recolectar el 28/10. Las noticias viejas que quedaron se van solas a los 30 días.

### Parseo

`parsear.js`, sin IA:

- Ordena cada fuente de la más votada a la menos. En Reddit queda el orden del RSS, que ya viene por votos.
- Se queda con hasta 10 candidatas por fuente y les pone `posicion` (1 = la más votada).
- Normaliza los links: saca `http`, `www`, `utm_*`, `ref`, `source`, `fbclid`, `gclid`, el `#` y la barra final.
- Descarta lo que no es noticia:
  - "Ask HN", "Tell HN" y los avisos de empleo,
  - posts de Reddit o Lobsters sin link externo,
  - los tags `meta`, `event` y `ask` de Lobsters.

### Ingreso y repetidas

`tech_ingresar` y `tech_refrescar`, en `sql/01-esquema.sql`.

- **Repetidas.** Una noticia es la misma que otra si tiene el mismo link (`tech_links`) o un título parecido en un 55 % o más (trigram) a otra vista en las últimas 72 h.
  - Si es repetida, se une con la guardada: suma la fuente, se queda con el máximo de `puntos`, la mejor `posicion` y una corrida más.
- **Cupo.** Solo las noticias nuevas gastan cupo. Se recorre cada fuente en orden de votos y entran las primeras hasta llenarlo.
- **Refresco.** `tech_refrescar` sube puntos y comentarios solo de las noticias que **ya tienen esa fuente**, para no mezclar escalas.
- **Borrado.** Se borran las noticias de más de 30 días que no están marcadas como `elegida`.

## 2. Cómo calculamos el puntaje

Vista `tech_ranking`. No usa IA.

```
puntaje = lugar + varias + persistencia + antigüedad
```

| Componente | Cálculo | Rango |
|---|---|---|
| **lugar** | Si la noticia está en HN: `5 × percent_rank(puntos)` entre todas las de HN guardadas. Si no, y está en Lobsters: `4 × percent_rank(puntos)` entre las de Lobsters. Dev.to (solo las viejas): igual que Lobsters. Solo Reddit: `3,5 - 0,5 × min(posición, 7)` | HN 0 a 5, Lobsters 0 a 4, Reddit 0 a 3 |
| **varias** | `+2 × (cantidad de fuentes - 1)` | 0, 2, 4... |
| **persistencia** | `+0,5 × min(corridas - 1, 3)` | 0 a 1,5 |
| **antigüedad** | `-0,3 × días desde que se publicó` (o desde que la vimos, si no hay fecha) | negativo |

Detalles:

- Para calcular el percentil, la noticia cuenta en una sola fuente, con esta prioridad: HN, después Lobsters, después Dev.to. Una noticia que está en HN y en Reddit se mide como HN.
- El percentil se calcula contra **toda la base** (30 días más las `elegida`), no contra las del período del resumen.
- Reddit 1º = 3, 2º = 2,5, 3º = 2, ... y del 7º para abajo = 0.

## 3. Cómo se arma el resumen

Vive en skynet, fuera de este repo.

### 3.1 Disparo

`Noticias · Envío` (lunes y jueves a las 07:30) llama a `Noticias · Resúmenes` con la categoría `tech` y el tipo `automatico`. El panel web también puede pedir un resumen: es el tipo `pedido`, de las últimas 24 h por defecto.

### 3.2 La vista `noticias_todas`

Junta las noticias generales con las tech. Para tech:

```sql
round(t.puntaje - t.antiguedad, 2) AS puntaje_base,   -- se le saca la antigüedad
cardinality(n.fuentes)             AS relevancia,
n.puntos                           AS puntos,
n.dominio                          AS fuente
```

**El resumen no usa el descuento por antigüedad.** Lo reciente lo garantiza la ventana de tiempo del paso siguiente.

### 3.3 Período

`periodo_automatico('tech')`:

- **desde**: cuándo terminó el último resumen automático de tech. Si no hay ninguno, hace 4 días. Nunca más de 7 días atrás.
- **hasta**: ahora.

### 3.4 Elección de las 15 (`candidatas`)

```sql
SELECT t.* FROM noticias_todas t
 WHERE t.categoria = 'tech'
   AND t.primera_vez >= desde AND t.primera_vez < hasta
   AND NOT (automatico AND ya salió en un resumen automático de tech)
 ORDER BY t.puntaje_base DESC NULLS LAST,
          t.puntos       DESC NULLS LAST,
          t.relevancia   DESC,
          t.primera_vez  DESC
 LIMIT 15
```

El filtro es por `primera_vez`, el momento en que la guardamos, no por la fecha de publicación.

### 3.5 Lo que se le manda a la IA (`preparar_resumen`)

Una lista numerada, en el orden del ranking:

```
1. <título> — <dominio>: <descripción, hasta 220 caracteres>
2. ...
```

- **El puntaje no se le pasa a la IA.** Solo decide cuáles 15 entran y en qué orden aparecen.
- HN no trae descripción cuando la noticia tiene link, así que esas entradas van solo con título y dominio.

Pedido a OpenRouter (`openai/gpt-6-luna`, temperature 0.2, reasoning low, respuesta en JSON). El prompt de sistema, resumido:

> Sos el editor de un diario. Te paso las noticias más importantes sobre tecnología (IA, programación, hardware, gaming; están en inglés) de los últimos N días. Escribí en español rioplatense neutro un solo párrafo de 5 a 8 líneas (máximo 130 palabras) que cuente lo más importante, agrupando lo relacionado. Usá solo lo que dicen títulos y descripciones; no inventes; respetá quién dice o hace qué; sin interpretaciones propias; sin markdown. Respondé `{"parrafo": "..."}`.

### 3.6 Guardado

`guardar_resumen` guarda el párrafo en `resumenes` y los ids de las 15 noticias, en orden, en `resumen_noticias`. Después se manda por Telegram.

## 4. Puntos para discutir

1. **Escalas distintas entre fuentes.** Reddit llega como máximo a 3 de `lugar`, Lobsters a 4 y HN a 5. La 1ª de r/technology queda debajo de cualquier noticia de HN que esté en el 60 % de arriba. ¿Lo queremos así?
2. **Reddit no tiene puntos.** Su `lugar` sale del puesto en el top del día, no de cuánta gente la votó.
3. **El percentil se calcula contra 30 días**, no contra el período del resumen. Si una semana HN viene floja, todas sus noticias tienen percentiles bajos.
4. **Al resumen no le importa la antigüedad**: dentro de la ventana de 3 o 4 días, una noticia del primer día pesa igual que una de ayer.
5. **La IA no ve el puntaje.** Recibe las 15 ordenadas, pero puede contar en el párrafo cualquiera de ellas, sin darle más peso a las primeras.
6. **`guardar_resumen` no marca `elegida`.** Lo hacía `tech_guardar_edicion`, del flujo viejo. Las 40 `elegida` actuales son de ese flujo. Las noticias que salen en los resúmenes nuevos se borran a los 30 días como cualquier otra. Falta revisar qué le pasa entonces a `resumen_noticias`: si se borra en cascada o si el borrado falla.
7. **Uniones entre fuentes y `puntos`.** Cuando una noticia de Lobsters se une con una de HN, `tech_ingresar` guarda el máximo de los dos `puntos`, aunque son escalas distintas. Después el percentil la mide como HN.
