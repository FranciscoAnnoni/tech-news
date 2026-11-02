# Infomate: recolector diario de noticias

Diseño acordado el 02/11/2026. Es la fuente para planear y construir. El plan por pasos está en [PLAN.md](PLAN.md).

## Objetivo

Todos los días a las 08:00 una corrida junta noticias de tres categorías: global, Argentina y tecnología. Un juez IA resume y puntúa las 10 mejores candidatas de cada categoría, y las 5 con mayor puntaje de cada una quedan en la tabla del día. A las 09:00 se pueden consultar. Más adelante esa tabla alimenta la app **Infomate**.

## Decisiones

| Tema | Decisión |
|---|---|
| Dónde corre | Un workflow nuevo de n8n, `Infomate · Diario`. Copia y adapta el recolector actual; el viejo no se toca |
| Horario | 08:00 (America/Argentina/Buenos_Aires), una vez por día, con lo publicado en las últimas 24 h |
| Base | Base nueva `infomate` en el Postgres actual de n8n, con usuario propio que solo ve esa base |
| Volumen | Hasta 100 noticias por categoría y por día, después de unir las repetidas, ordenadas por un puntaje previo sin IA |
| Candidatas | Las 10 primeras de cada categoría por puntaje previo, con texto y sin haber salido en los últimos 7 días |
| Juez | Una llamada por noticia (30 por día). Lee título y texto y devuelve, en este orden: `titulo_es`, `resumen` (500 caracteres como máximo), `puntaje` (0 a 100) y `motivo` |
| Criterio por categoría | Global: impacto internacional. Argentina: impacto en la vida en Argentina. Tech: relevancia para quien trabaja en software |
| Elección | Un script ordena por puntaje del juez (desempata el puntaje previo) y toma las 5 primeras de cada categoría |
| Traducción | Título y resumen en español. El contenido de 2000 caracteres queda en el idioma original |
| Modelo | Candidato `openai/gpt-6-luna`, que se confirma en el paso 7. Key nueva de otra cuenta de OpenRouter, en una credencial aparte y con tope de gasto |
| Fuentes | Las mismas de hoy para arrancar. Se revisan global y ARG con datos reales |
| Código | En esta carpeta del repo (nodos JS, SQL y un script que sube el workflow). Credenciales solo en n8n. Datos de skynet (IPs, IDs) fuera del repo |
| Convivencia | El recolector viejo sigue alimentando Telegram, el panel y el asistente hasta el corte. En el corte se borra todo el módulo viejo |

## Tablas

| Tabla | Qué guarda | Se borra |
|---|---|---|
| `diaria` | Las 15 elegidas de cada día (5 por categoría), con `fecha_edicion` y `orden` | Nunca |
| `global`, `arg`, `tech` | Todo lo recolectado de esa categoría, con su puntaje previo. Las 10 juzgadas llevan además el resultado del juez | Nunca |

## Formato de una noticia (JSON de la app)

Una vista de la base arma el JSON del día. El endpoint para la app viene después.

```json
{
  "id": "uuid, para compartir",
  "titulo": "traducido al español por el juez",
  "titulo_original": "como lo publicó el medio",
  "descripcion": "resumen del juez, 500 caracteres como máximo",
  "contenido": "primeros 2000 caracteres de la nota, en su idioma",
  "categoria": "global | arg | tech",
  "link": "link directo al medio (nunca el de Google News)",
  "fuente": "el medio (BBC Mundo) o el agregador (HN)",
  "fecha_publicacion": "DD/MM/AAAA HH:MM",
  "puntaje": 87
}
```

## Fuera de alcance por ahora

- Supabase y el endpoint JSON para la app.
- El corte del lado que lee (Telegram, panel, asistente) y el borrado del módulo viejo.
