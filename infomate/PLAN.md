# Infomate: plan por pasos

**Objetivo:** un workflow de n8n que todos los días a las 08:00 deja en la base `infomate` las 15 noticias del día (5 globales, 5 de Argentina y 5 de tecnología), resumidas y puntuadas por un juez IA.

**Diseño:** [README.md](README.md). El plan se apoya en ese documento y hay que leer los dos.

**Stack:** n8n 2.41.3 (nodos Code en JavaScript, HTTP Request, Postgres), Postgres 17, OpenRouter, Python 3 para el script que sube el workflow (mismo esquema que `n8n/construir.py`).

## Cómo retomar (estado al 02/11/2026)

- **Pasos 1 a 6: hechos y aprobados.** El workflow `Infomate · Diario` (id `infomateDiario01`) está en el n8n de skynet, sin horario: recolecta, guarda sin repetidas, preselecciona, decodifica Google News, baja el texto y marca 10 candidatas por categoría.
- **Paso 7: modelos elegidos** (detalle abajo). Sigue el paso 8: el juez en el flujo. La credencial de OpenRouter: `infomate`, tipo nativo `openRouterApi` (no Header Auth), con tope de USD 10 en total. Su id está en `n8n/ids.json` como `or_cred` y `construir.py` la expone como `OR`. La key nunca pasa por el chat, el repo ni archivos locales.
- **Rama:** `infomate/plan` (commits locales, sin push).
- **Pruebas:** `node n8n/probar-parser.mjs`, `node n8n/probar-texto.mjs` y `sql/probar.sh` (necesita Docker en la Mac).
- **Desplegar:** aplicar `sql/02-funciones.sql` y `sql/03-preseleccion.sql` con `psql -U infomate -d infomate` dentro de `n8n-postgres-1`, y subir el workflow con `python3 -I n8n/construir.py | ssh skynet 'docker exec -i n8n-n8n-1 sh -c "cat > /tmp/infomate.json && n8n import:workflow --input=/tmp/infomate.json; rm -f /tmp/infomate.json"'`.
- **Correr a mano:** `ssh skynet 'docker exec -e N8N_RUNNERS_BROKER_PORT=5699 n8n-n8n-1 n8n execute --id=infomateDiario01 --rawOutput'` (el puerto distinto evita chocar con la instancia que ya corre). El resumen queda en la tabla `corridas`.
- **Locales, fuera de git:** `n8n/.env` (contraseña de la base) e `n8n/ids.json` (id de la credencial Postgres).

### Credencial de OpenRouter (la crea Francisco)

En n8n: Credentials, New, **Header Auth**. Nombre de la credencial: `OpenRouter Infomate`. Name: `Authorization`. Value: `Bearer <key nueva>`. Guardar. En la cuenta de OpenRouter, poner un tope de gasto mensual a la key. Después alcanza con avisar que está creada: el workflow la referencia por nombre y su id se busca en n8n sin leer el secreto.

## Sesgos conocidos en global (pendiente, anotado el 02/11/2026)

Decisión de Francisco: ningún país tiene trato especial. Se sacaron el tope propio de 2 de EE.UU. y los lugares asegurados de todos los países (EE.UU., China, Rusia, Reino Unido y Brasil). La preselección queda: prioritarias primero y después por puntaje previo, con 4 por feed como máximo. La columna `asegurada` sigue en la base, siempre en false. Lo de abajo queda para más adelante:

- **La portada de global es la de Google News EE.UU.** Los +15 de portada solo pueden premiar noticias de EE.UU. (el 02/11, las 6 globales con portada eran de EE.UU.). Idea: contar en cuántas portadas de países distintos aparece (cuidado: comparar títulos entre idiomas no funciona con el parecido de texto actual).
- **Las fuentes de un solo medio no compiten.** La cobertura solo la trae Google News; Euronews, DW, La Nación EE.UU. y El País Europa llegan con 1 medio y no pasan de 42,5. El 02/11: Euronews 46 noticias y 0 en el top 50; DW 9 y 0. El País Europa publica poco y casi siempre queda fuera de las 24 h.
- **Los feeds de país (Brasil, Reino Unido) son portadas nacionales:** traen noticias locales (Fuvest, Lula y la Casa Civil), no globales. Idea: usar las secciones Mundo de varios países (España, Reino Unido, Francia, India).
- **El tope por feed no limita un país:** las noticias de EE.UU. entran también por Google News Mundo y BBC Mundo.
- **Nada mira región ni tema:** hay mucha política. Idea: que el juez devuelva región y tema, y que la elección de las 5 ponga topes (por ejemplo, 2 por región y 2 de política).

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
- Límites: `resumen` de 450 caracteres pedidos al juez (la base acepta hasta 1000), `contenido` de 2000 caracteres como máximo, hasta 200 noticias por categoría y por día, retención de 7 días (salvo lo publicado en `diaria`), 10 candidatas por categoría y 5 elegidas por categoría.

## Puntos de riesgo (revisar en cada paso que toque esto)

1. **Día con pocas noticias** (feriado, fuente caída): una categoría tiene menos de 10 candidatas con texto. Se juzgan las que haya y se eligen hasta 5, sin rellenar con noticias de días anteriores.
2. **El juez devuelve JSON roto o un resumen de más de 1000 caracteres:** se reintenta una vez; si vuelve a fallar, esa noticia queda sin puntaje y no entra en la edición.
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

**Estado:** hecho y aprobado el 02/11/2026. Corrida desde cero: 187 global, 159 ARG y 120 tech; 26 de 26 fuentes respondieron; 0 notas de servicio.

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

---

## Paso 6: Preselección y texto

**Estado:** hecho y aprobado el 02/11/2026. Corrida final desde cero: las 3 categorías con 10 candidatas. Con texto: ARG 15 de 15, global 14 de 15 (93 %) y tech 17 de 20 (85 %). Google News: 15 de 15 links decodificados.

Ajustes después de la revisión de Francisco:
- Tech preselecciona 20 (las demás 15); Google News EE.UU. con tope de 2 (sacado en el paso 7); entidades del portugués.
- Un lugar asegurado por país (sacado en el paso 7: EE.UU., China, Rusia, Reino Unido, Brasil): la mejor de las 3 primeras de su feed que se pueda leer. China y Rusia van por búsqueda (China en inglés sin medios pagos; Rusia en español desde la edición de EE.UU.); sin asegurar quedaban afuera porque traen 1 medio por noticia.
- Fuera columnas de opinión de Google News.
- Medios que no se pueden leer (Reuters, CNN en Español, The Telegraph, Ars Technica y los de muro de pago) se guardan pero no se preseleccionan. CNN bloquea solo al cliente HTTP de n8n (con curl y Python responde); un extractor aparte solo recuperaría CNN, por eso no se armó.
- Pendiente para el juez: ARG trae varias policiales y tragedias arriba; Francisco no quiere saturar con eso.

Cambios sobre lo planeado:
- Puntaje de 0 a 100 con peso por fuente (HN, Google News Mundo y Google News Argentina 1,0; Lobsters 0,8; Reddit 0,7; el resto 0,85) y prioridad: la n.º 1 de esos tres feeds vale 100, entra primera y queda candidata aunque no tenga texto (pedido de Francisco).
- El extractor lee, en orden: `articleBody` del JSON-LD, los `<p>` (sin menú, encabezado ni pie, primero dentro de `<article>`) y el texto de Arc XP embebido (Página 12).
- La bajada de notas pide HTML (`Accept`, `Accept-Language`): sin eso github.io no respondía.

Sin texto en tech: un sitio que no es nota (Show HN), un link a Reddit (bloqueado), Ars Technica (405 a bots) y blogs de GitHub Pages que el nodo HTTP de n8n no termina de bajar (con Node directo sí bajan). En global: CNN en Español (403 solo desde el nodo HTTP de n8n) y The Telegraph.

**Entregable:** el workflow elige 10 candidatas por categoría, variadas y con texto, y las marca `candidata`. Cubre los nodos 6, 7 y 8 de `ARQUITECTURA.md`. Sigue sin IA.

### Tarea 6.1: Puntaje previo nuevo

- [x] Guardar de qué feed vino cada noticia (`feed`, por ejemplo `Google News EE.UU.` o `Infobae deportes`). Hoy `fuente` guarda el medio y se pierde el feed.
- [x] Rehacer `infomate_puntaje_previo` con tres señales, todas normalizadas a 0-1 para que ninguna fuente gane solo por su forma:
    - **lugar en su feed**, como percentil: el 1.º de un feed de 25 vale lo mismo que el 1.º de uno de 100; en HN y Lobsters el orden ya es por votos;
    - **cobertura:** cantidad de medios, con tope de 6;
    - **portada** de Google News.
- [x] Prueba en `prueba-funciones.sql`: una noticia 1.ª en un feed chico no queda por debajo de la 10.ª de Google News solo por tener más medios.

### Tarea 6.2: Elegir las candidatas

- [x] `infomate_candidatas(corrida)`: las 15 mejores por puntaje previo de cada categoría, con estas reglas:
    - como máximo 4 por feed, para que ningún país o sección domine;
    - como máximo 3 de deportes en ARG;
    - sin las que salieron en `diaria` los últimos 7 días (por id o por título parecido);
    - si dos candidatas se parecen 35 % o más, queda la de mayor puntaje (atrapa las repetidas que se escapan, como Bariloche).
- [x] Prueba de cada regla en `prueba-funciones.sql`.

### Tarea 6.3: Link real y texto

- [x] Para las candidatas con link de Google News, decodificarlo en n8n: GET de la página, nodo Code que lee `data-n-a-sg` y `data-n-a-ts`, POST a `batchexecute` y nodo Code que saca el link. Si falla, la candidata queda sin texto.
- [x] Para las candidatas sin `contenido`, bajar la página y extraer el texto (`nodos/texto.js`): primero `articleBody` del JSON-LD que traen casi todos los medios y, si no hay, los párrafos `<p>` de 60 caracteres o más. Si quedan menos de 300 caracteres, no hay texto. Se guardan los primeros 2000.
- [x] Prueba: `probar-texto.mjs` con páginas de ejemplo (con JSON-LD, solo con `<p>` y con muro de pago).

### Tarea 6.4: Quedarse con 10

- [x] `infomate_guardar_texto(items)`: guarda link real, medio y `contenido`. Después marca `candidata` en las 10 primeras con texto de cada categoría.
- [x] Desplegar y correr a mano.

### Chequeo del paso 6

- El 80 % o más de las 15 candidatas de cada categoría sale con texto. Si no, se decide si hace falta un extractor aparte (por ejemplo, trafilatura en un contenedor).
- Francisco revisa las 30 candidatas (10 por categoría) con su fuente y el principio del texto.

## Paso 7: Modelo

**Estado:** modelos elegidos el 02/11/2026.

- Comparación: [relevamiento/modelos-juez.md](relevamiento/modelos-juez.md) (Claude Haiku 5.5, GPT-6 Luna y MiMo v2.6 Flash; GPT-6.1 Sol descartado por precio, unas 20 veces más caro).
- Prueba a ciegas: 3 candidatas por categoría x 3 modelos, con los prompts de `prompts/`. Las 27 respuestas salieron en el formato pedido; costo total menos de 1 centavo. Haiku y MiMo se pasaron de 500 caracteres en 4 de 9 resúmenes cada uno; Luna en ninguno.
- **Decisión de Francisco:** global y ARG con `openai/gpt-6-luna`; tech con `anthropic/claude-haiku-5.5`. MiMo quedó afuera (puntuó más generoso y su ficha declara solo inglés y chino).
- Al juez se le piden 450 caracteres de resumen; si se pasa, entra igual. La base subió su límite de 500 a 1000, solo como red.
- Parámetros: `json_schema` estricto, `provider.require_parameters`, `reasoning.effort: "low"`, sin `temperature`.
- Prompts: `prompts/juez-base.md` más el criterio de cada juez. ARG: las policiales y tragedias puntúan 0-39 salvo casos de alcance nacional, con el Estado involucrado, consecuencias más allá del hecho o gran escala.
- Traducir con Google lo que no está en español quedó como idea de Francisco. Con el juez devolviendo título y resumen en español, por ahora no hace falta.
