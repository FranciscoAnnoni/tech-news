// Infomate · fuentes (mismo código que el nodo "Fuentes"). Sin IA.
// origen: rss = feed de un medio · gnews = Google News (trae varios medios por noticia)
//         portada = portada de Google News (no crea noticias, solo marca las que ya entraron)
//         hn / lobsters = agregadores tech. Reddit va aparte (nodo "Fuentes Reddit") por el límite de 1 pedido por minuto.
// tope: máximo de noticias de esa fuente por corrida (si no, 100). Los países y deportes van con 25 para que ninguno domine.
// peso: multiplica el lugar en el feed para el puntaje previo (si no, 0.85).
// prioridad: la n.º 1 de ese feed entra siempre como candidata, con 100 puntos (acordado con Francisco el 02/11/2026).
// seccion: distingue feeds del mismo medio (Infobae política, Infobae deportes...).
const OPINION = '/(opinion|editoriales|lnmas|fotos)/';
const GN = 'https://news.google.com/rss';
const hace24h = Math.floor(Date.now() / 1000) - 86400;
const fuentes = [
  { categoria: 'global', fuente: 'Google News Mundo', origen: 'gnews', peso: 1, prioridad: true, url: `${GN}/headlines/section/topic/WORLD?hl=es-419&gl=AR&ceid=AR:es-419` },
  { categoria: 'global', fuente: 'Google News EE.UU.', origen: 'gnews', tope: 25, url: `${GN}/headlines/section/topic/NATION?hl=es-419&gl=US&ceid=US:es-419` },
  // Ediciones locales: la búsqueda en español trae ruido argentino ("China" Suárez, GP de Brasil). El juez traduce los títulos.
  { categoria: 'global', fuente: 'Google News Reino Unido', origen: 'gnews', tope: 25, url: `${GN}/headlines/section/topic/NATION?hl=en-GB&gl=GB&ceid=GB:en` },
  { categoria: 'global', fuente: 'Google News Brasil', origen: 'gnews', tope: 25, url: `${GN}/headlines/section/topic/NATION?hl=pt-BR&gl=BR&ceid=BR:pt-419` },
  // China y Rusia no tienen edición local útil: van por búsqueda y traen 1 medio por noticia.
  // China en inglés sin medios pagos (en español la búsqueda trae "la China Suárez" y Mbappé); Rusia en español desde la edición de EE.UU.
  { categoria: 'global', fuente: 'Google News China', origen: 'gnews', tope: 25, url: `${GN}/search?q=China%20-site:bloomberg.com%20-site:wsj.com%20-site:nytimes.com%20-site:ft.com%20-site:economist.com%20-site:washingtonpost.com%20when:1d&hl=en-US&gl=US&ceid=US:en` },
  { categoria: 'global', fuente: 'Google News Rusia', origen: 'gnews', tope: 25, url: `${GN}/search?q=Rusia%20when:1d&hl=es-419&gl=US&ceid=US:es-419` },
  { categoria: 'global', fuente: 'BBC Mundo', origen: 'rss', url: 'https://feeds.bbci.co.uk/mundo/rss.xml' },
  { categoria: 'global', fuente: 'DW', origen: 'rss', url: 'https://rss.dw.com/xml/rss-sp-all' },
  { categoria: 'global', fuente: 'La Nación', seccion: 'EE.UU.', origen: 'rss', excluir: OPINION, url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/estados-unidos/' },
  { categoria: 'global', fuente: 'El País', origen: 'rss', url: 'https://feeds.elpais.com/mrss-s/list/ep/site/elpais.com/section/internacional/subsection/europa' },
  { categoria: 'global', fuente: 'Euronews', origen: 'rss', url: 'https://es.euronews.com/rss' },
  { categoria: 'arg', fuente: 'Google News Argentina', origen: 'gnews', peso: 1, prioridad: true, url: `${GN}/headlines/section/topic/NATION?hl=es-419&gl=AR&ceid=AR:es-419` },
  { categoria: 'arg', fuente: 'Infobae', seccion: 'política', origen: 'rss', excluir: OPINION, url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/politica/' },
  { categoria: 'arg', fuente: 'Infobae', seccion: 'economía', origen: 'rss', excluir: OPINION, url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/economia/' },
  { categoria: 'arg', fuente: 'La Nación', seccion: 'política', origen: 'rss', excluir: OPINION, url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/' },
  { categoria: 'arg', fuente: 'La Nación', seccion: 'economía', origen: 'rss', excluir: OPINION, url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/' },
  { categoria: 'arg', fuente: 'Infobae', seccion: 'sociedad', origen: 'rss', excluir: OPINION, url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/sociedad/' },
  { categoria: 'arg', fuente: 'Infobae', seccion: 'deportes', origen: 'rss', excluir: OPINION, tope: 25, url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/' },
  { categoria: 'arg', fuente: 'La Nación', seccion: 'sociedad', origen: 'rss', excluir: OPINION, url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/sociedad/' },
  { categoria: 'arg', fuente: 'La Nación', seccion: 'deportes', origen: 'rss', excluir: OPINION, tope: 25, url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/' },
  { categoria: 'tech', fuente: 'HN', origen: 'hn', peso: 1, prioridad: true, url: `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i%3E${hace24h},points%3E%3D10&hitsPerPage=200` },
  { categoria: 'tech', fuente: 'Lobsters', origen: 'lobsters', peso: 0.8, url: 'https://lobste.rs/hottest.json' },
  // Al final: las portadas solo marcan noticias que ya entraron.
  { categoria: 'arg', fuente: 'Portada Google News Argentina', origen: 'portada', url: `${GN}?hl=es-419&gl=AR&ceid=AR:es-419` },
  { categoria: 'global', fuente: 'Portada Google News EE.UU.', origen: 'portada', url: `${GN}?hl=es-419&gl=US&ceid=US:es-419` },
];
return fuentes.map((f) => ({ json: f }));
