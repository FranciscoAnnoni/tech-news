// Infomate · parser (mismo código que el nodo "Parsear"). Sin IA.
// Junta cada fuente con su respuesta (mismo orden: "Fuentes" con "Bajar fuentes" y "Fuentes Reddit" con "Bajar Reddit")
// y devuelve un solo ítem: { corrida, items, portadas, estado }. Solo entra lo publicado en las últimas 24 h.

const MAX_POR_FUENTE = 100;
const FUERA_HN = /^(ask hn|tell hn|who is hiring|who wants to be hired|freelancer\? seeking freelancer)\b/i;
const TAGS_FUERA = ['meta', 'event', 'ask'];
// Notas de servicio (se compara sin acentos y en minúsculas): no son noticias para la edición.
const SERVICIO = /\b(calendario de (pagos|cobros?)|cuando cobro|cuanto cobro|fechas? de cobro|dolar (hoy|blue hoy)|a cuanto (abre|cotiza|cerro) el dolar|cotizacion del dolar|pronostico del (tiempo|clima)|alerta (amarilla|naranja|roja)? ?por (tormentas|lluvias|calor|viento|nevadas)|horoscopo|loteria|quiniela|quini 6|loto plus|telekino|brinco|resultados del sorteo|efemerides|santoral|a cuanto llega|asi quedo la tabla|tabla de posiciones|los puntajes de)\b|\b(anses|auh|puam|suaf|pnc|jubilad[oa]s?|jubilaciones)\b.*\b(cuanto|cuando|calendario|monto|bono|fechas?|cobr[ao])\b|\b(cuanto|cuando|calendario|monto|bono|fechas?)\b.*\b(anses|auh|puam|suaf|pnc|jubilad[oa]s?|jubilaciones)\b/;
const sinAcentos = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function ent(s) {
  if (!s) return '';
  const m = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, e) => m[e]);
}
const sinHtml = (s) => ent(ent(s)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (b, t) => { const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? m[1] : ''; };
const corto = (s, n) => (s && s.length > n ? s.slice(0, n) : s || null);
const fecha = (s) => { s = sinHtml(s); return s && !isNaN(Date.parse(s)) ? new Date(s).toISOString() : null; };

// Mismo link escrito distinto = misma nota: sin http/www, sin utm_*, sin # ni / final. (Sin new URL(): no existe en n8n.)
function normLink(u) {
  const m = String(u || '').trim().match(/^https?:\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?/i);
  if (!m) return null;
  const host = m[1].toLowerCase().replace(/^www\./, '');
  const path = m[2].replace(/[\/\\\s]+$/, '');
  const q = (m[3] || '').slice(1).split('&').filter((kv) => kv && !/^(utm_[^=]*|ref|source|fbclid|gclid|ocid)(=|$)/i.test(kv)).join('&');
  return 'https://' + host + path + (q ? '?' + q : '');
}

function base(f, i) {
  return { categoria: f.categoria, fuente: f.fuente, posicion: i + 1, titulo_original: null, link: null, link_google: null,
    descripcion_fuente: null, contenido: null, fecha_publicacion: null, puntos: null, comentarios: null, medios: [f.fuente] };
}

function rss(txt, f) {
  const bloques = txt.match(/<item[\s>][\s\S]*?<\/item>/g) || txt.match(/<entry[\s>][\s\S]*?<\/entry>/g) || [];
  return bloques.map((b, i) => {
    const n = base(f, i);
    n.titulo_original = sinHtml(tag(b, 'title'));
    n.link = normLink(sinHtml(tag(b, 'link')) || (b.match(/<link[^>]*href="([^"]+)"/) || [])[1]);
    n.fecha_publicacion = fecha(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'));
    n.descripcion_fuente = corto(sinHtml(tag(b, 'description') || tag(b, 'summary')), 600);
    const texto = sinHtml(tag(b, 'content:encoded'));
    if (texto.length >= 300) n.contenido = corto(texto, 2000);
    if (f.excluir && n.link && new RegExp(f.excluir).test(n.link)) return null;
    return n;
  });
}

// Google News: el título trae " - Medio" al final y la descripción lista hasta 5 medios que cubren la noticia.
// El link de Google News no se puede resolver: va en link_google y también en link hasta que aparezca el del medio.
function gnews(txt, f) {
  return (txt.match(/<item>[\s\S]*?<\/item>/g) || []).map((b, i) => {
    const n = base(f, i);
    const medio = sinHtml(tag(b, 'source'));
    const desc = ent(tag(b, 'description'));
    const relacionados = (desc.match(/<font[^>]*>([^<]+)<\/font>/g) || []).map((x) => sinHtml(x));
    n.titulo_original = sinHtml(tag(b, 'title')).replace(new RegExp(`\\s+-\\s+${medio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    n.link_google = sinHtml(tag(b, 'link'));
    n.link = n.link_google;
    n.fuente = medio || f.fuente;
    n.fecha_publicacion = fecha(tag(b, 'pubDate'));
    n.medios = [...new Set([medio, ...relacionados].filter(Boolean))];
    return n;
  });
}

function hn(txt, f) {
  return (JSON.parse(txt).hits || []).sort((a, b) => b.points - a.points).map((h, i) => {
    if (FUERA_HN.test(h.title || '')) return null;
    const n = base(f, i);
    n.titulo_original = h.title;
    n.link = normLink(h.url || `https://news.ycombinator.com/item?id=${h.objectID}`);
    n.descripcion_fuente = !h.url && h.story_text ? corto(sinHtml(h.story_text), 600) : null;
    n.puntos = h.points; n.comentarios = h.num_comments; n.fecha_publicacion = fecha(h.created_at);
    return n;
  });
}

function lobsters(txt, f) {
  return JSON.parse(txt).map((s, i) => {
    if ((s.tags || []).some((t) => TAGS_FUERA.includes(t))) return null;
    const n = base(f, i);
    n.titulo_original = s.title;
    n.link = normLink(s.url || s.short_id_url);
    n.descripcion_fuente = corto(s.description_plain || null, 600);
    n.puntos = s.score; n.comentarios = s.comment_count; n.fecha_publicacion = fecha(s.created_at);
    return n;
  });
}

// Reddit: solo posts que linkean afuera; los de texto o imagen son charla del foro.
function reddit(txt, f) {
  return (txt.match(/<entry>[\s\S]*?<\/entry>/g) || []).map((e, i) => {
    const html = ent(tag(e, 'content'));
    const ext = (html.match(/<a href="([^"]+)">\[link\]<\/a>/) || [])[1];
    if (!ext || /reddit\.com|redd\.it/.test(ext)) return null;
    const n = base(f, i);
    n.titulo_original = sinHtml(tag(e, 'title'));
    n.link = normLink(ent(ext));
    n.fecha_publicacion = fecha(tag(e, 'published') || tag(e, 'updated'));
    return n;
  });
}

function parsear(pares, ahora) {
  const desde = ahora - 24 * 3600 * 1000;
  const items = [], portadas = [], estado = {};
  for (const [f, r] of pares) {
    const clave = f.fuente + (f.seccion ? ' ' + f.seccion : '');
    const txt = r && typeof r.data === 'string' ? r.data : null;
    if (!txt) { estado[clave] = 'ERROR: ' + String((r && r.error && (r.error.message || r.error)) || 'sin respuesta').slice(0, 200); continue; }
    try {
      const lector = { rss, portada: gnews, gnews, hn, lobsters, reddit }[f.origen];
      const leidos = lector(txt, f).filter((n) => n && n.titulo_original && n.link)
        .filter((n) => !n.fecha_publicacion || Date.parse(n.fecha_publicacion) >= desde)
        .filter((n) => n.categoria === 'tech' || !SERVICIO.test(sinAcentos(n.titulo_original)))
        .slice(0, f.tope || MAX_POR_FUENTE);
      // Lugar en el feed (0-1) por el peso de la fuente: el 1.º vale 1 y el último 1/n. Ver infomate_puntaje_previo.
      leidos.forEach((n, i) => { n.feed = clave; n.lugar = (1 - i / leidos.length) * (f.peso ?? 0.85); n.prioridad = !!f.prioridad && i === 0; });
      if (f.origen === 'portada') leidos.forEach((n) => portadas.push({ categoria: f.categoria, titulo: n.titulo_original }));
      else items.push(...leidos);
      estado[clave] = leidos.length;
    } catch (e) {
      estado[clave] = 'ERROR: ' + String(e.message).slice(0, 200);
    }
  }
  return { items, portadas, estado };
}

const zip = (a, b) => a.map((x, i) => [x.json, (b[i] || {}).json]);
const pares = [...zip($('Fuentes').all(), $('Bajar fuentes').all()), ...zip($('Fuentes Reddit').all(), $('Bajar Reddit').all())];
return [{ json: { corrida: String($execution.id), ...parsear(pares, Date.now()) } }];
