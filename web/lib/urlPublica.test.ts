import { afterEach, expect, it, vi } from "vitest";
import { URL_PUBLICA_POR_DEFECTO, urlPublica } from "./urlPublica";

afterEach(() => vi.unstubAllEnvs());

it.each([
  ["https://infomate.ar", "https://infomate.ar/noticia/tech-123"],
  ["https://infomate.ar/", "https://infomate.ar/noticia/tech-123"],
  ["https://infomate.ar///", "https://infomate.ar/noticia/tech-123"],
  ["http://localhost:3000/", "http://localhost:3000/noticia/tech-123"],
])("arma la URL desde la base %s", (base, esperada) => {
  expect(urlPublica("tech-123", base)).toBe(esperada);
});

it("sin base explícita lee NEXT_PUBLIC_URL_PUBLICA", () => {
  vi.stubEnv("NEXT_PUBLIC_URL_PUBLICA", "https://ejemplo.test/");
  expect(urlPublica("arg-7")).toBe("https://ejemplo.test/noticia/arg-7");
});

it.each([undefined, "", "   "])("con base %j usa infomate.ar", (base) => {
  vi.stubEnv("NEXT_PUBLIC_URL_PUBLICA", base);
  expect(urlPublica("tech-123")).toBe("https://infomate.ar/noticia/tech-123");
  expect(URL_PUBLICA_POR_DEFECTO).toBe("https://infomate.ar");
});
