import { describe, expect, it } from "vitest";
import { alternarEquipo, ENTRE_TOQUES_MS, esEquipo, sumarToque, TOQUES } from "./equipo";

function almacen() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  };
}

describe("modo equipo", () => {
  it("se activa y se desactiva", () => {
    const a = almacen();
    expect(esEquipo(a)).toBe(false);
    expect(alternarEquipo(a)).toBe(true);
    expect(esEquipo(a)).toBe(true);
    expect(alternarEquipo(a)).toBe(false);
    expect(esEquipo(a)).toBe(false);
  });

  it("con el almacenamiento bloqueado no está activo y no rompe", () => {
    const roto = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => {} };
    expect(esEquipo(roto)).toBe(false);
    expect(alternarEquipo(roto)).toBe(false);
  });
});

describe("sumarToque", () => {
  it(`${TOQUES} toques seguidos completan la racha`, () => {
    let racha = { cantidad: 0, ultimo: 0 };
    let completa = false;
    for (let i = 1; i <= TOQUES; i++) ({ completa, ...racha } = sumarToque(racha, 10_000 + i * 300));
    expect(completa).toBe(true);
    expect(racha.cantidad).toBe(0);
  });

  it("una pausa larga reinicia la cuenta", () => {
    let racha = { cantidad: 0, ultimo: 0 };
    let completa = false;
    let t = 10_000;
    for (let i = 0; i < TOQUES - 1; i++) ({ completa, ...racha } = sumarToque(racha, (t += 300)));
    ({ completa, ...racha } = sumarToque(racha, (t += ENTRE_TOQUES_MS + 1)));
    expect(completa).toBe(false);
    expect(racha.cantidad).toBe(1);
  });
});
