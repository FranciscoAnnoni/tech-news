// Infomate · fuentes de Reddit (nodo "Fuentes Reddit"). El nodo HTTP que sigue espera 65 s entre pedidos:
// con 35 s Reddit devolvió 429 en el relevamiento. El RSS de top del día ya viene ordenado por votos.
const R = 'https://www.reddit.com/r';
return ['technology', 'programming', 'artificial'].map((s) => ({
  json: { categoria: 'tech', fuente: `r/${s}`, origen: 'reddit', peso: 0.7, url: `${R}/${s}/top/.rss?t=day&limit=25` },
}));
