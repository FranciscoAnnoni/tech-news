// Prueba de los nodos del juez: pedidos y validación (con reintento). Uso: node probar-juez.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const leer = (archivo) => readFileSync(new URL(`./nodos/${archivo}`, import.meta.url), 'utf8');
const correr = (codigo, nodos, entrada) => {
  const $ = (n) => ({ all: () => nodos[n].map((json) => ({ json })), first: () => ({ json: nodos[n][0] }) });
  const $input = { all: () => entrada.map((json) => ({ json })) };
  return new Function('$', '$input', codigo)($, $input);
};

// Pedidos: modelo por categoría, prompt de su categoría, nota sin texto con copete, y el ítem vacío de alwaysOutputData se ignora.
const juez = leer('juez.js').replace('/*PROMPTS*/{}', JSON.stringify({ global: 'P-global', arg: 'P-arg', tech: 'P-tech' }));
const notas = [
  { id: 'a', categoria: 'global', titulo_original: 'T1', fuente: 'BBC', fecha: '02/11/2026 10:00', texto: 'cuerpo' },
  { id: 'b', categoria: 'tech', titulo_original: 'Show HN: X', fuente: 'HN', fecha: null, texto: null },
  {},
];
const pedidos = correr(juez, {}, notas).map((i) => i.json);
assert.equal(pedidos.length, 2);
assert.equal(pedidos[0].body.model, 'openai/gpt-6-luna');
assert.equal(pedidos[1].body.model, 'anthropic/claude-haiku-5.5');
assert.equal(pedidos[0].body.messages[0].content, 'P-global');
assert.ok(pedidos[1].body.messages[1].content.includes('(sin texto)'));
assert.ok(pedidos[1].body.messages[1].content.includes('sin fecha'));
assert.equal(pedidos[0].body.response_format.json_schema.strict, true);
assert.equal(pedidos[0].body.temperature, undefined, 'Haiku y Luna no aceptan temperature');

// Validar: buena, resumen largo (600) que entra igual, JSON roto, puntaje fuera de rango, clave faltante, error de HTTP.
const resp = (o, cost = 0.001) => ({ choices: [{ message: { content: typeof o === 'string' ? o : JSON.stringify(o) } }], usage: { cost } });
const bueno = { titulo_es: 'Título', resumen: 'Resumen.', puntaje: 70, motivo: 'Porque sí.' };
const ps = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, categoria: 'arg', body: {} }));
const resps = [
  resp(bueno),
  resp({ ...bueno, resumen: 'x'.repeat(600) }),
  resp('{"titulo_es": "roto"'),
  resp({ ...bueno, puntaje: 140 }),
  resp({ titulo_es: 'T', resumen: 'R', puntaje: 50 }),
  { error: { message: '503' } },
];
const validar = leer('validar.js');
const v1 = correr(validar, { 'Pedidos al juez': ps }, resps)[0].json;
assert.deepEqual(v1.juicios.map((j) => j.id), ['p1', 'p2'], 'entran la buena y la de resumen largo');
assert.deepEqual(v1.malas.map((m) => m.id), ['p3', 'p4', 'p5', 'p6']);
assert.equal(v1.fallidas, 0);
assert.equal(v1.costo.arg, 0.005);

// Reintento: p3 sale bien, p4 vuelve a fallar; p5 y p6 también. Suma lo del primer nodo.
const validar2 = validar.replace("const ORIGEN = 'Pedidos al juez';", "const ORIGEN = 'Reintentos';");
const v2 = correr(validar2, { Reintentos: v1.malas, Validar: [v1] },
  [resp(bueno), resp({ ...bueno, puntaje: -1 }), resp('nada'), { error: {} }])[0].json;
assert.deepEqual(v2.juicios.map((j) => j.id), ['p1', 'p2', 'p3']);
assert.equal(v2.fallidas, 3);
assert.deepEqual(v2.malas, []);
assert.equal(v2.costo.arg, 0.008);

// Sin nada que juzgar: el ítem vacío de alwaysOutputData no rompe y no suma.
const v3 = correr(validar, { 'Pedidos al juez': [{}] }, [{ error: {} }])[0].json;
assert.deepEqual(v3, { juicios: [], malas: [], fallidas: 0, costo: {} });

console.log('JUEZ OK');
