import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONSULTA_DIARIO } from "./portada";

describe("corte de la portada", () => {
  it("globals.css usa la misma consulta que el Mazo, una sola vez", () => {
    const css = readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");
    const medias = [...css.matchAll(/@media ([^{]+)\{/g)].map((m) => m[1].trim());
    expect(medias.filter((m) => m === CONSULTA_DIARIO)).toHaveLength(1);
    expect(medias.filter((m) => m.includes("699px") || m.includes("500px"))).toHaveLength(1);
  });
});
