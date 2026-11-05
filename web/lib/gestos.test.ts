import { describe, expect, it } from "vitest";
import { buscaNoticias, direccionDelGesto, tironDeRecarga, UMBRAL_RECARGA, UMBRAL_VOLVER, vuelveALasTarjetas } from "./gestos";

describe("dirección del gesto", () => {
  it("no decide con un movimiento mínimo", () => {
    expect(direccionDelGesto(3, 4)).toBeNull();
  });

  it("es horizontal solo si domina con claridad", () => {
    expect(direccionDelGesto(-40, 10)).toBe("horizontal");
    expect(direccionDelGesto(30, 28)).toBe("vertical");
    expect(direccionDelGesto(2, 60)).toBe("vertical");
  });
});

describe("volver a las tarjetas desde el Detalle", () => {
  it("vuelve al deslizar a la izquierda pasado el umbral", () => {
    expect(vuelveALasTarjetas(-UMBRAL_VOLVER, 0)).toBe(true);
    expect(vuelveALasTarjetas(-UMBRAL_VOLVER + 1, 0)).toBe(false);
  });

  it("vuelve con un deslizamiento corto y rápido", () => {
    expect(vuelveALasTarjetas(-50, -0.8)).toBe(true);
    expect(vuelveALasTarjetas(-30, -0.8)).toBe(false);
  });

  it("deslizar a la derecha no vuelve", () => {
    expect(vuelveALasTarjetas(200, 1.5)).toBe(false);
  });
});

describe("buscar noticias tirando hacia abajo", () => {
  it("busca al soltar pasado el umbral", () => {
    expect(buscaNoticias(0, UMBRAL_RECARGA)).toBe(true);
    expect(buscaNoticias(0, UMBRAL_RECARGA - 1)).toBe(false);
  });

  it("no busca si el gesto es más de costado que hacia abajo", () => {
    expect(buscaNoticias(90, 120)).toBe(false);
  });

  it("no busca hacia arriba", () => {
    expect(buscaNoticias(0, -200)).toBe(false);
  });

  it("el aviso sigue al dedo con resistencia y tiene tope", () => {
    expect(tironDeRecarga(-20)).toBe(0);
    expect(tironDeRecarga(40)).toBe(24);
    expect(tironDeRecarga(1000)).toBe(UMBRAL_RECARGA);
  });
});
