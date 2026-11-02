import { describe, expect, it } from "vitest";
import { depurarMedicion } from "./rendimiento";

describe("depuración de Speed Insights", () => {
  it("agrupa las noticias y elimina identificadores, query y fragmento de ambos campos", () => {
    expect(depurarMedicion({ url: "https://infomate.example/noticia/tech-123?email=a@example.com#secreto", route: "/noticia/tech-123?utm_source=x#fragmento", value: 42 })).toEqual({
      url: "/noticia/[identificador]", route: "/noticia/[identificador]", value: 42,
    });
  });

  it("agrupa rutas de noticia inválidas sin transmitir sus segmentos", () => {
    expect(depurarMedicion({ url: "/noticia/persona@example.com/extra?x=y", route: "/noticia/[identificador]" })).toEqual({
      url: "/noticia/[identificador]", route: "/noticia/[identificador]",
    });
  });

  it("conserva la raíz y reemplaza cualquier otra ruta por una categoría fija", () => {
    expect(depurarMedicion({ url: "/?email=a@example.com#secreto", route: "/" })).toEqual({ url: "/", route: "/" });
    expect(depurarMedicion({ url: "/persona@example.com", route: "/desconocida/valor" })).toEqual({ url: "/otra", route: "/otra" });
  });
});
