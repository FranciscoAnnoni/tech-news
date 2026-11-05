import { describe, expect, it } from "vitest";
import { BORDE_VOLVER, empiezaEnElBorde, esTironDesdeElBorde, UMBRAL_VOLVER, vuelveALasTarjetas } from "./gestos";

describe("volver a las tarjetas desde el Detalle", () => {
  it("solo arranca desde la franja del borde izquierdo", () => {
    expect(empiezaEnElBorde(BORDE_VOLVER, 0)).toBe(true);
    expect(empiezaEnElBorde(BORDE_VOLVER + 1, 0)).toBe(false);
    expect(empiezaEnElBorde(30, 20)).toBe(true);
  });

  it("acepta un tirón en diagonal hacia la derecha", () => {
    expect(esTironDesdeElBorde(60, 0)).toBe(true);
    expect(esTironDesdeElBorde(60, 100)).toBe(true);
    expect(esTironDesdeElBorde(40, 100)).toBe(false);
    expect(esTironDesdeElBorde(-60, 0)).toBe(false);
  });

  it("vuelve pasado el umbral hacia la derecha", () => {
    expect(vuelveALasTarjetas(UMBRAL_VOLVER, 0)).toBe(true);
    expect(vuelveALasTarjetas(UMBRAL_VOLVER - 1, 0)).toBe(false);
  });

  it("vuelve con un tirón corto y rápido", () => {
    expect(vuelveALasTarjetas(50, 0.8)).toBe(true);
    expect(vuelveALasTarjetas(30, 0.8)).toBe(false);
  });

  it("hacia la izquierda no vuelve", () => {
    expect(vuelveALasTarjetas(-200, -1.5)).toBe(false);
  });
});
