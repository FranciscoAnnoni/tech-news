// Prueba del parser de Infomate con ejemplos armados a mano en el formato real de cada feed.
// Uso: node probar-parser.mjs   (sale con error si algo no cumple)
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const codigo = readFileSync(new URL('./nodos/parsear.js', import.meta.url), 'utf8');
const ahora = Date.now();
const hace = (h) => new Date(ahora - h * 3600 * 1000);
const rfc = (d) => d.toUTCString();

const fuentes = [
  { categoria: 'arg', fuente: 'Infobae', seccion: 'política', origen: 'rss', excluir: '/(opinion|editoriales|lnmas|fotos)/', url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/politica/' },
  { categoria: 'arg', fuente: 'Google News Argentina', origen: 'gnews', url: 'https://news.google.com/rss/x' },
  { categoria: 'tech', fuente: 'HN', origen: 'hn', tope: 1, peso: 1, prioridad: true, url: 'https://hn.algolia.com/x' },
  { categoria: 'tech', fuente: 'Lobsters', origen: 'lobsters', url: 'https://lobste.rs/hottest.json' },
  { categoria: 'global', fuente: 'DW', origen: 'rss', url: 'https://rss.dw.com/caida' },
  { categoria: 'arg', fuente: 'Portada Google News Argentina', origen: 'portada', url: 'https://news.google.com/rss' },
];
const largo = 'Texto de la nota. '.repeat(200);
const respuestas = [
  { data: `<rss><channel>
    <item><title><![CDATA[El Gobierno anunció cambios en el Gabinete]]></title><link>https://www.infobae.com/politica/2026/11/01/gabinete/?utm_source=rss&amp;id=7</link>
      <pubDate>${rfc(hace(3))}</pubDate><description><![CDATA[<p>Copete &amp; detalle</p>]]></description><content:encoded><![CDATA[<p>${largo}</p>]]></content:encoded></item>
    <item><title>Nota vieja</title><link>https://www.infobae.com/politica/vieja/</link><pubDate>${rfc(hace(30))}</pubDate></item>
    <item><title>Calendario de pagos de ANSES: cuándo cobro en noviembre</title><link>https://www.infobae.com/economia/anses/</link><pubDate>${rfc(hace(2))}</pubDate></item>
    <item><title>Dólar hoy: a cuánto cotiza este lunes</title><link>https://www.infobae.com/economia/dolar/</link><pubDate>${rfc(hace(2))}</pubDate></item>
    <item><title>A cuánto llega la PUAM en noviembre de 2026</title><link>https://www.infobae.com/economia/puam/</link><pubDate>${rfc(hace(2))}</pubDate></item>
    <item><title>Monto de la Asignación Universal por Hijo para jubilados: de cuánto es</title><link>https://www.infobae.com/economia/auh/</link><pubDate>${rfc(hace(2))}</pubDate></item>
    <item><title>El Gobierno anunció un aumento a jubilados por decreto</title><link>https://www.infobae.com/economia/aumento/</link><pubDate>${rfc(hace(2))}</pubDate></item>
    <item><title>Una opinión</title><link>https://www.infobae.com/opinion/2026/11/01/x/</link><pubDate>${rfc(hace(2))}</pubDate></item>
  </channel></rss>` },
  { data: `<rss><channel><item><title>Paro de transporte el martes - La Nación</title><link>https://news.google.com/rss/articles/CBMiABC?oc=5</link>
    <pubDate>${rfc(hace(5))}</pubDate><description>&lt;ol&gt;&lt;li&gt;&lt;a href="https://news.google.com/rss/articles/1"&gt;Paro&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;La Nación&lt;/font&gt;&lt;/li&gt;&lt;li&gt;&lt;a href="https://news.google.com/rss/articles/2"&gt;Paro&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Clarín&lt;/font&gt;&lt;/li&gt;&lt;/ol&gt;</description>
    <source url="https://www.lanacion.com.ar">La Nación</source></item></channel></rss>` },
  { data: JSON.stringify({ hits: [
    { objectID: '1', title: 'Ask HN: What are you working on?', url: null, points: 300, num_comments: 500, created_at: hace(2).toISOString() },
    { objectID: '2', title: 'Postgres 18 released', url: 'https://www.postgresql.org/about/news/18/', points: 120, num_comments: 40, created_at: hace(4).toISOString() },
    { objectID: '3', title: 'Show HN: Mi proyecto', url: 'https://example.com/p', points: 400, num_comments: 10, created_at: hace(1).toISOString() },
  ] }) },
  { data: JSON.stringify([
    { title: 'Rust 2.0 plans', url: 'https://blog.rust-lang.org/2026/rust2', short_id_url: 'https://lobste.rs/s/abc', score: 50, comment_count: 12, created_at: hace(6).toISOString(), tags: ['rust'], description_plain: '' },
    { title: 'Lobsters meta thread', url: '', short_id_url: 'https://lobste.rs/s/def', score: 80, comment_count: 30, created_at: hace(2).toISOString(), tags: ['meta'] },
  ]) },
  { error: { message: 'getaddrinfo ENOTFOUND' } },
  { data: `<rss><channel><item><title>Paro de transporte el martes - La Nación</title><link>https://news.google.com/rss/articles/CBMiABC</link><pubDate>${rfc(hace(5))}</pubDate><source>La Nación</source></item></channel></rss>` },
];
const reddit = [{ categoria: 'tech', fuente: 'r/programming', origen: 'reddit', url: 'https://www.reddit.com/r/programming/top/.rss' }];
const redditResp = [{ data: `<feed>
  <entry><title>Nuevo compilador</title><published>${hace(3).toISOString()}</published><content type="html">&lt;a href="https://example.org/compilador"&gt;[link]&lt;/a&gt; &lt;a href="https://www.reddit.com/r/programming/comments/1"&gt;[comments]&lt;/a&gt;</content></entry>
  <entry><title>Pregunta del foro</title><published>${hace(3).toISOString()}</published><content type="html">&lt;a href="https://www.reddit.com/r/programming/comments/2"&gt;[link]&lt;/a&gt;</content></entry>
</feed>` }];

const nodos = { 'Fuentes': fuentes, 'Bajar fuentes': respuestas, 'Fuentes Reddit': reddit, 'Bajar Reddit': redditResp };
const $ = (n) => ({ all: () => nodos[n].map((json) => ({ json })) });
const [{ json: r }] = new Function('$', '$execution', codigo)($, { id: 42 });
const por = (t) => r.items.find((n) => n.titulo_original === t);

assert.equal(r.corrida, '42');

// RSS de medio: link normalizado, texto recortado a 2000, opinión y viejas afuera.
const inf = por('El Gobierno anunció cambios en el Gabinete');
assert.ok(inf, 'falta la nota de Infobae');
assert.equal(inf.link, 'https://infobae.com/politica/2026/11/01/gabinete?id=7');
assert.equal(inf.descripcion_fuente, 'Copete & detalle');
assert.equal(inf.contenido.length, 2000);
assert.equal(inf.categoria, 'arg');
assert.equal(inf.posicion, 1);
assert.ok(inf.fecha_publicacion);
assert.equal(por('Nota vieja'), undefined, 'lo de más de 24 h no entra');
assert.equal(por('Una opinión'), undefined, 'opinión no entra');
assert.equal(por('Calendario de pagos de ANSES: cuándo cobro en noviembre'), undefined, 'nota de servicio ANSES no entra');
assert.equal(por('Dólar hoy: a cuánto cotiza este lunes'), undefined, 'dólar hoy no entra');
assert.equal(por('A cuánto llega la PUAM en noviembre de 2026'), undefined, 'PUAM no entra');
assert.equal(por('Monto de la Asignación Universal por Hijo para jubilados: de cuánto es'), undefined, 'monto AUH no entra');
assert.ok(por('El Gobierno anunció un aumento a jubilados por decreto'), 'una noticia real sobre jubilados sí entra');

// Google News: sin " - Medio" en el título, medio como fuente, medios relacionados y link de Google marcado.
const gn = por('Paro de transporte el martes');
assert.ok(gn, 'falta la de Google News');
assert.equal(gn.fuente, 'La Nación');
assert.deepEqual(gn.medios, ['La Nación', 'Clarín']);
assert.ok(gn.link_google.startsWith('https://news.google.com/'));
assert.equal(gn.link, gn.link_google);

// HN: sin Ask HN, ordenado por puntos, con puntos y comentarios.
assert.equal(por('Ask HN: What are you working on?'), undefined);
assert.equal(por('Show HN: Mi proyecto').posicion, 1);
assert.equal(por('Postgres 18 released'), undefined, 'tope 1 en HN: solo entra la más votada');

// Lobsters: sin meta. Reddit: solo posts con link afuera.
assert.ok(por('Rust 2.0 plans'));
assert.equal(por('Lobsters meta thread'), undefined);
assert.equal(por('Nuevo compilador').link, 'https://example.org/compilador');
assert.equal(por('Pregunta del foro'), undefined);

// Portadas aparte; fuente caída anotada sin cortar.
assert.deepEqual(r.portadas, [{ categoria: 'arg', titulo: 'Paro de transporte el martes' }]);
assert.equal(r.items.filter((n) => n.titulo_original === 'Paro de transporte el martes').length, 1);
assert.match(r.estado['DW'], /^ERROR: getaddrinfo/);

// Feed, lugar y prioridad para el puntaje previo.
assert.equal(inf.feed, 'Infobae política');
assert.ok(Math.abs(inf.lugar - 0.85) < 1e-9, 'la 1.ª de un feed con peso por defecto vale 0.85');
assert.equal(inf.prioridad, false);
const top = por('Show HN: Mi proyecto');
assert.equal(top.lugar, 1); assert.equal(top.prioridad, true);
assert.equal(gn.feed, 'Google News Argentina');

console.log(`PARSER OK (${r.items.length} ítems)`);
