# Modelo para el juez y resumidor de Infomate

Consulta hecha el lunes 02/11/2026, solo con fuentes primarias: la API pública de OpenRouter (`/api/v1/models` y `/endpoints`, sin key), las páginas de proveedores de OpenRouter, docs y model cards de Anthropic, OpenAI y Xiaomi, Artificial Analysis (AA) y el leaderboard de Vectara. No se hizo ninguna llamada paga. Lo que no encontré en una fuente primaria figura como "no confirmado".

**Conclusión:** usar **`anthropic/claude-haiku-5.5` con el razonamiento apagado o en `low`**. Cuesta lo mismo que GPT-6 Luna y casi lo mismo que MiMo (unos USD 0,22 por mes sin razonamiento; el tope de USD 10 alcanza para años). Es el único de los tres con un dato multilingüe publicado (Global MMLU 87,8 %), tiene el índice de inteligencia de AA más alto y, sobre todo, la tasa de alucinación de AA-Omniscience más baja en todas sus variantes (34 a 40 %, contra 52 % de MiMo y 80 a 85 % de Luna). Lo sirven 10 endpoints, y en 7 de ellos funcionan `structured_outputs` y JSON schema. Hay que tener en cuenta dos cosas: **no acepta `temperature`** (hay que sacar el 0.2 del pedido) y su tokenizador cuenta un 30 % más de tokens que Haiku 4.5. GPT-6 Luna queda segundo: es más rápido sin razonamiento, pero en esa variante su calidad cae mucho (índice 9,4) y alucina más que los otros dos. MiMo-V2.6-Flash queda descartado como primera opción: razona por defecto (unos 54 s por respuesta en AA), genera 37 tokens/s y su model card declara solo inglés y chino.

## Tabla comparativa

| | Claude Haiku 5.5 | GPT-6 Luna | MiMo-V2.6-Flash |
|---|---|---|---|
| Precio OpenRouter (entrada / salida, USD por M) | 0,10 / 0,50 | 0,10 / 0,50 (Flex: 0,05 / 0,25) | 0,14 / 0,28 (desde 0,10 / 0,28 en Io Net fp8) |
| Costo por día / mes sin razonamiento (30 llamadas) | 0,0074 / 0,22 | 0,0074 / 0,22 | 0,0071 / 0,21 |
| Extra por cada 1.000 tokens de razonamiento por llamada | +0,015/día, +0,45/mes | +0,015/día, +0,45/mes | +0,0084/día, +0,25/mes |
| Razona por defecto | sí (adaptive, effort `medium`) | sí (`default_enabled`, effort `medium`) | sí (según chat template) |
| Se puede apagar en OpenRouter | sí, `reasoning.effort: "none"` | sí, `reasoning.effort: "none"` | `mandatory: false`; valor exacto no confirmado |
| `temperature` | no (fuera de la lista de parámetros) | no (fuera de la lista de parámetros) | sí (default 1, recomendado 1.0) |
| `structured_outputs` (JSON schema) | 7 de 10 endpoints (no en Bedrock ni Claude on AWS) | 7 de 7 endpoints | 7 de 9 endpoints (no en Novita; Venice sin `response_format`) |
| AA Intelligence Index (variante máx. / baja) | 36,2 (Max) / 18,6 (Low) | 27,8 (Max) / 9,4 (sin razonamiento) | 26,7 (única variante, razona) |
| AA-Omniscience, tasa de alucinación (menos es mejor) | 34 % (Max), 40 % (Medium y Low) | 79 % (Max), 85 % (Medium y Low), 80 % (sin razonamiento) | 52 % |
| IFBench / IFEval | no confirmado | no confirmado | no confirmado |
| Vectara (alucinación al resumir) | no figura | no figura | no figura |
| Multilingüe | Global MMLU 87,8 % (42 idiomas, effort max) | no confirmado | no confirmado; la model card declara `en`, `zh` |
| Velocidad AA (tokens/s) | 167 (Low), 172 (Medium) | 112 (sin razonamiento), 121 (Low) | 37 |
| Respuesta completa AA, prompt "medium" | 7,6 s (Low), 8,7 s (Medium) | 5,4 s (sin razonamiento), 6,4 s (Low) | 72,9 s (54 s de razonamiento) |
| Contexto | 1M | 1,05M | 1,05M |
| Datos (según OpenRouter) | ningún endpoint entrena; Anthropic retiene 30 días; Vertex, Azure y Bedrock no retienen | ninguno entrena; OpenAI retiene (días no indicados); Azure y Bedrock no retienen | ninguno entrena; Xiaomi y Cohere retienen 30 días, GMICloud y Darkbloom retienen; DeepInfra, Io Net, Novita y Venice no retienen |

Costo calculado así: 30 x 1.200 = 36.000 tokens de entrada y 30 x 250 = 7.500 de salida por día, con mes de 30 días. Si se reintenta una vez por JSON inválido, esa llamada cuesta el doble. En los tres casos el razonamiento se cobra como tokens de salida ([OpenRouter, reasoning tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)). Ejemplo con razonamiento: si cada llamada razona 2.000 tokens, Haiku y Luna pasan a unos USD 1,12 por mes y MiMo a unos USD 0,72.

## Detalle por modelo

### Claude Haiku 5.5 (`anthropic/claude-haiku-5.5`)

- **Precio y contexto:** 0,10 / 0,50 USD por M hasta 100.000 tokens de prompt, 1M de contexto y 128K de salida ([OpenRouter models](https://openrouter.ai/api/v1/models), [Anthropic, Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview)). El modelo usa el tokenizador nuevo: "the same text counts as approximately 30 percent more tokens than on Claude Haiku 4.5" (misma fuente). Por eso las 1.200 entradas estimadas pueden ser más.
- **Proveedores:** Anthropic, Google Vertex (global, europe, us), Azure (global, us), Amazon Bedrock (3) y Claude Platform on AWS. Todos aceptan `response_format`. `structured_outputs` figura en todos menos Bedrock y Claude Platform on AWS ([endpoints](https://openrouter.ai/api/v1/models/anthropic/claude-haiku-5.5/endpoints)). Las regiones `us` y `europe` cobran 10 % más.
- **Razonamiento:** el pensamiento adaptativo viene prendido por defecto con effort `medium` ([Anthropic](https://platform.claude.com/docs/en/models/haiku-5-5/overview)). La API de Anthropic acepta `thinking: {type: "disabled"}` con effort `high` o menor. Para este caso importa una advertencia: "With thinking off, the model can skip a tool call it needs when you also request JSON output" ([Anthropic, thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)). Acá no usamos tools, así que en principio no afecta. En OpenRouter el modelo declara `mandatory: false` y los efforts `none, low, medium, high, xhigh, max`, con `default_effort: medium` ([OpenRouter models](https://openrouter.ai/api/v1/models)). Se apaga con `"reasoning": {"effort": "none"}` ([OpenRouter](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)).
- **Temperature:** "Omit `temperature`, `top_p`, and `top_k`" ([Anthropic](https://platform.claude.com/docs/en/models/haiku-5-5/overview)). En la API de Anthropic, un valor no default da error 400 ([thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)). Ningún endpoint de OpenRouter lista `temperature`. Si OpenRouter lo descarta o devuelve error: no confirmado. Conviene no mandarlo.
- **Instrucciones:** AA no tiene IFBench para ninguna variante (el campo está vacío). La system card solo da un dato cualitativo de su auditoría de comportamiento: "improved substantially on Haiku 4.5 on instruction-following failures" ([system card](https://www.anthropic.com/document/claude-haiku-5-5-system-card), sección 6.2.2). IFEval: no confirmado.
- **Fidelidad:** en AA-Omniscience tiene la tasa de alucinación más baja de los tres en todas sus variantes: 34,2 % en Max, 40,4 % en Medium y 40,5 % en Low. El índice neto es 12,3 en Max y 2,2 en Low ([AA Max](https://artificialanalysis.ai/models/claude-haiku-5-5), [Medium](https://artificialanalysis.ai/models/claude-haiku-5-5-medium), [Low](https://artificialanalysis.ai/models/claude-haiku-5-5-low)). Omniscience mide conocimiento sin documento y si el modelo se abstiene en vez de inventar. No mide fidelidad a un texto dado, así que sirve solo como indicio. La system card admite que "it hallucinated more than other recent models, and about as much as Claude Haiku 4.5". También dice que Opus 5.5, Sonnet 5.5 y Mythos 5.1 fueron "strictly better on input hallucination" (sección 6.2.3). No figura en Vectara. El último que figura es Haiku 4.5, con 9,8 % ([Vectara](https://github.com/vectara/hallucination-leaderboard), actualizado el 22/10/2026).
- **Español:** Global MMLU, 87,8 % de promedio en 42 idiomas, con effort max (system card, sección 8.12.1). No hay dato separado para español.
- **Juicio y calibración:** no hay un benchmark directo. No confirmado.
- **Velocidad (AA, API de Anthropic):** en Low, 167 tokens/s y 7,6 s de respuesta completa con el prompt "medium". En Medium, 172 tokens/s y 8,7 s. En Max tarda 228 s ([AA Low](https://artificialanalysis.ai/models/claude-haiku-5-5-low), [Medium](https://artificialanalysis.ai/models/claude-haiku-5-5-medium), [Max](https://artificialanalysis.ai/models/claude-haiku-5-5)). AA no mide la variante sin razonamiento. OpenRouter devuelve `latency_last_30m` y `throughput_last_30m` en `null`.
- **Datos:** según la página de proveedores de OpenRouter, ningún endpoint entrena con los prompts. Anthropic retiene 30 días. Vertex, Azure y Bedrock no retienen ([OpenRouter providers](https://openrouter.ai/anthropic/claude-haiku-5.5/providers)).

### GPT-6 Luna (`openai/gpt-6-luna`)

- **Precio y contexto:** 0,10 / 0,50 USD por M, 1,05M de contexto y 128K de salida ([OpenAI](https://developers.openai.com/api/docs/models/gpt-6-luna), [OpenRouter models](https://openrouter.ai/api/v1/models)). En OpenRouter hay un endpoint `openai/flex` a 0,05 / 0,25 con 94,5 % de disponibilidad el último día, y uno `openai/fast` a 0,20 / 1,00 ([endpoints](https://openrouter.ai/api/v1/models/openai/gpt-6-luna/endpoints)).
- **Proveedores:** OpenAI (estándar, flex, fast), Azure (3) y Bedrock us-east-1. Los 7 aceptan `response_format` y `structured_outputs` ([endpoints](https://openrouter.ai/api/v1/models/openai/gpt-6-luna/endpoints)). OpenAI confirma que el modelo soporta structured outputs ([OpenAI](https://developers.openai.com/api/docs/models/gpt-6-luna)).
- **Razonamiento:** OpenAI soporta `none, low, medium, high, xhigh, max`, con `medium` por defecto ([OpenAI](https://developers.openai.com/api/docs/models/gpt-6-luna)). En OpenRouter figura `default_enabled: true`, `default_effort: medium` y `mandatory: false` ([OpenRouter models](https://openrouter.ai/api/v1/models)). Si no se manda `reasoning`, razona y cobra esos tokens.
- **Temperature:** ningún endpoint de OpenRouter lista `temperature`. La doc de OpenAI no lo menciona. No confirmado.
- **Instrucciones:** IFBench vacío en AA para todas las variantes. IFEval: no confirmado. El anuncio de OpenAI ([openai.com](https://openai.com/index/introducing-gpt-6-sol-and-luna/)) devolvió 403, así que no pude leer sus benchmarks.
- **Fidelidad:** es el peor de los tres en AA-Omniscience. Tasa de alucinación: 79,3 % en Max, 85,3 % en Medium, 84,8 % en Low y 80,0 % sin razonamiento. Índice neto: de -8,3 a -25,8 ([AA Max](https://artificialanalysis.ai/models/gpt-6-luna), [Low](https://artificialanalysis.ai/models/gpt-6-luna-low), [sin razonamiento](https://artificialanalysis.ai/models/gpt-6-luna-non-reasoning)). El addendum del 29/10/2026 dice que la versión nueva tiene "higher factual-error rates than the original October version across all six reported metrics". Habla de ChatGPT; si cambia el modelo de la API, no confirmado ([OpenAI addendum](https://deploymentsafety.openai.com/gpt-6-luna-october-28-2026-addendum)). No figura en Vectara.
- **Español:** no confirmado.
- **Juicio y calibración:** no hay un benchmark directo. No confirmado.
- **Calidad sin razonamiento:** AA Intelligence Index 9,4 sin razonamiento, contra 18,6 de Haiku en Low ([AA](https://artificialanalysis.ai/models/gpt-6-luna-non-reasoning)).
- **Velocidad (AA, API de OpenAI):** sin razonamiento, 112 tokens/s, primer token en 0,81 s y 5,4 s de respuesta completa. En Low, 121 tokens/s y 6,4 s. OpenRouter: latencia y throughput en `null`.
- **Datos:** ningún endpoint entrena. OpenAI retiene (OpenRouter no indica los días). Azure y Bedrock no retienen ([OpenRouter providers](https://openrouter.ai/openai/gpt-6-luna/providers)).

### MiMo-V2.6-Flash (`xiaomi/mimo-v2.6-flash`)

- **Precio y contexto:** 0,14 / 0,28 USD por M en Xiaomi. Io Net (fp8) y Darkbloom (fp4) cobran 0,10 / 0,28 y Venice 0,175 / 0,35. El contexto es de 1M ([endpoints](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-flash/endpoints)). Es MoE de 309B parámetros totales y 15B activos, con licencia MIT ([model card](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Flash-RL)).
- **Proveedores:** Xiaomi, DeepInfra, Cohere, GMICloud (bf16), Makora, Io Net, Novita, Venice y Darkbloom. Casi todos sirven fp8. `structured_outputs` figura en todos menos Novita, y Venice no lista `response_format`. Darkbloom tenía `status -2` al consultar ([endpoints](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-flash/endpoints)). La cuantización cambia según el proveedor, así que la calidad puede variar con el ruteo.
- **Razonamiento:** el chat template solo saltea el pensamiento si `enable_thinking is false`, o sea que razona por defecto ([tokenizer_config](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Flash-RL/raw/main/tokenizer_config.json)). OpenRouter indica `mandatory: false`, sin `default_effort` ni lista de efforts ([OpenRouter models](https://openrouter.ai/api/v1/models)). Si `reasoning.effort: "none"` o `enabled: false` lo apagan en cada proveedor: no confirmado. En AA (API de Xiaomi), 54 s de los 72 s de cada respuesta son razonamiento ([AA](https://artificialanalysis.ai/models/mimo-v2-6-flash)).
- **Temperature:** sí se acepta. El default es 1 y la model card recomienda `temperature=1.0`, `top_p=0.95`. No hay dato sobre cómo rinde con 0.2.
- **Instrucciones:** IFBench vacío en AA. La model card no publica IFEval ni IFBench. No confirmado.
- **Fidelidad:** AA-Omniscience con 52,2 % de tasa de alucinación, índice neto -10,8 y la exactitud más baja de los tres (27,2 %) ([AA](https://artificialanalysis.ai/models/mimo-v2-6-flash)). No figura en Vectara.
- **Español:** no confirmado. El campo `language` de la model card lista solo `en` y `zh`.
- **Juicio y calibración:** no confirmado.
- **Velocidad (AA, API de Xiaomi):** 37 tokens/s (puesto 76 de 78), primer token en 4,1 s y respuesta completa en 72,9 s con el prompt "medium". Las 30 llamadas en serie llevarían unos 36 minutos. OpenRouter: latencia y throughput en `null`.
- **Datos:** ningún endpoint entrena. Xiaomi (sede CN, datacenters SG y NL) y Cohere retienen 30 días. GMICloud y Darkbloom retienen sin días indicados. DeepInfra, Io Net, Novita y Venice no retienen ([OpenRouter providers](https://openrouter.ai/xiaomi/mimo-v2.6-flash/providers), [providers API](https://openrouter.ai/api/v1/providers)).

## Qué medir en la prueba real con las 30 noticias

Los benchmarks no responden lo que más importa acá: si el resumen respeta el texto de la nota y si el puntaje ordena bien.

1. **Configuración:** sin `temperature` para Haiku y Luna, `response_format` con `json_schema` y `strict: true`, y `provider.require_parameters: true` para que no rutee a endpoints sin structured outputs ([OpenRouter, structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)). Probar Haiku con effort `none` y `low`, y Luna con `none` y `low`.
2. **Tokens y costo reales:** leer `usage` de cada respuesta (entrada, salida y razonamiento), sobre todo para ver si `none` deja el razonamiento en cero y cuánto suma el tokenizador de Haiku.
3. **JSON:** cuántas de las 30 salen válidas al primer intento, cuántas necesitan reintento, y si se respetan los topes de 200 y 500 caracteres.
4. **Fidelidad:** revisar a mano cada resumen contra su texto y marcar datos inventados, cifras cambiadas u opiniones. Es lo que AA-Omniscience no mide.
5. **Español rioplatense neutro:** traducción de títulos en inglés, sin voseo forzado ni españolismos, y nombres propios bien escritos.
6. **Puntaje:** comparar el top 5 de cada categoría con el que elegiría Francisco y correr las mismas 30 dos veces para ver cuánto cambia el puntaje (Haiku y Luna no dejan fijar la temperatura).
7. **Tiempo total** de las 30 llamadas en n8n.
