import { describe, expect, it } from "vitest";
import { depurarMedicion } from "./rendimiento";

describe("depuración de Speed Insights", () => {
  it("agrupa las noticias y elimina identificadores, query y fragmento de la URL", () => {
    expect(depurarMedicion({ url: "https://infomate.example/noticia/tech-123?email=a@example.com#secreto", route: "/noticia/[identificador]", value: 42 })).toEqual({
      url: "/noticia/[identificador]", route: "/noticia/[identificador]", value: 42,
    });
  });

  it("agrupa rutas de noticia inválidas sin transmitir sus segmentos", () => {
    expect(depurarMedicion({ url: "/noticia/persona@example.com/extra?x=y", route: "/noticia/[identificador]" })).toEqual({
      url: "/noticia/[identificador]", route: "/noticia/[identificador]",
    });
  });

  it("conserva la raíz sin query ni fragmento", () => {
    expect(depurarMedicion({ url: "/?email=a@example.com#secreto", route: "/" })).toEqual({ url: "/", route: "/" });
    expect(depurarMedicion({ url: "https://infomate.example/" })).toEqual({ url: "/" });
  });

  it("descarta rutas desconocidas (404), incluidos segmentos con email literal o codificado", () => {
    expect(depurarMedicion({ url: "/persona@example.com", route: "/persona@example.com" })).toBeNull();
    expect(depurarMedicion({ url: "https://infomate.example/ruta-desconocida/private-test%40example.com?email=x#f", route: "/ruta-desconocida/private-test%40example.com" })).toBeNull();
    expect(depurarMedicion({ url: "/ruta-desconocida/private-test%40example.com" })).toBeNull();
  });

  it("descarta la medición si el route original no es una ruta conocida aunque la URL lo sea", () => {
    expect(depurarMedicion({ url: "/noticia/tech-1", route: "/noticia/private-test%40example.com" })).toBeNull();
    expect(depurarMedicion({ url: "/", route: "/otra/persona@example.com" })).toBeNull();
  });

  it("descarta URLs malformadas", () => {
    expect(depurarMedicion({ url: "http://[::1", route: "/" })).toBeNull();
  });
});
