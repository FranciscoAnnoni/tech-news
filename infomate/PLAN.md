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
| 5 | Fuentes global y ARG | Ajustes a `fuentes.js` según los pasos 2 y 4: sumar sociedad y deportes a ARG, decidir qué hacer con Google News, revisar El País Europa, BBC Mundo y France 24 | Francisco revisa una corrida y está de acuerdo con lo que entra |
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
