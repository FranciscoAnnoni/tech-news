# APIs y fuentes programáticas de noticias

Consulta hecha el lunes 02/11/2026, solo con fuentes primarias (documentación, precios y términos oficiales). Lo que no encontré en una fuente primaria figura como "no confirmado".

**Conclusión:** ninguna API gratuita reemplaza a los RSS de medios con texto completo y uso libre. Mantener los RSS como base. Para decodificar Google News, el método no oficial funciona hoy (3 de 3), pero el feed se permite solo para uso personal. Si Infomate queda como proyecto personal, la mejor API gratis para sumar volumen es **Currents API**: 250 pedidos x 20 resultados por día, filtra por Argentina y español, y sus términos permiten uso comercial con atribución. Hay que probar antes qué medios argentinos trae. Si hace falta texto completo y uso comercial, lo más barato es **GNews Essential** (49,99 EUR por mes).

## Tabla comparativa

| Opción | Cubre ARG | Español | Texto / link directo | Gratis | Primer plan pago | Sirve para 200/día por categoría |
|---|---|---|---|---|---|---|
| Currents API | sí (región AR) | sí | 300 caracteres gratis; link al medio | 250 ped/día x 20; uso comercial con atribución | 69 USD/mes | sí (texto corto, medios ARG no confirmados) |
| GNews.io | sí (`ar`) | sí | recortado gratis, completo pago; link al medio (no confirmado explícito) | 100 ped/día x 10; 12 h de demora; no comercial | 49,99 EUR/mes | sí en volumen; la demora corre la ventana |
| NewsData.io | sí (`AR`) | sí | sin texto gratis; completo pago; link al medio | 200 créditos/día x 10; 12 h de demora; testing y personal | 199,99 USD/mes | sí en volumen; la demora corre la ventana |
| TheNewsAPI | sí (`ar`) | sí | snippet; link al medio | 100 ped/día x 3 | 19 USD/mes | gratis no (300/día en total); pago sí |
| Mediastack | sí (`ar`) | sí | descripción; link al medio | 100 pedidos por **mes**; 30 min de demora; no comercial | 24,99 USD/mes | gratis no; pago sí |
| NewsAPI.org | sin `country=ar`; sí con `language=es` y `domains` | sí | 200 caracteres; link al medio | 100 ped/día x 100; 24 h de demora; solo desarrollo | 449 USD/mes | gratis no permitido en producción |
| World News API | sí (`ar`, 18 fuentes) | sí | texto completo; link al medio | 50 puntos/día (unos 2.500 artículos) | 39 USD/mes | sí en volumen; términos prohíben guardar datos |
| Event Registry / NewsAPI.ai | no confirmado | sí (`spa`) | texto completo (body); link al medio | 2.000 búsquedas que no se renuevan; solo evaluación | 90 USD/mes | solo pago |
| GDELT DOC 2.0 | sí (`sourcecountry`) | sí (`sourcelang`) | sin texto; título, link al medio, imagen | gratis, uso libre con cita | no hay | volumen sí; sin categorías ni texto; me rechazó todos los pedidos |
| Bing News Search | no aplica | no aplica | no aplica | retirada el 11/08/2025 | no aplica | no |
| The Guardian Open Platform | no (medio británico) | no | texto completo | 500 ped/día; no comercial | precio a medida | no para ARG ni español |
| NYT APIs | no (medio de EE.UU.) | no | no confirmado | 500 ped/día, 5 por minuto; no comercial | no hay plan público | no para ARG ni español |
| Perigon | no confirmado | no confirmado | no confirmado | clave de prueba gratis (límites no confirmados) | 25 USD/mes (licencia personal, 1.000 ped/mes) | no confirmado |
| NewsCatcher | no confirmado | no confirmado | no confirmado | prueba de 7 días; plan individual por uso | por créditos | no confirmado |
| Google News RSS + decodificar links | sí | sí | sin texto; link al medio tras decodificar | gratis; feed solo para uso personal | no hay | sí; 2 pedidos extra por link |

"Sirve para 200/día" supone una sola corrida a las 08:00 y tres categorías (unas 600 noticias por día).

## Detalle por opción

### Currents API

- **Argentina y español:** el endpoint `/v1/available/regions` devuelve `"Argentina":"AR"` y `/v1/available/languages` devuelve `"Spanish":"es"` (consultados en vivo). Categorías: `politics`, `business`, `economy`, `sports`, `technology`, `world`, entre otras ([categorías](https://api.currentsapi.services/v1/available/categories)).
- **Qué medios argentinos trae:** no confirmado. Hace falta una clave para probar.
- **Qué devuelve:** `id`, `title`, `description`, `url`, `author`, `image`, `language`, `category`, `published` ([OpenAPI](https://currentsapi.services/json/swagger.json)). El plan gratis trae un adelanto de 300 caracteres. Los pagos traen "available article content fields" ([docs](https://currentsapi.services/en/docs/)).
- **Plan gratis:** 250 pedidos por día, 20 resultados por pedido, 30 días de historia. `/latest-news` cubre los últimos 7 días ([docs](https://currentsapi.services/en/docs/), [precios](https://currentsapi.services/en/product/price)).
- **Demora:** no confirmado. La página no la menciona.
- **Primer plan pago:** Builder, 69 USD por mes, 2.500 pedidos por día y 50 resultados ([precios](https://currentsapi.services/en/product/price)).
- **Términos:** todos los planes, incluido el gratis, permiten uso comercial con atribución y link al artículo original. Resúmenes con IA o republicar el texto requieren otro acuerdo ([docs](https://currentsapi.services/en/docs/)).
- **¿Alcanza?** Sí en volumen: 10 pedidos por categoría dan 200 noticias. Falta el texto completo, que habría que bajar de la página del medio.

### GNews.io

- **Argentina y español:** país `ar` e idioma `es` figuran en las listas oficiales. Categorías de top headlines: general, world, nation, business, technology, entertainment, sports, science, health ([docs](https://docs.gnews.io/endpoints/top-headlines-endpoint)).
- **Qué devuelve:** `title`, `description`, `content`, `url`, `image`, `publishedAt`, `lang`, `source` ([respuesta JSON](https://docs.gnews.io/json-response)). La doc describe `url` solo como "URL of the article". El ejemplo apunta al medio, pero no lo dice explícito: no confirmado.
- **Plan gratis:** 100 pedidos por día, 10 artículos por pedido, 12 h de demora, 30 días de historia, contenido recortado. "Non-commercial use only" ([precios](https://gnews.io/pricing)). La paginación llega hasta 1.000 artículos ([docs](https://docs.gnews.io/endpoints/top-headlines-endpoint)).
- **Primer plan pago:** Essential, 49,99 EUR por mes (39,99 EUR con pago anual), 1.000 pedidos por día, 25 artículos, tiempo real, texto completo, uso comercial ([precios](https://gnews.io/pricing)).
- **Términos:** uso comercial solo con suscripción paga. Se permite caché razonable. Se prohíbe armar una base para un servicio competidor. Atribución "appreciated but not required". La suscripción no da derechos sobre el contenido de terceros ([términos](https://gnews.io/legal/terms-of-service)).
- **¿Alcanza?** Gratis sí en volumen (60 de 100 pedidos), pero con 12 h de demora: a las 08:00 llega hasta las 20:00 del día anterior. Pago sí, con texto completo.

### NewsData.io

- **Argentina y español:** el filtro `country` acepta códigos ISO. La página oficial de Argentina usa `country=AR` y lista Clarín, entre otros ([Argentina](https://newsdata.io/news-sources/argentina-world-news-api)). Categorías: `politics`, `business`, `sports`, `technology`, `world`, `top`, `domestic` y otras ([referencia](https://newsdata.io/llms-full.txt)).
- **Qué devuelve:** `title`, `link`, `description`, `content`, `pubDate`, `image_url`, `category`, `source_*`, marca de duplicado y campos de IA. En el plan gratis, `content` y `ai_summary` traen el texto "ONLY AVAILABLE IN PAID PLANS" ([referencia](https://newsdata.io/llms-full.txt)).
- **Plan gratis:** 200 créditos por día, 10 artículos por pedido, 12 h de demora, ventana de 48 h. "Aimed at testing and personal projects" ([referencia](https://newsdata.io/llms-full.txt), [precios](https://newsdata.io/pricing)).
- **Primer plan pago:** Basic, 199,99 USD por mes, 20.000 créditos, 50 artículos por pedido, texto completo ([precios](https://newsdata.io/pricing)).
- **Términos:** piden mostrar "Powered by NewsData.io API" junto a cualquier uso, salvo autorización. Se prohíbe reproducir material con copyright. El contenido es de los medios ([términos](https://newsdata.io/terms)).
- **¿Alcanza?** Gratis sí en volumen (20 pedidos por categoría), con la misma demora de 12 h que GNews. Sin texto.

### TheNewsAPI

- **Argentina y español:** `locale=ar` y `language=es` figuran como soportados. Categorías: general, business, sports, tech, politics, entre otras ([docs](https://www.thenewsapi.com/documentation)).
- **Qué devuelve:** `title`, `description`, `snippet`, `url`, `image_url`, `published_at`, `categories`, `source`, `locale`. No hay campo de texto completo ([docs](https://www.thenewsapi.com/documentation)).
- **Plan gratis:** 100 pedidos por día, 3 artículos por pedido ([precios](https://www.thenewsapi.com/pricing)). Demora: no confirmado.
- **Primer plan pago:** Basic, 19 USD por mes (16 USD con pago anual), 2.500 pedidos por día, 25 artículos ([precios](https://www.thenewsapi.com/pricing)).
- **Términos:** los [términos del sitio](https://www.thenewsapi.com/tos) hablan de uso personal y no comercial del sitio, pero no tratan la API. Uso comercial de la API: no confirmado.
- **¿Alcanza?** Gratis no (300 artículos por día en total). Basic sí, y es el plan pago más barato.

### Mediastack

- **Argentina y español:** Argentina `ar` está en la lista de países ([fuentes](https://mediastack.com/sources)). `es` está en la lista de idiomas ([docs](https://docs.apilayer.com/mediastack/docs/api-features)).
- **Qué devuelve:** `author`, `title`, `description`, `url`, `image`, `category`, `language`, `country`, `published_at`. Hasta 100 resultados por pedido ([docs](https://docs.apilayer.com/mediastack/docs/api-features)).
- **Plan gratis:** 100 pedidos **por mes**, uso no comercial ([precios](https://mediastack.com/pricing)). Noticias con 30 min de demora ([docs](https://docs.apilayer.com/mediastack/docs/api-features)).
- **Primer plan pago:** Standard, 24,99 USD por mes, 10.000 pedidos por mes, tiempo real ([precios](https://mediastack.com/pricing)).
- **Términos:** los datos se pueden mostrar a usuarios finales "strictly for their own personal use". No se pueden sacar de la app ni publicar en foros públicos. Al terminar el contrato no se pueden guardar ([términos](https://mediastack.com/terms)).
- **¿Alcanza?** Gratis no (unos 3 pedidos por día). Standard sí.

### NewsAPI.org

- **Argentina y español:** en `top-headlines` la doc solo lista `us` como país ([docs](https://newsapi.org/docs/endpoints/top-headlines)). En `everything` sí hay `language=es` y `domains` para elegir medios ([docs](https://newsapi.org/docs/endpoints/everything)).
- **Qué devuelve:** `title`, `description`, `url`, `urlToImage`, `publishedAt`, `content` recortado a 200 caracteres. No trae categoría en `everything` ([docs](https://newsapi.org/docs/endpoints/everything)).
- **Plan gratis:** 100 pedidos por día, 24 h de demora, un mes de historia, solo desarrollo ([precios](https://newsapi.org/pricing)). Los términos dicen que no se puede usar en staging ni producción, "including internally" ([términos](https://newsapi.org/terms)).
- **Primer plan pago:** Business, 449 USD por mes ([precios](https://newsapi.org/pricing)).
- **Términos:** prohíben republicar material con copyright y armar una base de noticias competidora ([términos](https://newsapi.org/terms)).
- **¿Alcanza?** No: el plan gratis no se puede usar en producción y el pago es caro.

### World News API

- **Argentina y español:** la lista oficial de países incluye `ar`, con 18 fuentes, idioma `es` y unas 3.038 noticias por día ([códigos de país](https://worldnewsapi.com/docs/country-codes/)).
- **Qué devuelve:** `title`, `text` (texto completo), `summary`, `url`, `image`, `publish_date`, `category`, `source_country`. Hasta 100 resultados por pedido ([search news](https://worldnewsapi.com/docs/search-news/)). Tiene además "Top News" agrupado por país ([top news](https://worldnewsapi.com/docs/top-news/)).
- **Plan gratis:** 50 puntos por día ([precios](https://worldnewsapi.com/pricing/)). Una búsqueda cuesta 1 punto más 0,01 por resultado ([cuotas](https://worldnewsapi.com/docs/quotas-and-rate-limiting/)): 100 resultados cuestan 2 puntos, o sea unos 2.500 artículos por día. Exige un link a worldnewsapi.com en la app. Uso comercial en el plan gratis: no confirmado.
- **Primer plan pago:** Reporter, 39 USD por mes, 500 puntos por día ([precios](https://worldnewsapi.com/pricing/)).
- **Términos:** prohíben "copy or store the information it provides". La caché requiere permiso escrito y dura como máximo 1 hora. Al dejar el servicio hay que borrar todo ([términos](https://worldnewsapi.com/terms/)).
- **¿Alcanza?** En volumen y texto sí. Pero Infomate guarda noticias en su base, y eso choca con los términos.

### Event Registry / NewsAPI.ai

- **Argentina y español:** idioma `spa` soportado. Cobertura de medios argentinos: no confirmado (los endpoints de fuentes piden cuenta).
- **Qué devuelve:** título, body (texto completo), URL, fecha, autores, categorización y agrupación en eventos ([planes](https://newsapi.ai/plans)).
- **Plan gratis:** 2.000 búsquedas que no se renuevan. Solo para evaluar. Producción o lanzamiento público requieren plan pago ([términos](https://newsapi.ai/terms)).
- **Primer plan pago:** 5K, 90 USD por mes, 5.000 búsquedas de hasta 100 artículos cada una ([planes](https://newsapi.ai/plans)).
- **Términos:** con plan pago se pueden mostrar título, extracto corto, medio, fecha, miniatura y link. No se puede redistribuir el contenido sin permiso del medio ([términos](https://newsapi.ai/terms)).
- **¿Alcanza?** Solo con el plan pago.

### GDELT DOC 2.0 API

- **Argentina y español:** filtros `sourcecountry` (nombre o código FIPS) y `sourcelang`. Ventana móvil de 3 meses. Hasta 250 resultados por pedido ([anuncio oficial](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)).
- **Qué devuelve:** el modo ArtList trae título, link, imagen, país, idioma y fecha ([anuncio oficial](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)). No trae descripción ni texto. No hay categorías como política o deportes.
- **Gratis:** sí. Uso libre, también comercial, con cita y link a GDELT ([about](https://www.gdeltproject.org/about.html)).
- **Límite:** la API respondió "Please limit requests to one every 5 seconds" a los 3 pedidos que hice, aun separados por varios minutos. No pude ver datos reales.
- **¿Alcanza?** En volumen sí. Pero no trae texto ni categorías, y el límite de pedidos es poco confiable.

### Bing News Search

- Microsoft retiró las Bing Search APIs el 11/08/2025. El reemplazo es "Grounding with Bing Search" dentro de Azure AI Agents, que no es una API de noticias ([anuncio](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement)).

### The Guardian Open Platform

- Medio británico en inglés. No sirve para ARG ni español.
- **Gratis:** clave Developer, no comercial, 500 pedidos por día, 1 por segundo, con texto del artículo ([acceso](https://open-platform.theguardian.com/access/)).
- **Pago:** clave comercial con precio según uso ([acceso](https://open-platform.theguardian.com/access/)).
- **Términos:** hay que borrar o volver a pedir el contenido cada 24 h. Los usuarios finales pueden verlo solo para uso personal y no comercial ([términos](https://www.theguardian.com/open-platform/terms-and-conditions)).

### NYT APIs

- Medio de EE.UU. en inglés. No sirve para ARG ni español.
- **Gratis:** 500 pedidos por día y 5 por minuto. Solo uso no comercial ([FAQ](https://developer.nytimes.com/faq)).
- **Texto completo:** no confirmado.

### Perigon

- **Planes:** Individual desde 25 USD por mes, licencia personal, 1.000 pedidos por mes. Startup desde 250 USD, licencia comercial limitada. Commercial desde 1.250 USD. Se puede probar gratis con una clave ([precios](https://perigon.io/pricing)).
- **Argentina, español, campos y límites gratis:** no confirmado.

### NewsCatcher

- Plan individual por uso y prueba de 7 días. Cobra por créditos ([precios](https://www.newscatcherapi.com/pricing)).
- **Argentina, español y texto completo:** no confirmado.

### Google News RSS y decodificación de links

- **Método:** los IDs nuevos (empiezan con `CBMi...AU_yqL`) no son base64 del link. Hay que (1) pedir `https://news.google.com/rss/articles/<id>` y leer `data-n-a-sg` y `data-n-a-ts`, y (2) mandar un POST a `https://news.google.com/_/DotsSplashUi/data/batchexecute` con el RPC `Fbv4je` y el payload `garturlreq`. La respuesta trae el link del medio. Es una API interna, sin documentación oficial.
- **Implementaciones:** [gist de huksley](https://gist.github.com/huksley/bc3cb046157a99cd9d1517b32f91a99e) (TypeScript y Python), [google-news-url-decoder](https://github.com/dariandanciu/google-news-url-decoder) (Node), [google-news-url-resolver](https://github.com/WebCrawlerAPI/google-news-url-resolver) (npm).
- **Prueba propia (02/11/2026):** con el feed de Argentina, 3 de 3 links se resolvieron a La Nación, Página 12 y Clarín. Cuesta 2 pedidos extra por noticia.
- **Términos:** el propio feed dice en `<copyright>`: "made available solely for the purpose of rendering Google News results within a personal feed reader for personal, non-commercial use. Any other use of the feed is expressly prohibited" ([feed](https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419)).
- **¿Alcanza?** Sí en volumen. Puede romperse sin aviso y solo vale para uso personal.

## Fuentes consultadas (02/11/2026)

- Currents API: https://currentsapi.services/en/product/price, https://currentsapi.services/en/docs/, https://currentsapi.services/json/swagger.json, https://api.currentsapi.services/v1/available/regions, https://api.currentsapi.services/v1/available/languages, https://api.currentsapi.services/v1/available/categories
- GNews: https://gnews.io/pricing, https://docs.gnews.io/endpoints/top-headlines-endpoint, https://docs.gnews.io/json-response, https://gnews.io/legal/terms-of-service, https://gnews.io/news-sources
- NewsData.io: https://newsdata.io/pricing, https://newsdata.io/llms-full.txt, https://newsdata.io/news-sources/argentina-world-news-api, https://newsdata.io/terms
- TheNewsAPI: https://www.thenewsapi.com/pricing, https://www.thenewsapi.com/documentation, https://www.thenewsapi.com/tos
- Mediastack: https://mediastack.com/pricing, https://docs.apilayer.com/mediastack/docs/api-features, https://mediastack.com/sources, https://mediastack.com/terms
- NewsAPI.org: https://newsapi.org/pricing, https://newsapi.org/docs/endpoints/top-headlines, https://newsapi.org/docs/endpoints/everything, https://newsapi.org/terms
- World News API: https://worldnewsapi.com/pricing/, https://worldnewsapi.com/docs/search-news/, https://worldnewsapi.com/docs/top-news/, https://worldnewsapi.com/docs/quotas-and-rate-limiting/, https://worldnewsapi.com/docs/country-codes/, https://worldnewsapi.com/terms/
- Event Registry / NewsAPI.ai: https://newsapi.ai/plans, https://newsapi.ai/terms
- GDELT: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/, https://www.gdeltproject.org/about.html, https://api.gdeltproject.org/api/v2/doc/doc
- Bing: https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement
- The Guardian: https://open-platform.theguardian.com/access/, https://www.theguardian.com/open-platform/terms-and-conditions
- NYT: https://developer.nytimes.com/faq
- Perigon: https://perigon.io/pricing
- NewsCatcher: https://www.newscatcherapi.com/pricing
- Google News: https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419, https://gist.github.com/huksley/bc3cb046157a99cd9d1517b32f91a99e, https://github.com/dariandanciu/google-news-url-decoder, https://github.com/WebCrawlerAPI/google-news-url-resolver
