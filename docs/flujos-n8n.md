# Flujos de n8n que tocan las noticias tech

Estado al 31/10/2026. Se relevó en el n8n de skynet: nombre, si está activo, nodos y ejecuciones de los últimos 7 días.

## Resumen

Hoy hay **un solo flujo propio de tech**, `Tech · Recolector`. Todo lo demás son flujos de "Noticias" que se comparten con las categorías `global` y `argentina` y reciben `tech` como una categoría más.

```
Tech · Recolector (22:00, todos los días)
        │  escribe tech_noticias
        v
   tech_ranking ──> noticias_todas
                         │
                         v
              Noticias · Resúmenes  <──── Noticias · Envío (lun y jue 07:30) ──> Telegram
              (preparar + IA +      <──── Noticias · Resumen panel (botón del panel web)
               guardar)             <──── Asistente · Especialista Noticias (herramienta generar_resumen)

Asistente · Especialista Noticias ──> también lee tech directo (detalle_tech, últimas, buscar)
```

## Flujos activos

| Flujo | Cómo arranca | Qué hace con tech | Ejecuciones (24/10 a 30/10) |
|---|---|---|---|
| `Tech · Recolector` | Todos los días a las 22:00 (y a mano) | Junta HN, Lobsters y Reddit, y guarda sin repetidas. Ver `como-funciona-hoy.md`. | 7, todas bien |
| `Noticias · Resúmenes` | Lo llaman otros flujos | Para la categoría `tech`: `preparar_resumen`, IA en OpenRouter (`gpt-6-luna`), `guardar_resumen` | 7, todas bien (contando las tres categorías) |
| `Noticias · Envío (lun y jue 07:30)` | Cron `30 7 * * 1,4` | Llama a `Resúmenes` con `global`, `argentina` y `tech` (tipo `automatico`), arma el mensaje, lo manda por Telegram, marca `enviado` y lo guarda en el historial de chat (Redis) | 2, todas bien (último: 29/10 07:30) |
| `Noticias · Resumen panel` | Webhook del panel web | Llama a `Resúmenes` con la categoría que manda el panel, tipo `pedido` (últimas 24 h) | 1 (28/10) |
| `Asistente · Especialista Noticias` | Lo llama el router del asistente (Telegram y web) | Agente con `gpt-6-luna` (respaldo en Groq). Para tech tiene las herramientas `ultimas_noticias`, `buscar_noticias`, `detalle_tech`, `listar_resumenes`, `noticias_de_resumen` y `generar_resumen` (llama a `Resúmenes`) | 2 (24/10) |

### Notas

- `Noticias · Herramientas`, que baja el texto de una nota o busca más cobertura en Google News, solo trabaja con la tabla `noticias` (global y argentina). Para tech, el asistente usa `detalle_tech`, que lee `tech_noticias` y **no baja el texto**: devuelve el campo `texto`, que casi siempre está vacío.
- `Noticias · Recolector` es el recolector de las noticias generales, no el de tech.

## Flujos apagados

| Flujo | Qué hacía |
|---|---|
| `Tech · Edición` | Le pasaba a la IA las 30 mejores y elegía 10. Usaba `tech_preparar` y `tech_guardar_edicion`, y marcaba `elegida`. |
| `Tech · Herramientas` | Bajaba el texto de una nota tech a pedido. |
| `Tech · Envío automático (lun y jue 07:35)` | Mandaba la edición tech. |
| `Asistente · Especialista Tech` | Agente de Telegram solo para tech. |

Quedaron apagados desde el 10/10, cuando se unificó todo en `Noticias · Resúmenes`. Las funciones SQL que usaban (`tech_preparar`, `tech_guardar_edicion`, `tech_buscar`) siguen en la base, pero ningún flujo activo las llama.

## ¿Y el juez?

**No hay ningún juez en los flujos de noticias tech.** Se buscó "juez" y "judge" en los nodos y en el historial de versiones de todos los workflows.

El juez que hicimos hace poco (29/10) es del **canal de YouTube**:

- `Ideas · Radar` (todos los días a las 21:30): junta videos de Google Trends, YouTube y los canales de referencia, los filtra y puntúa, y elige 5 finalistas por formato. Un **juez** (`gpt-6-luna`) elige 1 video largo y 1 Short.
- `Ideas · Proponer` (a pedido del Especialista YouTube): busca temas que crecen y le pide al **juez** que proponga una idea.

Los dos usan la base `youtube`, no `noticias`, y no leen las noticias tech.
