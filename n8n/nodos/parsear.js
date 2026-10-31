// Noticias Tech · parser (mismo código que el nodo "Parsear y limpiar"). Sin IA.
// Entrada: la respuesta (texto) de cada fuente, en el mismo orden que "Fuentes".
// Salida: hasta 10 candidatas por fuente, ordenadas de la más votada a la menos; el SQL aplica el cupo.
// Las fuentes con refrescar van aparte (link + puntos + comentarios) para actualizar las ya guardadas.

const MAX_POR_FUENTE = 10;
// No son noticias: preguntas, avisos de empleo, cosas internas de Lobsters (meta, encuentros, preguntas).
const FUERA = /^(ask hn|tell hn|who is hiring|who wants to be hired|freelancer\? seeking freelancer)\b/i;
const TAGS_FUERA = ['meta', 'event', 'ask'];

function ent(s) {
  if (!s) return '';
  const m = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, e) => m[e]);
}
const sinHtml = (s) => ent(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Mismo link escrito distinto = misma nota: sin http/www, sin utm_*, sin # ni / final.
// (Sin new URL(): no existe en el sandbox de los nodos Code de n8n.)
function normLink(u) {
  const m = String(u || '').trim().match(/^https?:\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?/i);
  if (!m) return null;
  const host = m[1].toLowerCase().replace(/^www\./, '');
  const path = m[2].replace(/[\/\\\s]+$/, '');   // HN a veces trae una \ al final
  const q = (m[3] || '').slice(1).split('&').filter((kv) => kv && !/^(utm_[^=]*|ref|source|fbclid|gclid)(=|$)/i.test(kv)).join('&');
  return 'https://' + host + path + (q ? '?' + q : '');
}
const dominio = (u) => { const m = String(u || '').match(/^https?:\/\/([^\/?#]+)/i); return m ? m[1].toLowerCase().replace(/^www\./, '') : null; };
const fecha = (s) => (s && !isNaN(Date.parse(s)) ? new Date(s).toISOString() : null);
const corto = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || null);

function hn(txt) {
  const hits = JSON.parse(txt).hits || [];
  return hits.sort((a, b) => b.points - a.points).map((h) => {
    const disc = `https://news.ycombinator.com/item?id=${h.objectID}`;
    const link = h.url || disc;
    return { titulo: h.title, link, discusion: disc, dominio: h.url ? dominio(h.url) : 'news.ycombinator.com',
      descripcion: !h.url && h.story_text ? corto(sinHtml(h.story_text), 500) : null,   // con link, el texto de HN suelen ser URLs sueltas
      puntos: h.points, comentarios: h.num_comments, publicada: fecha(h.created_at), tags: [] };
  });
}

function reddit(xml) {
  return (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).map((e) => {
    const titulo = sinHtml((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const disc = ((e.match(/<link href="([^"]+)"/) || [])[1] || '').trim();
    const html = ent((e.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1] || '');
    const ext = (html.match(/<a href="([^"]+)">\[link\]<\/a>/) || [])[1];
    if (!ext || /reddit\.com|redd\.it/.test(ext)) return null;   // post de texto o imagen: es charla del foro, no una noticia
    const link = ext;
    const cuerpo = sinHtml(html.replace(/<a href="[^"]+">\[(link|comments)\]<\/a>/g, '').replace(/submitted by[\s\S]*$/i, ''));
    return { titulo, link, discusion: disc, dominio: dominio(link), descripcion: corto(cuerpo, 500),
      puntos: null, comentarios: null, publicada: fecha((e.match(/<published>([^<]+)</) || e.match(/<updated>([^<]+)</) || [])[1]), tags: [] };
  }).filter(Boolean);
}

function lobsters(txt) {
  return JSON.parse(txt)
    .filter((a) => a.url && !(a.tags || []).some((t) => TAGS_FUERA.includes(t)))   // sin url = post de texto, charla del foro
    .sort((a, b) => b.score - a.score)
    .map((a) => ({ titulo: a.title, link: a.url, discusion: a.comments_url, dominio: dominio(a.url),
      descripcion: corto(a.description_plain, 500), puntos: a.score, comentarios: a.comment_count,
      publicada: fecha(a.created_at), tags: a.tags || [] }));
}

const PARSERS = { hn, reddit, lobsters };
const fuentes = $('Fuentes').all().map((i) => i.json);
const estado = {};
let items = [];
let refrescar = [];
$input.all().forEach((r, i) => {
  const f = fuentes[i];
  const txt = r.json.data;
  if (r.json.error || !txt || typeof txt !== 'string') {
    estado[f.fuente] = 'ERROR: ' + ((r.json.error && (r.json.error.message || r.json.error)) || 'respuesta vacía');
    return;
  }
  let lista;
  try { lista = PARSERS[f.tipo](txt); } catch (e) { estado[f.fuente] = 'ERROR: no se pudo leer (' + e.message + ')'; return; }
  const vistos = new Set();
  lista = lista.filter((n) => {
    n.titulo = sinHtml(n.titulo);
    n.link = normLink(n.link);
    if (!n.titulo || !n.link || FUERA.test(n.titulo) || vistos.has(n.link)) return false;   // repetida dentro de la misma fuente
    vistos.add(n.link);
    return true;
  });
  if (f.refrescar) {
    refrescar = refrescar.concat(lista.map((n) => ({ fuente: f.tipo, link: n.link, puntos: n.puntos, comentarios: n.comentarios })));
    estado[f.fuente] = lista.length;
    return;
  }
  lista = lista.slice(0, MAX_POR_FUENTE);
  lista.forEach((n, k) => { n.fuente = f.fuente; n.cupo = f.cupo; n.posicion = k + 1; n.discusion = n.discusion ? normLink(n.discusion) : null; });
  estado[f.fuente] = lista.length;
  items = items.concat(lista);
});
const corrida = $now.setZone('America/Argentina/Buenos_Aires').toFormat("yyyy-LL-dd'T'HH:mm");
return [{ json: { corrida, total: items.length, estado, items, refrescar } }];
