import { describe, expect, it } from "vitest";
import { analiticaHabilitada, idGoogleAnalytics } from "./analiticaConfig";

describe("habilitación de analítica", () => {
  it("habilita producción o una prueba explícita", () => {
    expect(analiticaHabilitada("production", undefined)).toBe(true);
    expect(analiticaHabilitada("preview", "true")).toBe(true);
    expect(analiticaHabilitada("preview", undefined)).toBe(false);
    expect(analiticaHabilitada(undefined, "false")).toBe(false);
  });
});

describe("idGoogleAnalytics", () => {
  it("acepta un ID de medición y lo normaliza", () => {
    expect(idGoogleAnalytics(" g-abc123XYZ ")).toBe("G-ABC123XYZ");
  });

  it.each([undefined, "", "UA-12345-1", "G-", "G-<script>", "GTM-ABC123"])("no carga Google Analytics con %s", (valor) => {
    expect(idGoogleAnalytics(valor)).toBeNull();
  });
});
