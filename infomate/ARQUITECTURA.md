# Infomate: arquitectura

Paso 1 del [plan](PLAN.md). Define las piezas, los nodos del workflow, la base, el contrato del juez y las carpetas. El dibujo también está en el documento de diseño.

## Piezas

```
                    ┌──────────── Infomate · Diario (n8n, 08:00) ───────────┐
 Fuentes ──────────>│ 1. Recolectar y unir repetidas                        │      ┌─── Postgres: base infomate ───┐
 RSS de medios      │ 2. Guardar hasta 100 por categoría ───────────────────┼─────>│ noticias = global | arg | tech │
 Google News        │ 3. Elegir candidatas                                  │      │                                │
 HN, Lobsters,      │ 4. Bajar texto (2000 caracteres)                      │      │                                │
 Reddit             │ 5. Juez: título, resumen, puntaje <──> OpenRouter     │      │                                │
                    │ 6. Armar edición: 5 por categoría ────────────────────┼─────>│ diaria (15 por día) ──> edicion()│
                    └──────────────────────┬────────────────────────────────┘      └────────────────────────────────┘
                                           └── si falla ──> Telegram
```

Todo pasa dentro de un solo workflow. Solo sale hacia afuera en el paso 5, para hablar con OpenRouter, y hacia Telegram si algo falla. El módulo viejo sigue igual y no comparte nada con Infomate: ni tablas, ni workflows, ni credenciales.

## Nodos de `Infomate · Diario`

Es un solo workflow, sin subflujos. Los nodos van en línea recta, así que un subflujo no aporta nada.

| # | Nodo | Tipo | Qué hace | Origen |
|---|---|---|---|---|
| 1 | Todos los días 08:00 / Probar a mano | Schedule + Manual | Arranca la corrida | nuevo |
| 2 | Fuentes | Code (`fuentes.js`) | Lista de feeds, cada uno con su `categoria` (`global`, `arg` o `tech`) y su `origen` (`rss`, `gnews`, `portada`, `hn`, `reddit`...) | se arma desde las fuentes de hoy |
| 3 | Bajar fuentes | HTTP Request | Baja cada feed. Reddit va espaciado porque devuelve 429 | igual al de hoy |
| 4 | Parsear | Code (`parsear.js`) | Normaliza cada ítem: `titulo_original`, `link`, `descripcion_fuente`, `fecha_publicacion`, `posicion`, `fuente`, `puntos`, `comentarios`. Descarta lo publicado hace más de 24 h | se arma desde los parsers de hoy |
| 5 | Guardar sin repetidas | Postgres: `infomate_ingresar(items, corrida)` | Une las repetidas (link y parecido de títulos), suma `medios` y `portada`, calcula `puntaje_previo` y deja hasta 200 por categoría | nuevo |
| 6 | Candidatas | Postgres: `infomate_candidatas(corrida)` | Las 15 primeras por `puntaje_previo` de cada categoría, sin las que salieron en `diaria` los últimos 7 días. Son 15 y no 10 por las que se quedan sin texto | nuevo |
| 7 | Bajar texto | HTTP Request + Code (`texto.js`) | Resuelve el link de Google News al del medio, baja la nota, extrae el texto y lo recorta a 2000 caracteres (`contenido`) | nuevo |
| 8 | Quedarse con 10 | Code | Las primeras 10 con texto de cada categoría; las marca `candidata` | nuevo |
| 9 | Juez | HTTP Request a OpenRouter | Una llamada por noticia con el prompt de su categoría (ver Contrato del juez) | nuevo |
| 10 | Validar | Code (`validar.js`) | Revisa el JSON del juez. Si es inválido, repite la llamada una vez | nuevo |
| 11 | Guardar juicio | Postgres: `infomate_juzgar(items)` | Guarda `titulo`, `resumen`, `puntaje`, `motivo` y `juzgada` | nuevo |
| 12 | Armar edición | Postgres: `infomate_armar_edicion(fecha)` | Borra la edición del día si existe y carga las 5 de mayor `puntaje` por categoría (desempata `puntaje_previo`) | nuevo |
| 13 | Limpiar y cerrar | Postgres: `infomate_limpiar()` | Borra lo recolectado hace más de 7 días que no salió en `diaria` y guarda los conteos en `corridas` | nuevo |

**Errores:** un workflow aparte, `Infomate · Error`, configurado como workflow de error de `Infomate · Diario`, manda por Telegram el nodo que falló y el mensaje.

**Correr dos veces el mismo día:** no duplica nada. El ingreso une por link, el juez vuelve a puntuar solo las que no tienen `juzgada`, y armar la edición reemplaza la del día.

**Día flojo:** si una categoría tiene menos de 10 candidatas con texto, se juzgan las que haya y la edición sale con menos de 5. No se rellena con noticias de días anteriores.

**Juez que falla dos veces:** esa noticia queda sin `puntaje` y no entra en la edición. Con 10 juzgadas para elegir 5, perder una no deja la categoría corta.

## Base `infomate`

Esquema en [`sql/01-esquema.sql`](sql/01-esquema.sql). Se prueba con `sql/probar.sh`, que lo levanta en un Postgres descartable y corre [`sql/prueba.sql`](sql/prueba.sql).

- **`noticias`:** particionada por categoría. Las particiones `global`, `arg` y `tech` son las tablas por categoría que pediste, y `noticias` permite consultarlas juntas. Lo recolectado se guarda 7 días; lo que salió en `diaria` se guarda siempre.
- **`diaria`:** 5 por categoría y por día (`orden` de 1 a 5). Nunca se borra. La clave foránea impide cargar una noticia en una categoría que no es la suya.
- **`corridas`:** una fila por ejecución, con sus conteos.
- **`diaria_json` y `edicion(fecha)`:** devuelven la edición de un día como array JSON con el formato de la app, ordenada por puntaje.
- **Límites que pone la base:** `resumen` de 1000 caracteres como máximo (al juez se le piden 450; 1000 es la red), `contenido` de 2000 como máximo, `puntaje` de 0 a 100 y un mismo link una sola vez por categoría.

Funciones que usa el workflow. Se escriben en el paso de cada una:

| Función | Devuelve | Paso |
|---|---|---|
| `infomate_ingresar(items jsonb, corrida text)` | jsonb con conteos: recibidas, nuevas, unidas, descartadas por categoría | 4 |
| `infomate_candidatas(corrida text)` | filas `(id, categoria, titulo_original, link, link_google, fuente, fecha_publicacion)`, 15 por categoría | 6 |
| `infomate_juzgar(items jsonb)` | cantidad de noticias actualizadas | 8 |
| `infomate_armar_edicion(dia date)` | jsonb con cuántas quedaron por categoría | 8 |
| `infomate_limpiar()` | cantidad de noticias borradas | 4 |

La fórmula de `puntaje_previo` se define en el paso 6, con los datos del relevamiento.

## Contrato del juez

**Llamada:** una por noticia, al endpoint de chat de OpenRouter, con `response_format` de tipo `json_schema` estricto, `provider.require_parameters: true` y `reasoning.effort: "low"`. Sin `temperature`: Haiku y Luna no la aceptan.

**Modelo por juez (elegidos en el paso 7 con una prueba a ciegas):** global y ARG con `openai/gpt-6-luna`, tech con `anthropic/claude-haiku-5.5`.

**Entrada (mensaje del usuario):**

```
Título: <titulo_original>
Fuente: <fuente>
Publicada: <fecha_publicacion>
Texto:
<contenido de la nota: hasta 2000 caracteres, lo que guarda la base>
```

**Salida, en este orden:**

```json
{"titulo_es": "...", "resumen": "...", "puntaje": 0, "motivo": "..."}
```

**Validación (`validar.js`):**

- Es JSON y tiene las cuatro claves.
- `titulo_es` no está vacío y tiene 200 caracteres como máximo.
- `resumen` no está vacío. Al juez se le piden 450 caracteres; si se pasa, entra igual (sin repetir la llamada) hasta 1000.
- `puntaje` es un entero de 0 a 100.
- `motivo` tiene 200 caracteres como máximo.

Si algo no cumple, se repite la llamada una vez. Si vuelve a fallar, la noticia queda sin puntaje.

**Esqueleto del prompt de sistema.** Es igual para los tres jueces y cambia solo `<criterio>`. Los textos finales se escriben en el paso 8.

```
Sos editor de noticias de <categoría>. Leés una nota y devolvés solo un JSON.

1. titulo_es: el título en español rioplatense neutro, fiel al original.
2. resumen: hasta 450 caracteres, en español. Solo hechos que están en el texto; no inventes ni opines.
3. puntaje: de 0 a 100, según <criterio>, usando esta escala:
   90-100  hecho que va a ser tema central por días y afecta a muchísima gente
   70-89   importante, con consecuencias concretas para mucha gente
   40-69   interesante pero acotado
   0-39    menor, de nicho, de servicio o sin novedad
4. motivo: una línea que explica el puntaje.
```

Los criterios son:

- **Global:** impacto internacional.
- **Argentina:** impacto en la vida en Argentina.
- **Tech:** relevancia para alguien que trabaja en software.

## Carpetas y despliegue

```
infomate/
  README.md          diseño
  PLAN.md            plan por pasos
  ARQUITECTURA.md    este archivo
  sql/
    01-esquema.sql   tablas, vista y edicion()
    02-funciones.sql funciones del workflow (pasos 4, 6 y 8)
    prueba.sql       prueba del esquema
    probar.sh        corre la prueba en un Postgres descartable
  n8n/
    construir.py     crea o actualiza Infomate · Diario e Infomate · Error por la API de n8n
    nodos/           fuentes.js, parsear.js, texto.js, validar.js
  prompts/           juez-base.md (común, con {SECCION} y {CRITERIO}) y juez-global.md, juez-arg.md, juez-tech.md (el criterio de cada uno)
```

`construir.py` sigue el mismo esquema que `n8n/construir.py` y lee la configuración de variables de entorno, que no se commitean:

| Variable | Qué es |
|---|---|
| `N8N_API_URL`, `N8N_API_KEY` | API de n8n |
| `INFOMATE_PG_CRED_ID` | credencial Postgres de la base `infomate` |
| `INFOMATE_OR_CRED_ID` | credencial de la key nueva de OpenRouter |
| `INFOMATE_TG_CRED_ID`, `INFOMATE_TG_CHAT` | credencial y chat de Telegram para los avisos |
