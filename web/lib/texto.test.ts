import { describe, expect, it } from "vitest";
import { aTarjeta, contenidoVisible, enlaceSeguro, formatearFecha, tallaDe } from "./texto";
import { MAX_CONTENIDO, type Noticia } from "./tipos";

const base: Noticia = {
  id: 1, titulo: "Original", descripcion: "Resumen", contenido: null, categoria: "ARG",
  link: "https://a.b/c", fuente: "La Nación", publicada: "2026-10-28T15:55:51Z", puntaje: 1,
};

describe("formatearFecha", () => {
  it("usa DD/MM/AAAA HH:MM en hora de Buenos Aires", () => {
    expect(formatearFecha("2026-10-28T15:55:51Z")).toBe("28/10/2026 12:55");
  });
  it("cambia de día respecto de UTC", () => {
    expect(formatearFecha("2026-10-28T01:16:23Z")).toBe("27/10/2026 22:16");
  });
  it("cambia de año respecto de UTC", () => {
    expect(formatearFecha("2027-01-01T02:30:00Z")).toBe("31/12/2026 23:30");
  });
  it("muestra la medianoche como 00", () => {
    expect(formatearFecha("2026-10-28T03:00:00Z")).toBe("28/10/2026 00:00");
  });
});

describe("contenidoVisible", () => {
  it("agrega puntos suspensivos si llegó cortado", () => {
    expect(contenidoVisible("x".repeat(MAX_CONTENIDO))).toBe(`${"x".repeat(MAX_CONTENIDO)}…`);
  });
  it("deja intacto el texto completo", () => {
    expect(contenidoVisible("corto")).toBe("corto");
  });
  it("respeta el null", () => {
    expect(contenidoVisible(null)).toBeNull();
  });
});

describe("tarjeta", () => {
  it("usa el título original y la categoría tal cual", () => {
    expect(aTarjeta({ ...base, titulo: "Patrick Stewart has died", categoria: "Tech" })).toMatchObject({
      titulo: "Patrick Stewart has died", categoria: "Tech", letras: "LA", fecha: "28/10/2026 12:55",
    });
  });
  it("no expone el puntaje", () => {
    expect(aTarjeta(base)).not.toHaveProperty("puntaje");
  });
  it("sin descripción admite un título más grande", () => {
    const largo = "x".repeat(60);
    expect(tallaDe({ ...base, titulo: largo })).toBe("m");
    expect(tallaDe({ ...base, titulo: largo, descripcion: null })).toBe("c");
  });
  it("rechaza enlaces que no son http(s)", () => {
    expect(enlaceSeguro("javascript:alert(1)")).toBe("#");
  });
});
