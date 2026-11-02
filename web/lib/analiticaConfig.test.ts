import { describe, expect, it } from "vitest";
import { analiticaHabilitada } from "./analiticaConfig";

describe("habilitación de analítica", () => {
  it("habilita producción o una prueba explícita", () => {
    expect(analiticaHabilitada("production", undefined)).toBe(true);
    expect(analiticaHabilitada("preview", "true")).toBe(true);
    expect(analiticaHabilitada("preview", undefined)).toBe(false);
    expect(analiticaHabilitada(undefined, "false")).toBe(false);
  });
});
