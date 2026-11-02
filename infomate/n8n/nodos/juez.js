// Infomate · pedidos al juez (nodo "Pedidos al juez"). Un ítem por candidata sin juzgar: { id, categoria, body }.
// body es el pedido completo al endpoint de chat de OpenRouter. Los prompts los arma construir.py desde prompts/ al desplegar.
const PROMPTS = /*PROMPTS*/{};
// Elegidos en el paso 7 con una prueba a ciegas.
const MODELOS = { global: 'openai/gpt-6-luna', arg: 'openai/gpt-6-luna', tech: 'anthropic/claude-haiku-5.5' };
const FORMATO = { type: 'json_schema', json_schema: { name: 'juicio', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['titulo_es', 'resumen', 'puntaje', 'motivo'],
  properties: { titulo_es: { type: 'string' }, resumen: { type: 'string' }, puntaje: { type: 'integer' }, motivo: { type: 'string' } } } } };

return $input.all().map((it) => it.json).filter((n) => n.id).map((n) => ({ json: {
  id: n.id, categoria: n.categoria,
  body: {
    model: MODELOS[n.categoria],
    messages: [
      { role: 'system', content: PROMPTS[n.categoria] },
      // Una prioritaria sin texto (por ejemplo un Show HN que es un sitio) va con el copete del feed.
      { role: 'user', content: `Título: ${n.titulo_original}\nFuente: ${n.fuente}\nPublicada: ${n.fecha || 'sin fecha'}\nTexto:\n${n.texto || '(sin texto)'}` },
    ],
    response_format: FORMATO,
    provider: { require_parameters: true },
    reasoning: { effort: 'low' },
    max_tokens: 4000,
    usage: { include: true },
  },
} }));
