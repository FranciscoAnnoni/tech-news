import { describe, expect, it } from "vitest";
import { firmaDelMazo, guardarProgreso, leerProgreso } from "./progreso";

function almacen() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

const hoy = firmaDelMazo(["a", "b", "c"]);

describe("progreso", () => {
  it("recuerda el progreso de la misma edición", () => {
    const a = almacen();
    guardarProgreso(a, hoy, { indice: 3, resoluciones: { 0: "abierta", 1: "descartada", 2: "descartada" } });
    expect(leerProgreso(a, hoy, 3)).toEqual({ indice: 3, resoluciones: { 0: "abierta", 1: "descartada", 2: "descartada" } });
  });

  it("arranca de cero cuando llegan noticias nuevas", () => {
    const a = almacen();
    guardarProgreso(a, hoy, { indice: 3, resoluciones: {} });
    expect(leerProgreso(a, firmaDelMazo(["d", "e", "f"]), 3)).toBeNull();
  });

  it("no pasa del final si el mazo es más corto", () => {
    const a = almacen();
    guardarProgreso(a, hoy, { indice: 9, resoluciones: {} });
    expect(leerProgreso(a, hoy, 3)?.indice).toBe(3);
  });

  it.each(["no es json", "null", '{"firma":"a,b,c","indice":-1,"resoluciones":{}}', '{"firma":"a,b,c","indice":1}'])(
    "ignora lo guardado inválido: %s",
    (valor) => {
      expect(leerProgreso({ getItem: () => valor, setItem: () => {} }, hoy, 3)).toBeNull();
    },
  );

  it("no rompe si el almacenamiento está bloqueado", () => {
    const bloqueado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
    expect(leerProgreso(bloqueado, hoy, 3)).toBeNull();
    expect(() => guardarProgreso(bloqueado, hoy, { indice: 1, resoluciones: {} })).not.toThrow();
  });
});
