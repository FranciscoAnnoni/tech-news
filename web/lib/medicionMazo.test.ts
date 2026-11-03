import { describe, expect, it } from "vitest";
import { conteosFinales, contextoNoticia, crearMedicionMazo } from "./medicionMazo";
import type { TarjetaNoticia } from "./tipos";

describe("medición del mazo", () => {
  it("deduplica por identificador completo y reinicia para cada recorrido", () => {
    const primero = crearMedicionMazo("uno");
    expect(primero.iniciar()).toBe(true);
    expect(primero.iniciar()).toBe(false);
    expect(primero.ver("arg-7")).toBe(true);
    expect(primero.ver("arg-7")).toBe(false);
    expect(primero.ver("global-7")).toBe(true);
    expect(crearMedicionMazo("dos").ver("arg-7")).toBe(true);
  });
  it("no completa un mazo vacío y completa uno no vacío una sola vez", () => {
    const medicion = crearMedicionMazo("uno");
    expect(medicion.completar(0)).toBe(false);
    expect(medicion.completar(2)).toBe(true);
    expect(medicion.completar(2)).toBe(false);
  });
  it("cuenta últimas resoluciones y omite información privada del contexto", () => {
    expect(conteosFinales({ indice: 2, resoluciones: { 0: "abierta", 1: "descartada" } })).toEqual({ abiertas: 1, descartadas: 1 });
    const tarjeta: TarjetaNoticia = {
      id: 7, identificador: "2026-11-02-tech-7", categoria: "Tech", fuente: "Fuente",
      titulo: "privado", descripcion: null, contenido: null, talla: "m", letras: "FU",
      tono: 0, fecha: "hoy", link: "https://example.com",
    };
    expect(contextoNoticia(tarjeta)).toEqual({ identificador: "2026-11-02-tech-7", categoria: "Tech", fuente: "Fuente", edicion: "2026-11-02" });
  });
});
