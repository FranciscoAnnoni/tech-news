import { describe, expect, it } from "vitest";
import { ESTADO_INICIAL, nDesdeParametro, reducirMazo, seleccionarMazo, textoFin } from "./mazo";
import type { Categoria, Noticia } from "./tipos";

const nota = (id: number, categoria: Categoria, puntaje: number) => ({ id, categoria, puntaje }) as Noticia;
const noticias = [
  nota(21, "Tech", 7.1),
  nota(2, "ARG", 8),
  nota(1, "ARG", 9),
  nota(12, "Global", 10),
  nota(3, "ARG", 7),
  nota(11, "Global", 11),
];

describe("seleccionarMazo", () => {
  it("intercala ARG, Global y Tech, cada una por su puntaje", () => {
    expect(seleccionarMazo(noticias, 10).map((n) => n.id)).toEqual([1, 11, 21, 2, 12, 3]);
  });
  it("corta en n", () => {
    expect(seleccionarMazo(noticias, 4).map((n) => n.id)).toEqual([1, 11, 21, 2]);
  });
  it("incluye todas las noticias cuando no se indica un límite", () => {
    expect(seleccionarMazo(noticias).map((n) => n.id)).toEqual([1, 11, 21, 2, 12, 3]);
  });
  it("no reordena la entrada", () => {
    seleccionarMazo(noticias, 1);
    expect(noticias[0].id).toBe(21);
  });
});

describe("nDesdeParametro", () => {
  it.each([
    [undefined, undefined],
    ["15", 15],
    [["3", "4"], 3],
    ["0", undefined],
    ["-2", undefined],
    ["hola", undefined],
  ])("%j da %j", (valor, esperado) => {
    expect(nDesdeParametro(valor)).toBe(esperado);
  });
});

it("cuenta abiertas y descartadas, y reinicia", () => {
  let e = reducirMazo(ESTADO_INICIAL, { tipo: "resolver", indice: 0, resolucion: "abierta" });
  e = reducirMazo(e, { tipo: "resolver", indice: 1, resolucion: "descartada" });
  e = reducirMazo(e, { tipo: "resolver", indice: 2, resolucion: "descartada" });
  e = reducirMazo(e, { tipo: "avanzar", hasta: 3 });
  expect(e.indice).toBe(3);
  expect(textoFin(e)).toBe("Abriste 1 y descartaste 2.");
  expect(reducirMazo(e, { tipo: "reiniciar" })).toEqual(ESTADO_INICIAL);
});
