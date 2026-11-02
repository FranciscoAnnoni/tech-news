import { describe, expect, it } from "vitest";
import { buscarNoticiaPublica, identificadorDe } from "./noticiaPublica";
import type { Categoria, Noticia } from "./tipos";

/** `publicada` es ISO en UTC con sufijo Z, como en datos/noticias.json. */
const nota = (id: number, categoria: Categoria, publicada: string) => ({ id, categoria, publicada }) as Noticia;

const PUBLICADA = "2026-10-24T12:00:00Z";
const SIETE_DIAS = new Date("2026-10-31T12:00:00Z");
const noticias = [nota(123, "Tech", PUBLICADA), nota(7, "ARG", PUBLICADA), nota(7, "Global", PUBLICADA)];

describe("identificadorDe", () => {
  it("une la categoría en minúsculas y el id", () => {
    expect(identificadorDe(noticias[0])).toBe("tech-123");
  });
});

describe("buscarNoticiaPublica", () => {
  it("devuelve la Noticia si pasaron menos de 7 días", () => {
    const ahora = new Date("2026-10-26T00:00:00Z");
    expect(buscarNoticiaPublica("tech-123", noticias, ahora)).toEqual({ disponible: true, noticia: noticias[0] });
  });

  it("con exactamente 7 días todavía es válida", () => {
    expect(buscarNoticiaPublica("tech-123", noticias, SIETE_DIAS)).toEqual({ disponible: true, noticia: noticias[0] });
  });

  it("un instante después de los 7 días ya no está disponible", () => {
    const ahora = new Date(SIETE_DIAS.getTime() + 1);
    expect(buscarNoticiaPublica("tech-123", noticias, ahora)).toEqual({ disponible: false });
  });

  it("una Noticia vencida hace tiempo no está disponible", () => {
    expect(buscarNoticiaPublica("tech-123", noticias, new Date("2027-01-01T00:00:00Z"))).toEqual({ disponible: false });
  });

  it("una Noticia fuera de los datos no está disponible", () => {
    expect(buscarNoticiaPublica("tech-999", noticias, SIETE_DIAS)).toEqual({ disponible: false });
  });

  it.each(["", "tech", "tech-", "123", "tech-12a", "tech-0123", "tech--1", "tech-1.5", "tech-123-x", " tech-123", "TECH-123"])(
    "el identificador mal formado %j no está disponible",
    (identificador) => {
      expect(buscarNoticiaPublica(identificador, noticias, SIETE_DIAS)).toEqual({ disponible: false });
    },
  );

  it("una categoría desconocida no está disponible", () => {
    expect(buscarNoticiaPublica("deportes-123", noticias, SIETE_DIAS)).toEqual({ disponible: false });
  });

  it("el mismo id en dos categorías no se confunde", () => {
    expect(buscarNoticiaPublica("arg-7", noticias, SIETE_DIAS)).toEqual({ disponible: true, noticia: noticias[1] });
    expect(buscarNoticiaPublica("global-7", noticias, SIETE_DIAS)).toEqual({ disponible: true, noticia: noticias[2] });
    expect(buscarNoticiaPublica("tech-7", noticias, SIETE_DIAS)).toEqual({ disponible: false });
  });

  it("una fecha de publicación ilegible no está disponible", () => {
    expect(buscarNoticiaPublica("tech-1", [nota(1, "Tech", "ayer")], SIETE_DIAS)).toEqual({ disponible: false });
  });
});
