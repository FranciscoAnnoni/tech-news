// Infomate · texto de la nota (nodo "Extraer texto"). Junta "Sin texto" con "Bajar nota" (mismo orden) y devuelve un solo ítem
// { textos: [{id, categoria, contenido}], sin_texto } con los primeros 2000 caracteres.
// Primero el articleBody del JSON-LD (lo publican casi todos los medios); si no hay, los párrafos <p> de 60 caracteres o más;
// si tampoco, el texto de Arc XP embebido en la página.
const MIN = 300, MAX = 2000;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', iexcl: '¡', iquest: '¿', aacute: 'á', eacute: 'é', iacute: 'í',
  oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', ccedil: 'ç', atilde: 'ã', otilde: 'õ',
  ecirc: 'ê', acirc: 'â', ocirc: 'ô', agrave: 'à', Ecirc: 'Ê', Acirc: 'Â', Ocirc: 'Ô', Agrave: 'À', Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç', ouml: 'ö', auml: 'ä', euro: '€', deg: '°' };
function ent(s) {
  return String(s || '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (x, e) => ENT[e] ?? x);
}
const limpio = (s) => ent(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function articleBody(html) {
  let mejor = '';
  const buscar = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(buscar);
    if (typeof o.articleBody === 'string' && o.articleBody.length > mejor.length) mejor = o.articleBody;
    Object.values(o).forEach(buscar);
  };
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { buscar(JSON.parse(m[1].trim())); } catch (e) { /* JSON-LD roto: se ignora */ }
  }
  return limpio(mejor);
}

// Solo <p> de verdad: `<p[^>]*>` también agarraba <picture> y <path> y arrastraba el menú del sitio.
function parrafos(html) {
  let cuerpo = html.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ');
  const art = cuerpo.match(/<article\b[^>]*>([\s\S]*)<\/article>/i);
  const leer = (h) => [...h.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((m) => limpio(m[1])).filter((p) => p.length >= 60).join(' ');
  const enArticulo = art ? leer(art[1]) : '';
  return enArticulo.length >= MIN ? enArticulo : leer(cuerpo);
}

// Sitios armados con Arc XP (Página 12, Clarín...) traen la nota en un JSON dentro de la página: {"content":"...","type":"text"}.
function arc(html) {
  return [...html.matchAll(/"content":"((?:[^"\\]|\\.)*)","type":"text"/g)]
    .map((m) => { try { return limpio(JSON.parse(`"${m[1]}"`)); } catch (e) { return ''; } })
    .filter((p) => p.length >= 40).join(' ');
}

function extraer(html) {
  if (typeof html !== 'string' || !html) return null;
  for (const lector of [articleBody, parrafos, arc]) {
    const t = lector(html);
    if (t.length >= MIN) return t.slice(0, MAX);
  }
  return null;
}

const filas = $('Sin texto').all();
const textos = [];
let sin_texto = 0;
$input.all().forEach((it, i) => {
  const f = (filas[i] || {}).json || {};
  if (!f.id) return;
  const contenido = extraer(it.json.data);
  if (contenido) textos.push({ id: f.id, categoria: f.categoria, contenido });
  else sin_texto++;
});
return [{ json: { textos, sin_texto } }];
