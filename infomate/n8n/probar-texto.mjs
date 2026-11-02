// Prueba de los nodos de texto y de Google News con páginas de ejemplo armadas a mano.
// Uso: node probar-texto.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const correr = (archivo, nodos, entrada) => {
  const codigo = readFileSync(new URL(`./nodos/${archivo}`, import.meta.url), 'utf8');
  const $ = (n) => ({ all: () => nodos[n].map((json) => ({ json })) });
  const $input = { all: () => entrada.map((json) => ({ json })) };
  return new Function('$', '$input', codigo)($, $input);
};

const cuerpo = 'El Gobierno presentó hoy el proyecto de presupuesto con cambios en impuestos y gasto público. '.repeat(30);

// 1) JSON-LD con articleBody (dentro de @graph), 2) solo <p>, 3) muro de pago (poco texto), 4) página que no bajó,
// 5) página con menú, <picture>/<path> y entidades como &rsquo;.
const paginas = [
  { data: `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"NewsArticle","articleBody":${JSON.stringify(cuerpo)}}]}</script></head><body><p>Suscribite</p></body></html>` },
  { data: `<html><body><script>var x = "<p>${'no '.repeat(40)}</p>";</script><p>Menú</p><p>${'Primer párrafo largo de la nota con datos concretos sobre la elección en Bariloche. '.repeat(3)}</p><p>${'Segundo párrafo con más detalles, declaraciones y contexto de la jornada electoral. '.repeat(3)}</p></body></html>` },
  { data: '<html><body><p>Para seguir leyendo, suscribite a nuestro diario por solo $999 al mes.</p></body></html>' },
  { error: { message: 'timeout' } },
  { data: `<html><body><header><p>Ir al menú principal Ir a más sitios de DW Últimos videos Últimos audios Noticias</p></header>`
      + `<picture><source srcset="x.jpg"></picture><svg><path d="M0 0"/></svg><nav><p>Inicia sesión BBC News Mundo Ir al contenido Noticias Video Mis Noticias</p></nav>`
      + `<article><h1>Título</h1><p>${'La policía detuvo a casi 800 personas tras las protestas de la noche del sábado en varias ciudades. '.repeat(3)}</p>`
      + `<p>${'El ministro dijo que no habrá más tolerancia y que la investigación sigue abierta. '.repeat(3)}</p><p>It&rsquo;s fine &amp; good &mdash; Presid&ecirc;ncia ${'x'.repeat(60)}</p></article>`
      + `<footer><p>${'Pie de página con enlaces legales y de contacto del medio. '.repeat(3)}</p></footer></body></html>` },
  { data: `<html><body><h1>Weretilneck festejó</h1><script>Fusion.globalContent={"content_elements":[`
      + `{"_id":"A","additional_properties":{},"content":"${'A las 18 horas cerraron las mesas y los primeros resultados apuntaron al oficialismo. '.repeat(3)}","type":"text"},`
      + `{"_id":"B","content":"Todav\\u00eda quedaba contabilizar el 67% de las mesas, con <b>ventaja</b> clara para la lista oficial del intendente.","type":"text"}]}</script></body></html>` },
];
const filas = [1, 2, 3, 4, 5, 6].map((i) => ({ id: `id${i}`, categoria: 'arg', url: `https://medio.com/${i}` }));
const [{ json: t }] = correr('texto.js', { 'Sin texto': filas }, paginas);
const por = (id) => t.textos.find((x) => x.id === id);

assert.equal(por('id1').contenido.length, 2000, 'JSON-LD: recorta a 2000');
assert.ok(por('id1').contenido.startsWith('El Gobierno presentó hoy'));
assert.ok(por('id2').contenido.startsWith('Primer párrafo largo'), 'sin JSON-LD: usa los <p> largos');
assert.ok(!por('id2').contenido.includes('Menú') && !por('id2').contenido.includes('no no'), 'ignora <p> cortos y scripts');
assert.equal(por('id3'), undefined, 'muro de pago: sin texto');
assert.equal(por('id4'), undefined, 'página que no bajó: sin texto');
assert.equal(t.sin_texto, 2);
assert.ok(por('id5').contenido.startsWith('La policía detuvo'), 'empieza por la nota, no por el menú');
assert.ok(!/menú|Inicia sesión|Pie de página/.test(por('id5').contenido), 'sin menú, nav ni pie');
assert.ok(por('id5').contenido.includes('It’s fine & good — Presidência'), 'decodifica &rsquo; &amp; &mdash; &ecirc;');
assert.ok(por('id6').contenido.startsWith('A las 18 horas'), 'Arc XP: lee el texto embebido');
assert.ok(por('id6').contenido.includes('Todavía quedaba contabilizar el 67% de las mesas, con ventaja clara'), 'Arc XP: decodifica \\u y saca etiquetas');

// Google News: firma desde la página y link real desde la respuesta de batchexecute.
const gfilas = [
  { id: 'g1', categoria: 'global', url: 'https://news.google.com/rss/articles/CBMiABC123?oc=5' },
  { id: 'g2', categoria: 'global', url: 'https://news.google.com/rss/articles/CBMiSINFIRMA' },
];
const gpaginas = [{ data: '<c-wiz><div jscontroller="x" data-n-a-sg="FIRMA_SG" data-n-a-ts="1793590000"></div></c-wiz>' }, { data: '<html>sin firma</html>' }];
const firmas = correr('firma-google.js', { 'Google a decodificar': gfilas }, gpaginas);
assert.equal(firmas.length, 1, 'solo la que tiene firma');
assert.equal(firmas[0].json.id, 'g1');
assert.ok(firmas[0].json.freq.includes('CBMiABC123') && firmas[0].json.freq.includes('FIRMA_SG') && firmas[0].json.freq.includes('1793590000'));

const respuesta = ")]}'\n\n" + JSON.stringify([['wrb.fr', 'Fbv4je', JSON.stringify(['garturlres', 'https://www.cnn.com/2026/11/02/nota/?utm_source=x', 1]), null]]);
const [{ json: l }] = correr('link-google.js', { 'Firma Google': firmas.map((f) => f.json) }, [{ data: respuesta }]);
assert.deepEqual(l.links, [{ id: 'g1', categoria: 'global', link: 'https://cnn.com/2026/11/02/nota' }]);
const [{ json: l2 }] = correr('link-google.js', { 'Firma Google': firmas.map((f) => f.json) }, [{ error: { message: '429' } }]);
assert.equal(l2.fallas, 1);

console.log('TEXTO Y GOOGLE OK');
