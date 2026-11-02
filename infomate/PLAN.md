# Infomate: plan por pasos

**Objetivo:** un workflow de n8n que todos los días a las 08:00 deja en la base `infomate` las 15 noticias del día (5 globales, 5 de Argentina y 5 de tecnología), resumidas y puntuadas por un juez IA.

**Diseño:** [README.md](README.md). El plan se apoya en ese documento y hay que leer los dos.

**Stack:** n8n 2.41.3 (nodos Code en JavaScript, HTTP Request, Postgres), Postgres 17, OpenRouter, Python 3 para el script que sube el workflow (mismo esquema que `n8n/construir.py`).

## Cómo se trabaja

Cada paso tiene cuatro tiempos:

1. **Plan corto:** las tareas del paso, escritas en este archivo.
2. **Aprobación de Francisco.**
3. **Ejecución.**
4. **Chequeo juntos:** se revisa el entregable contra el criterio de cierre.

No se arranca un paso sin cerrar el anterior. El detalle de cada paso se escribe al empezarlo, no antes, porque depende de lo que mostró el anterior.

## Reglas para todo el plan

- No se modifica nada del módulo viejo: workflows `Noticias · *` y `Tech · *`, la base `noticias` y la credencial `OpenRouter account`.
- No se commitean IPs, IDs de credenciales, API keys ni chat IDs. La configuración va por variables de entorno.
- Zona horaria: `America/Argentina/Buenos_Aires`.
- Nombres: base `infomate`, workflow `Infomate · Diario`, carpeta `infomate/`.
- Límites: `resumen` de 500 caracteres como máximo, `contenido` de 2000 caracteres como máximo, hasta 200 noticias por categoría y por día, retención de 7 días (salvo lo publicado en `diaria`), 10 candidatas por categoría y 5 elegidas por categoría.

## Puntos de riesgo (revisar en cada paso que toque esto)

1. **Día con pocas noticias** (feriado, fuente caída): una categoría tiene menos de 10 candidatas con texto. Se juzgan las que haya y se eligen hasta 5, sin rellenar con noticias de días anteriores.
2. **El juez devuelve JSON roto o un resumen de más de 500 caracteres:** se reintenta una vez; si vuelve a fallar, esa noticia queda sin puntaje y no entra en la edición.
3. **Misma noticia en dos categorías** (por ejemplo, una nota de economía global que también es ARG): queda en una sola, con la regla de categorías del paso 4.
4. **La corrida se ejecuta dos veces el mismo día** (a mano y por horario): no duplica la tabla diaria. Reemplaza la edición del día o no hace nada.
5. **Link de Google News:** nunca se guarda como `link`. Se resuelve al link del medio y, si no se puede, la noticia no es candidata.

## Pasos

| # | Paso | Entregable | Criterio de cierre |
|---|---|---|---|
| 1 | Arquitectura | `infomate/ARQUITECTURA.md` + el dibujo en el documento de diseño | Francisco aprueba piezas, nodos del workflow, esquema, contrato del juez y estructura de carpetas |
| 2 | Relevamiento | Informe con números reales: noticias por día de cada fuente, a qué hora publican, qué trae hoy global/ARG y qué falta | Sabemos si el tope alcanza (quedó en 200), si las 08:00 están bien y qué fuentes revisar |
| 3 | Infraestructura | Base `infomate` con usuario propio, esquema aplicado y credencial Postgres en n8n | n8n consulta la base con ese usuario, y ese usuario no ve la base `noticias` |
| 4 | Recolector | `Infomate · Diario` recolecta y guarda en las tablas por categoría, sin IA | Una corrida a mano deja hasta 200 por categoría, sin repetidas, con `link` directo y `fecha_publicacion` |
| 5 | Fuentes global y ARG | Ajustes a `fuentes.js` según los pasos 2 y 4: sumar sociedad y deportes a ARG, decidir qué hacer con Google News, sacar France 24, revisar El País Europa y BBC Mundo | Francisco revisa una corrida y está de acuerdo con lo que entra |
| 6 | Preselección y texto | Puntaje previo, las 10 candidatas por categoría y su texto | El 80 % o más de las candidatas sale con texto; si no, se decide si hace falta un extractor aparte |
| 7 | Modelo | Comparación de 2 o 3 modelos con las 30 candidatas de un día real: costo por día y calidad | Francisco elige el modelo y se crea la credencial nueva con tope de gasto |
| 8 | Jueces y tabla diaria | Los 3 prompts, el juez en el flujo, la elección de las 5, la tabla `diaria`, la vista JSON y el aviso por Telegram si falla | Una corrida completa deja 15 noticias con el formato de la app, y el horario de las 08:00 queda activado |
| 9 | Una semana en paralelo | Revisión diaria contra el módulo viejo | Francisco da el visto bueno para planear el corte |
| 10 | Después (otro plan) | Endpoint JSON, Supabase y corte del módulo viejo | - |

---

## Paso 1: Arquitectura

**Estado:** hecho el 02/11/2026. La prueba del esquema pasa (`sql/probar.sh`).

**Entregable:** `infomate/ARQUITECTURA.md`, `infomate/sql/` y el dibujo de las piezas en el documento de diseño. En este paso no se crea nada en skynet.

### Tarea 1.1: Piezas y flujo de datos

- [x] Dibujar las piezas: fuentes, `Infomate · Diario`, la base `infomate` (tablas por categoría y `diaria`), OpenRouter, la vista JSON y el aviso por Telegram. Mostrar también, aparte y sin conexión, el módulo viejo que sigue corriendo.
- [x] Ubicar el dibujo en la sección "Arquitectura" del documento de diseño y la versión en texto en `ARQUITECTURA.md`.

### Tarea 1.2: Nodos del workflow

- [x] Listar los nodos de `Infomate · Diario` en orden, con lo que entra y sale de cada uno. Marcar qué nodo se copia del recolector actual (`fuentes.js`, `parsear.js` de tech y global/ARG) y cuál es nuevo.
- [x] Decidir si es un workflow o un workflow más subflujos, y cómo se maneja el error: un workflow de error que avisa por Telegram.
- [x] Definir qué hace que una corrida sea repetible el mismo día (punto de riesgo 4).

### Tarea 1.3: Esquema de la base (borrador)

- [x] Escribir `infomate/sql/01-esquema.sql` con las tablas `global`, `arg`, `tech` y `diaria`, y probarlo en un Postgres descartable (`sql/probar.sh`). Se aplica en skynet en el paso 3.
- [x] Definir las funciones SQL que usa el workflow: ingresar con unión de repetidas, candidatas por categoría, guardar el resultado del juez y armar la edición del día. Solo firma y qué devuelve cada una.
- [x] Definir la vista que arma el JSON del día con el formato del README.

### Tarea 1.4: Contrato del juez

- [x] Fijar lo que recibe cada llamada: título, fuente, categoría y texto recortado a ~3000 caracteres.
- [x] Fijar lo que devuelve: JSON con `titulo_es`, `resumen`, `puntaje` y `motivo`, más las reglas de validación (largo, rango y reintento).
- [x] Armar el esqueleto del prompt con la escala por franjas. Los textos finales de los 3 jueces se escriben en el paso 8.

### Tarea 1.5: Carpetas y despliegue

- [x] Fijar la estructura de `infomate/`: `sql/`, `n8n/nodos/`, `n8n/construir.py`, con las variables de entorno que usa el script.

### Chequeo del paso 1

Francisco revisa `ARQUITECTURA.md` y el dibujo. Si aprueba, se commitea en la rama `infomate/plan` y se escribe el detalle del paso 2.

---

## Paso 2: Relevamiento

**Estado:** hecho y aprobado el 02/11/2026. A partir del informe, el tope pasó de 100 a 200 por categoría, con retención de 7 días.

**Entregable:** `infomate/relevamiento/INFORME.md` con números medidos directo en los feeds, sin tocar skynet ni la base vieja. Incluye el script que los mide (`relevamiento/medir.py`), así se puede volver a correr.

**Limitación:** una sola foto de los feeds muestra lo que cada feed tiene en ese momento. Los feeds que cubren menos de 24 h (France 24, Euronews) se miden por su ventana y se marca.

### Tarea 2.1: Script de medición

- [x] `relevamiento/medir.py`, solo con biblioteca estándar de Python. Baja las mismas fuentes de hoy: los 15 feeds de global/ARG y HN, Lobsters y los 3 subreddits de tech. Reddit va espaciado. Guarda la foto cruda en `relevamiento/datos/` (no se commitea).
- [x] Por feed: ítems, cuántos de las últimas 24 h, antigüedad del más viejo (ventana que cubre), si traen descripción, si traen texto completo (300 caracteres o más) y cuántos links son de Google News.
- [x] Por categoría: noticias distintas en 24 h después de unir repetidas por título parecido, y cuántas cubre más de un medio.
- [x] Horas de publicación (hora Argentina) de lo publicado en las últimas 48 h, por categoría.
- [x] Muestra de 5 links de Google News: ¿se pueden resolver al link del medio con un GET simple?

### Tarea 2.2: Informe

- [x] `relevamiento/INFORME.md` con las tablas y tres respuestas: si 100 por categoría alcanza o sobra, si las 08:00 con ventana de 24 h está bien, y qué fuentes de global y ARG conviene revisar en el paso 5.

### Chequeo del paso 2

Francisco revisa el informe. Si aprueba, se commitea y se escribe el detalle del paso 3.

---

## Paso 3: Infraestructura

**Estado:** hecho y aprobado el 02/11/2026.

- Respaldo: `n8n-backup` (03:30) solo vuelca la base de n8n. Decisión de Francisco: no se respaldan las bases, porque estarían en el mismo disco.
- El rol `infomate` puede conectarse a `postgres`, `entrenador`, `mails`, `instagram` y `tareas` (permiso por defecto de Postgres), pero no lee ninguna tabla. A `noticias` y `n8n` no puede entrar.

**Entregable:** la base `infomate` creada en el Postgres de skynet, con usuario propio y el esquema aplicado, y la credencial `Postgres infomate` cargada en n8n. Es el primer paso que toca skynet: solo agrega cosas, no modifica nada existente.

### Tarea 3.1: Base y usuario

- [x] `infomate/sql/00-crear-base.sql`: crea el rol `infomate` (LOGIN, la contraseña se pasa al correrlo y no se commitea) y la base `infomate`, cuyo dueño es ese rol.
- [x] Correrlo como superusuario dentro del contenedor de Postgres.
- [x] Verificar si el rol `infomate` puede conectarse a otras bases (por defecto Postgres deja conectarse a cualquiera, aunque sin permisos sobre las tablas). Si puede, se muestra qué roles usan cada base y se pide aprobación antes de quitarle a PUBLIC el permiso de conexión.

### Tarea 3.2: Esquema

- [x] Aplicar `01-esquema.sql` en `infomate` como el rol `infomate`. `pg_trgm` es una extensión confiable desde Postgres 13, así que el dueño de la base puede crearla.
- [x] Correr `prueba.sql` dentro de una transacción que se deshace (ROLLBACK), para que no queden datos de prueba.

### Tarea 3.3: Credencial en n8n

- [x] Crear la credencial `Postgres infomate` por la API de n8n, con host, base, usuario y contraseña tomados de variables de entorno. Su ID se guarda solo en local, en `infomate/n8n/ids.json`, que no se versiona.

### Tarea 3.4: Respaldo

- [x] Revisar si skynet tiene un respaldo de Postgres y si incluye las bases nuevas automáticamente. Si no hay respaldo o no la incluye, se anota para decidir juntos. No se arma nada nuevo en este paso.

### Chequeo del paso 3

- `SELECT edicion(current_date)` como `infomate` devuelve `[]`.
- Un workflow descartable en n8n hace la misma consulta con la credencial nueva y obtiene `[]`; después se borra.
- El rol `infomate` no puede leer la base `noticias`.

---

## Paso 4: Recolector

**Estado:** hecho y aprobado el 02/11/2026. Dos corridas a mano: la primera dejó 132 global, 70 ARG y 121 tech; la segunda no duplicó (0 nuevas en tech, 1 en global, 17 en ARG por La Nación Política, que en la primera falló por DNS).

Para los pasos 5 y 6:
- Repetidas que se escapan: pares reales con 39-49 % de parecido (Flock, Lenovo, Mythos, Ruta 51, Bariloche). Bajar el umbral a ~40 % une también notas de servicio distintas (ANSES), que conviene filtrar antes.
- Notas de servicio en ARG: calendario ANSES, dólar hoy, clima local.
- Global arriba está dominado por política interna de EE.UU. (Google News EE.UU. y medios hispanos de EE.UU.).
- ARG trae noticias locales de provincias vía Google News (Gualeguaychú, Quitilipi).
- Tech queda dominado por HN, porque Reddit y Lobsters casi no aportan votos al puntaje provisorio.
- 69 de 133 global y 34 de 87 ARG tienen solo link de Google News.

**Entregable:** el workflow `Infomate · Diario` en n8n, que recolecta y guarda en las tablas por categoría, todavía sin IA y sin horario (solo se corre a mano). Cubre los nodos 1 a 5 y 13 de `ARQUITECTURA.md`.

**Despliegue sin API key:** `construir.py` arma el JSON del workflow y lo sube por SSH con `n8n import:workflow`. Las corridas de prueba se hacen con `n8n execute`, igual que en el paso 3.

### Tarea 4.1: Fuentes y parser

- [x] `n8n/nodos/fuentes.js`: las fuentes de hoy menos France 24, cada una con `categoria` y `origen`. Global: Google News Mundo y EE.UU., BBC Mundo, DW, La Nación EE.UU., El País Europa y Euronews. ARG: Google News Argentina, Infobae y La Nación (política y economía). Tech: HN (10 puntos o más), Lobsters y los 3 subreddits. Portadas de Google News AR y EE.UU. Sociedad y deportes de ARG entran en el paso 5.
- [x] `n8n/nodos/parsear.js`: un solo parser para RSS, Atom, HN y Lobsters. Devuelve por ítem `categoria`, `fuente`, `titulo_original`, `link`, `link_google`, `descripcion_fuente`, `contenido` (si el feed trae 300 caracteres o más, los primeros 2000), `fecha_publicacion`, `posicion`, `puntos`, `comentarios` y `medios`. Descarta lo de más de 24 h. Las portadas salen aparte: solo títulos.
- [x] Prueba: `n8n/probar-parser.mjs` corre el parser con Node sobre ejemplos guardados (un RSS, un Google News, HN, Lobsters y Reddit) y verifica los campos.

### Tarea 4.2: Ingreso en la base

- [x] `sql/02-funciones.sql`, con dos funciones:
    - `infomate_ingresar(items jsonb, portadas jsonb, corrida text)`:
        - Une las repetidas por link y, si no, por título parecido dentro de la misma categoría en las últimas 72 h. Al unir, suma `medios`, se queda con la mejor `posicion`, los puntos más altos y el texto más largo, y cambia un link de Google News por el del medio si aparece.
        - Si una noticia global ya está en ARG, queda solo en ARG.
        - Marca `portada`, calcula un `puntaje_previo` provisorio (se rehace en el paso 6) y deja como máximo 200 noticias nuevas por categoría por corrida.
    - `infomate_limpiar()`: borra lo de más de 7 días que no está en `diaria`.
- [x] Prueba: `sql/prueba-funciones.sql`, en el Postgres descartable de `probar.sh`. Verifica que:
    - un link repetido no duplica la noticia;
    - un título parecido se une y suma medios;
    - un link de Google News se reemplaza por el del medio cuando aparece;
    - una noticia que ya está en ARG no entra en global;
    - el tope de 200 se respeta;
    - la limpieza borra lo viejo y respeta `diaria`.

### Tarea 4.3: Workflow

- [x] `n8n/construir.py`, con estos nodos: Probar a mano, Fuentes, Bajar fuentes, Bajar Reddit, Parsear, Guardar sin repetidas, Limpiar y cerrar (fila en `corridas`).
    - `Bajar fuentes` y `Bajar Reddit` son dos nodos HTTP. El de Reddit espera 65 s entre pedidos.
    - Una fuente caída no corta la corrida: queda anotada en `corridas`.
- [x] Subirlo y correrlo a mano en skynet.

### Chequeo del paso 4

- La corrida termina bien y deja como máximo 200 noticias por categoría, sin repetidas y con `fecha_publicacion`.
- Los links son del medio, salvo los de Google News que no tienen par en un feed. Esos quedan marcados con `link_google` y se resuelven en el paso 5.
- Correrla dos veces seguidas no duplica nada.
- Francisco revisa un listado por categoría de lo que entró, ordenado por `puntaje_previo`.

---

## Paso 5: Fuentes

**Estado:** hecho el 02/11/2026, falta el chequeo de Francisco. Corrida desde cero: 187 global, 159 ARG y 120 tech; 26 de 26 fuentes respondieron; 0 notas de servicio.

Cambios sobre lo planeado:
- China, Reino Unido y Brasil van con la edición local de Google News (inglés y portugués), no con búsqueda en español, que traía ruido argentino ("China" Suárez, GP de Brasil). EE.UU. también quedó con tope 25.
- Deportes de Infobae y La Nación con tope 25 cada uno: sin tope eran 92 de 194 en ARG.
- Los pedidos reintentan hasta 2 veces cada 10 s: hubo cortes pasajeros (DNS en skynet, un 406 de Euronews).
- El umbral quedó en 42 %: con 38-40 % se unirían notas distintas de deportes. Quedan algunas repetidas reales en 39-40 % (Bariloche, Colapinto).
- Decodificación de Google News: 10 de 10 en 16 s (`relevamiento/decodificar-gn.py`).

Para el paso 6: arriba de global siguen notas de EE.UU., porque el puntaje provisorio premia a Google News (hasta 5 medios por noticia). 127 de 187 global tienen solo link de Google News.

**Entregable:** `fuentes.js` y `parsear.js` ajustados, desplegados y con una corrida a mano revisada. Decisiones de Francisco: global balanceado por países (EE.UU., China, Reino Unido y algún otro relevante); ARG con sociedad y deportes; Google News decodificado; no sumar APIs si no hace falta volumen.

### Tarea 5.1: Global por países

- [x] Sumar feeds de Google News en español por país, con búsqueda de las últimas 24 h (`q=<país> when:1d`): China, Reino Unido y Brasil (relevante para Argentina). EE.UU. sigue con su feed actual. Antes de sumarlos, verificar que cada feed responde y trae noticias del país.
- [x] Tope por feed de país: 25 noticias, para que ningún país domine. Google News Mundo y los medios (BBC, DW, El País, Euronews) siguen con el tope general de 100.

### Tarea 5.2: ARG con sociedad y deportes, sin notas de servicio

- [x] Sumar las secciones de sociedad y deportes de Infobae y La Nación. Antes, verificar que esos feeds existen y responden.
- [x] Filtro de notas de servicio en `parsear.js`: calendario de ANSES, cuánto cobro, dólar hoy, clima, horóscopo, lotería y quiniela. Se prueba en `probar-parser.mjs`.

### Tarea 5.3: Repetidas

- [x] Con las notas de servicio ya filtradas, bajar el umbral de títulos parecidos de 50 % a 42 % y volver a revisar los pares al borde con datos reales. Si aparecen uniones incorrectas, se vuelve a 50 %.

### Tarea 5.4: Google News decodificado

- [x] Probar el método no oficial (pedir la página del artículo, leer `data-n-a-sg` y `data-n-a-ts`, y hacer un POST a `batchexecute`) con un script sobre 10 links reales. Medir cuántos se resuelven y cuánto tarda.
- [x] Decisión de diseño: se decodifican solo las candidatas (unas 15 por categoría, en el paso 6), no las ~100 de Google News que entran por día. Son ~90 pedidos en vez de ~200, y se pierde poco: las repetidas con un feed de medio ya se unen por título.

### Tarea 5.5: APIs

- [x] No se suman APIs en este paso: un domingo ya entraron 133 global, 87 ARG y 121 tech. Se revisa si, después de sumar sociedad y deportes, ARG queda corto un día hábil.

### Chequeo del paso 5

Una corrida a mano con el workflow desplegado. Francisco revisa cuántas noticias entran por país y por sección, y las primeras de cada categoría.
