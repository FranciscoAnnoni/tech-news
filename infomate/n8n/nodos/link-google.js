// Infomate · link real de Google News (nodo "Link real"). Lee la respuesta de batchexecute y devuelve un solo ítem
// { links: [{id, categoria, link}], fallas } para guardarlo de una vez. Junta "Firma Google" con "Decodificar Google", en orden.
function normLink(u) {
  const m = String(u || '').trim().match(/^https?:\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?/i);
  if (!m) return null;
  const host = m[1].toLowerCase().replace(/^www\./, '');
  const path = m[2].replace(/[\/\\\s]+$/, '');
  const q = (m[3] || '').slice(1).split('&').filter((kv) => kv && !/^(utm_[^=]*|ref|source|fbclid|gclid|ocid)(=|$)/i.test(kv)).join('&');
  return 'https://' + host + path + (q ? '?' + q : '');
}
const firmas = $('Firma Google').all();
const links = [];
let fallas = 0;
$input.all().forEach((it, i) => {
  const f = (firmas[i] || {}).json || {};
  if (!f.id) return;
  try {
    const datos = JSON.parse(String(it.json.data).split('\n\n')[1]);
    const link = normLink(JSON.parse(datos[0][2])[1]);
    if (!link || link.includes('news.google.com')) throw new Error('sin link');
    links.push({ id: f.id, categoria: f.categoria, link });
  } catch (e) {
    fallas++;
  }
});
return [{ json: { links, fallas } }];
