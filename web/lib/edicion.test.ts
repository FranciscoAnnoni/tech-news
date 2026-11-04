import { describe, expect, it } from "vitest";
import { diaDeBuenosAires, fechaDeEdicion, numeroDeEdicion, PRIMERA_EDICION } from "./edicion";

describe("numeroDeEdicion", () => {
  it("el 2/11/2026 es la edición 1", () => {
    expect(numeroDeEdicion(PRIMERA_EDICION)).toBe(1);
  });
  it("suma uno por día de calendario", () => {
    expect(numeroDeEdicion("2026-11-03")).toBe(2);
    expect(numeroDeEdicion("2027-01-01")).toBe(61);
  });
  it("cuenta el día de Buenos Aires, no el de UTC", () => {
    // 23:30 del 2/11 en Buenos Aires son las 02:30 del 3/11 en UTC.
    expect(numeroDeEdicion(new Date("2026-11-03T02:30:00Z"))).toBe(1);
    expect(numeroDeEdicion(new Date("2026-11-03T03:00:00Z"))).toBe(2);
  });
  it("dos corridas del mismo día son la misma edición", () => {
    expect(numeroDeEdicion(new Date("2026-11-03T10:00:00Z"))).toBe(numeroDeEdicion(new Date("2026-11-04T02:00:00Z")));
  });
  it("rechaza formatos desconocidos", () => {
    expect(numeroDeEdicion("03/11/2026")).toBeNull();
  });
});

describe("diaDeBuenosAires", () => {
  it("usa el huso de Buenos Aires", () => {
    expect(diaDeBuenosAires(new Date("2026-11-03T02:59:00Z"))).toBe("2026-11-02");
  });
});

describe("fechaDeEdicion", () => {
  it("escribe el día de la edición sin depender del huso", () => {
    expect(fechaDeEdicion("2026-11-03")).toBe("martes, 3 de noviembre de 2026");
  });
  it("rechaza formatos desconocidos", () => {
    expect(fechaDeEdicion("03/11/2026")).toBeNull();
  });
});
