// Noticias Tech · fuentes del recolector (mismo código que el nodo "Fuentes"). Sin IA.
// cupo = cuántas noticias NUEVAS entran por día de esa fuente (las ya guardadas no gastan cupo).
// Orden pensado para Reddit: el HTTP baja de a 1 con 30 s de pausa, así entre dos pedidos a Reddit pasan ≥ 60 s
// (Reddit permite ~1 pedido por minuto; seguidos dan 429). Reddit .json está bloqueado (403): se usa el RSS, que ya viene ordenado por votos.
const hace24h = Math.floor(Date.now() / 1000) - 86400;
const R = 'https://www.reddit.com/r';
const fuentes = [
  { fuente: 'r/technology',  tipo: 'reddit', cupo: 2, url: `${R}/technology/top/.rss?t=day&limit=10` },
  { fuente: 'hn',            tipo: 'hn',     cupo: 5, url: `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i%3E${hace24h},points%3E30&hitsPerPage=50` },
  { fuente: 'r/programming', tipo: 'reddit', cupo: 2, url: `${R}/programming/top/.rss?t=day&limit=10` },
  // Lobsters (2026-10-28) reemplaza a Dev.to, que era casi todo opinión. hottest trae ~25 de las últimas ~40 h:
  // lo que reaparece al otro día se actualiza solo (puntos y corridas) en tech_ingresar, sin refresco aparte.
  { fuente: 'lobsters',      tipo: 'lobsters', cupo: 5, url: 'https://lobste.rs/hottest.json' },
  { fuente: 'r/artificial',  tipo: 'reddit', cupo: 1, url: `${R}/artificial/top/.rss?t=day&limit=10` },
  // refrescar: no agrega noticias, solo actualiza puntos y comentarios de las ya guardadas (se capturan con pocas horas de vida).
  { fuente: 'hn·refresco',   tipo: 'hn',     refrescar: true, url: `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i%3E${hace24h - 2 * 86400},points%3E30&hitsPerPage=1000` },
];
return fuentes.map((f) => ({ json: f }));
