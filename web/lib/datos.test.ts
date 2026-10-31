import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { seleccionarMazo } from "./mazo";
import { CATEGORIAS, MAX_CONTENIDO, MAX_DESCRIPCION, type DatosNoticias } from "./tipos";

const datos: DatosNoticias = JSON.parse(readFileSync(path.join(process.cwd(), "datos", "noticias.json"), "utf8"));
const CAMPOS = ["categoria", "contenido", "descripcion", "fuente", "id", "link", "publicada", "puntaje", "titulo"];

describe("datos/noticias.json", () => {
  it("es plano, con generado y noticias", () => {
    expect(Object.keys(datos).sort()).toEqual(["generado", "noticias"]);
    expect(datos.noticias).toHaveLength(15);
  });

  it.each(datos.noticias.map((n) => [n.id, n] as const))("la nota %i cumple la forma", (_id, n) => {
    expect(Object.keys(n).sort()).toEqual(CAMPOS);
    expect(Number.isInteger(n.id)).toBe(true);
    expect(n.titulo).not.toBe("");
    expect(CATEGORIAS).toContain(n.categoria);
    expect(n.link).toMatch(/^https:\/\//);
    expect(n.publicada).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(typeof n.puntaje).toBe("number");
    if (n.descripcion !== null) expect(n.descripcion.length).toBeLessThanOrEqual(MAX_DESCRIPCION);
    if (n.contenido !== null) expect(n.contenido.length).toBeLessThanOrEqual(MAX_CONTENIDO);
  });

  it("mapea cada sección del export a su categoría", () => {
    const ids = (c: string) => datos.noticias.filter((n) => n.categoria === c).map((n) => n.id).sort((a, b) => a - b);
    expect(ids("ARG")).toEqual([6200, 6209, 6218, 6482, 6483]);
    expect(ids("Global")).toEqual([6096, 6107, 6166, 6390, 6444]);
    expect(ids("Tech")).toEqual([339, 340, 341, 354, 356]);
  });

  it("mantiene el mazo por defecto", () => {
    expect(seleccionarMazo(datos.noticias, 10).map((n) => n.id)).toEqual([6200, 6107, 341, 6482, 6390, 340, 6209, 6444, 339, 6218]);
  });
});
