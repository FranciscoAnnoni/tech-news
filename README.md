# tech-news

Recolector de noticias de tecnología. Corre en un servidor casero (skynet) con **n8n** y **Postgres**. No usa IA para recolectar ni para ordenar: la IA solo escribe el resumen final.

Todas las noches junta las noticias más votadas de Hacker News, Lobsters y tres subreddits, saca las repetidas, les pone un puntaje y las guarda. Con eso se arma un resumen que llega por Telegram los lunes y jueves, y también se ven en un panel web.

## Qué corre hoy en skynet (al 30/10/2026)

| Pieza | Estado |
|---|---|
| Workflow `Tech · Recolector` (n8n) | Activo. Corre todos los días a las 22:00 y termina a las ~22:03. Las corridas desde el cambio del 28/10 salieron todas bien. |
| Base `noticias` (Postgres) | 372 noticias tech, del 07/10 al 30/10. 40 están marcadas como `elegida` (salieron en un resumen). |
| Resumen por Telegram | `Noticias · Envío (lun y jue 07:30)` llama a `Noticias · Resúmenes` con la categoría `tech`. El último salió el jueves 29/10 a las 07:30. |
| Panel web | Pestaña Tecnología, en solo lectura, con un botón para pedir un resumen. |
| Workflows viejos | `Tech · Edición`, `Tech · Herramientas`, `Tech · Envío automático` y `Asistente · Especialista Tech` están **apagados**. Los reemplazó el resumen unificado. Su código no está en este repo. |

Noticias guardadas por fuente: hn 127, devto 110 (viejas, ya no se recolecta), r/programming 56, r/technology 56, r/artificial 27, lobsters 19 (entró el 28/10).

Últimas corridas (tabla `tech_corridas`):

| Corrida | Recibidas | Nuevas | Unidas | Fuera de cupo | Descartadas |
|---|---|---|---|---|---|
| 2026-10-30 22:03 | 45 | 15 | 5 | 25 | 0 |
| 2026-10-29 22:03 | 42 | 15 | 3 | 22 | 2 |
| 2026-10-28 22:03 | 40 | 15 | 3 | 21 | 1 |
| 2026-10-27 22:02 | 43 | 15 | 1 | 25 | 2 |

El código de este repo es el mismo que está desplegado: se comparó el 30/10 contra los nodos del workflow en n8n y contra las funciones y la vista en Postgres.

## Cómo funciona

```
22:00  Fuentes ──> Bajar fuentes ──> Parsear y limpiar ──> Guardar sin repetidas
       (6 URLs)    (1 cada 30 s)     (JS, sin IA)          tech_ingresar() + tech_refrescar()
                                                                  │
                                                                  v
                                                     tech_noticias  ──>  tech_ranking (puntaje)
                                                                  │
                          lun y jue 07:30: resumen con IA ──> Telegram
                          panel web: pestaña Tecnología
```

1. **`Fuentes`** (`n8n/nodos/fuentes.js`): arma las URLs con un cupo de noticias **nuevas** por día para cada una:
   - Hacker News (API de Algolia, últimas 24 h, más de 30 puntos): 5
   - Lobsters (`hottest.json`): 5
   - r/technology 2, r/programming 2, r/artificial 1 (por RSS, porque el `.json` de Reddit da 403)
   - `hn·refresco`: HN de las últimas 72 h. No agrega noticias, solo actualiza puntos y comentarios de las que ya están.
2. **`Bajar fuentes`**: baja de a una URL cada 30 s, para que Reddit no devuelva 429.
3. **`Parsear y limpiar`** (`n8n/nodos/parsear.js`): toma hasta 10 candidatas por fuente y normaliza los links (sin `utm_*`, `ref`, `fbclid`, `www`, `#` ni barra final). Descarta "Ask HN", "Tell HN", avisos de empleo, posts de Reddit o Lobsters sin link externo y las etiquetas `meta`, `event` y `ask` de Lobsters.
4. **`Guardar sin repetidas`** (`sql/01-esquema.sql`):
   - `tech_ingresar(items, corrida)` detecta repetidas por el mismo link (`tech_links`) o por un título parecido en un 55 % o más dentro de 72 h (`tech_titulos`, con trigram). Si es repetida, la une con la que ya estaba: suma la fuente, se queda con el máximo de puntos y la mejor posición, y cuenta una corrida más. Si es nueva, entra solo si a esa fuente le queda cupo. También borra las de más de 30 días que no son `elegida` y guarda las estadísticas en `tech_corridas`.
   - `tech_refrescar(items)` sube puntos y comentarios solo de las noticias que **ya tienen esa fuente**.

### Ranking (vista `tech_ranking`)

`puntaje = lugar + varias + persistencia + antigüedad`

| Componente | Cálculo |
|---|---|
| lugar | Percentil de los puntos dentro de su fuente: HN ×5, Lobsters ×4, Dev.to ×4 (solo las viejas). Reddit no trae puntos y va por puesto: 1º = 3, 2º = 2,5, y así. |
| varias | +2 por cada fuente extra que trae la misma noticia |
| persistencia | +0,5 por cada corrida en la que reaparece (máximo 3) |
| antigüedad | -0,3 por día desde que se publicó |

## Qué hay en el repo

| Archivo | Qué es |
|---|---|
| `sql/00-requisitos.sql` | Extensiones `pg_trgm` y `unaccent`, y la función `f_norm` (normaliza títulos). |
| `sql/01-esquema.sql` | Tablas `tech_*`, `tech_ingresar`, `tech_refrescar` y la vista `tech_ranking`. Idempotente. |
| `n8n/nodos/fuentes.js` | Código del nodo `Fuentes`. |
| `n8n/nodos/parsear.js` | Código del nodo `Parsear y limpiar`. |
| `n8n/construir.py` | Arma el workflow con esos nodos y lo sube a n8n por la API. Así el workflow se edita acá y no a mano en n8n. |
| `docs/historia.md` | Cómo llegamos a esto: el relevamiento del 26/10 y los arreglos del 28 y 29/10. |
| `docs/como-funciona-hoy.md` | Fuentes, puntaje y cómo se arma el resumen (incluye la parte que vive en skynet), con puntos para discutir. |
| `docs/flujos-n8n.md` | Qué workflows de n8n tocan las noticias tech, cuáles están activos y cuáles apagados. |
| `ejemplos/noticias.json` | 5 noticias de cada categoría (argentina, global, tech), las mejores de los últimos 3 días al 31/10, para prototipar una app. |

No están en este repo (viven en el repo privado de configuración del servidor): el workflow de resúmenes y su SQL (`preparar_resumen`, `guardar_resumen`, la vista `noticias_todas` que une tech con las noticias generales) y el panel web.

## Cómo aplicar cambios

Hace falta acceso al servidor, así que por ahora lo hace Fran. El resto se trabaja con PRs.

- **SQL** (idempotente):
  ```
  { echo "\set ON_ERROR_STOP 1"; echo "BEGIN;"; cat sql/00-requisitos.sql sql/01-esquema.sql; echo "COMMIT;"; } \
    | ssh skynet 'docker exec -i n8n-postgres-1 psql -U noticias -d noticias -q'
  ```
  `tech_ranking` se cambia con `CREATE OR REPLACE` y no con `DROP`, porque `noticias_todas` depende de ella: las columnas tienen que quedar iguales.
- **n8n**: con `N8N_API_URL`, `N8N_API_KEY` y `N8N_PG_CRED_ID` definidas, `python3 n8n/construir.py`. El id del workflow queda en `n8n/ids.json`, que no se versiona.
- **Probar sin hacer una corrida real** (una corrida real mete 15 noticias): correr el código de los nodos en Node con respuestas reales de las fuentes, y llamar a las funciones SQL dentro de `BEGIN; ... ROLLBACK;`.

## Pendientes

1. **Reddit no trae puntos.** El RSS no los incluye y el `.json` sin login da 403. La única salida es la API oficial con una app registrada: falta ver si Reddit hoy pide aprobación para apps nuevas. Mientras tanto, los 1º de cada subreddit empatan en 3,00.
2. **No se baja el texto de las notas.** Los resúmenes salen solo del título y la descripción.
3. **Pesos del ranking** (HN 5, Lobsters 4, Reddit 3, varias +2, persistencia +0,5): revisarlos después de un par de semanas de resúmenes.
4. **Las repetidas casi nunca se unen** (de 1 a 5 por corrida), porque las fuentes rara vez traen la misma noticia. El bonus "varias" casi no suma.
5. **Lobsters** solo tiene `hottest.json` (unas 25 de las últimas ~40 h; `top/1d.json` da 404). Los títulos que normalizados quedan con menos de 10 caracteres se descartan, por ejemplo "AlpineBSD".
6. **Retención:** desde el ~06/11 se empiezan a borrar las de más de 30 días que no son `elegida`. Las de Dev.to viejas se van hacia el 27/11.
7. **Limpieza:** la tabla `tech_ediciones` y los workflows viejos apagados siguen en el servidor. Se podrían borrar.
