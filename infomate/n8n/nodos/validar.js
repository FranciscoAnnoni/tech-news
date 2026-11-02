// Infomate · validar al juez (nodos "Validar" y "Validar reintento"). Junta los pedidos con las respuestas de OpenRouter
// (mismo orden) y devuelve un solo ítem { juicios, malas, fallidas, costo }:
//   juicios: [{id, categoria, titulo_es, resumen, puntaje, motivo}] que cumplen el contrato;
//   malas:   los pedidos que no cumplieron (en el primer nodo van al reintento);
//   fallidas: las que fallaron también en el reintento (quedan sin puntaje);
//   costo:   USD de OpenRouter por categoría.
// construir.py cambia ORIGEN a 'Reintentos' en el segundo nodo, que suma lo del primero.
const ORIGEN = 'Pedidos al juez';
const PRIMERA = ORIGEN === 'Pedidos al juez';

function revisar(r) {
  const c = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
  if (!c) return null;
  let j;
  try { j = JSON.parse(c); } catch (e) { return null; }
  const texto = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!texto(j.titulo_es, 200) || !texto(j.resumen, 1000) || !texto(j.motivo, 200)) return null;
  if (!Number.isInteger(j.puntaje) || j.puntaje < 0 || j.puntaje > 100) return null;
  return { titulo_es: j.titulo_es.trim(), resumen: j.resumen.trim(), puntaje: j.puntaje, motivo: j.motivo.trim() };
}

const previo = PRIMERA ? { juicios: [], costo: {} } : $('Validar').first().json;
const juicios = [...previo.juicios];
const costo = { ...previo.costo };
const malas = [];
const pedidos = $(ORIGEN).all();
$input.all().forEach((it, i) => {
  const p = (pedidos[i] || {}).json || {};
  if (!p.id) return;
  const r = it.json || {};
  const usd = r.usage && typeof r.usage.cost === 'number' ? r.usage.cost : 0;
  costo[p.categoria] = Math.round(((costo[p.categoria] || 0) + usd) * 1e6) / 1e6;
  const j = revisar(r);
  if (j) juicios.push({ id: p.id, categoria: p.categoria, ...j });
  else malas.push(p);
});
return [{ json: { juicios, malas: PRIMERA ? malas : [], fallidas: PRIMERA ? 0 : malas.length, costo } }];
