// Infomate · validar al juez (nodos "Validar" y "Validar reintento"). Junta los pedidos con las respuestas de OpenRouter
// (mismo orden) y devuelve un solo ítem { juicios, malas, fallidas, costo }:
//   juicios: [{id, categoria, titulo_es, resumen, puntaje, motivo}] que cumplen el contrato;
//   malas:   los pedidos que no cumplieron (en el primer nodo van al reintento). Si solo se pasó de largo,
//            el pedido lleva la respuesta del juez y le pide acortarla;
//   fallidas: las que fallaron también en el reintento (quedan sin puntaje);
//   costo:   USD de OpenRouter por categoría.
// construir.py cambia ORIGEN a 'Reintentos' en el segundo nodo, que suma lo del primero.
const ORIGEN = 'Pedidos al juez';
const PRIMERA = ORIGEN === 'Pedidos al juez';
// Lo que entra en la tarjeta sin scroll (medido en la web, 03/11/2026). Tiene que coincidir con prompts/juez-base.md.
const MAX_TITULO = 110;
const MAX_RESUMEN = 380;

// Devuelve { juicio } si cumple; { largo, contenido } si solo se pasó de largo; null si no sirve.
function revisar(r) {
  const c = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
  if (!c) return null;
  let j;
  try { j = JSON.parse(c); } catch (e) { return null; }
  const texto = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!texto(j.titulo_es) || !texto(j.resumen) || !texto(j.motivo) || j.motivo.length > 200) return null;
  if (!Number.isInteger(j.puntaje) || j.puntaje < 0 || j.puntaje > 100) return null;
  const juicio = { titulo_es: j.titulo_es.trim(), resumen: j.resumen.trim(), puntaje: j.puntaje, motivo: j.motivo.trim() };
  if (juicio.titulo_es.length > MAX_TITULO || juicio.resumen.length > MAX_RESUMEN) {
    return { largo: { titulo: juicio.titulo_es.length, resumen: juicio.resumen.length }, contenido: c };
  }
  return { juicio };
}

// El reintento sigue la conversación: el juez ve su respuesta y cuánto se pasó.
function acortar(p, { largo, contenido }) {
  const pedido = `Te pasaste de largo: titulo_es tiene ${largo.titulo} caracteres (máximo ${MAX_TITULO}) y resumen tiene ${largo.resumen} (máximo ${MAX_RESUMEN}). `
    + 'Devolvé el mismo JSON con titulo_es y resumen más cortos, dentro de esos máximos. No cambies puntaje ni motivo.';
  return { ...p, body: { ...p.body, messages: [...p.body.messages, { role: 'assistant', content: contenido }, { role: 'user', content: pedido }] } };
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
  if (j && j.juicio) juicios.push({ id: p.id, categoria: p.categoria, ...j.juicio });
  else malas.push(j ? acortar(p, j) : p);
});
return [{ json: { juicios, malas: PRIMERA ? malas : [], fallidas: PRIMERA ? 0 : malas.length, costo } }];
