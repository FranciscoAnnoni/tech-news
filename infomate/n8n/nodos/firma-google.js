// Infomate · firma de Google News (nodo "Firma Google"). Método no oficial, probado en relevamiento/decodificar-gn.py:
// la página del artículo trae data-n-a-sg y data-n-a-ts, que se mandan a batchexecute (RPC Fbv4je) para obtener el link del medio.
// Junta cada candidata ("Google a decodificar") con su página ("Página Google"), en el mismo orden.
const filas = $('Google a decodificar').all();
const out = [];
$input.all().forEach((it, i) => {
  const f = (filas[i] || {}).json || {};
  const html = typeof it.json.data === 'string' ? it.json.data : '';
  const sg = (html.match(/data-n-a-sg="([^"]+)"/) || [])[1];
  const ts = (html.match(/data-n-a-ts="([^"]+)"/) || [])[1];
  const gid = (String(f.url || '').match(/\/articles\/([^?]+)/) || [])[1];
  if (!f.id || !sg || !ts || !gid) return;
  const req = ['Fbv4je', `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${gid}",${ts},"${sg}"]`];
  out.push({ json: { id: f.id, categoria: f.categoria, freq: JSON.stringify([[req]]) } });
});
return out;
