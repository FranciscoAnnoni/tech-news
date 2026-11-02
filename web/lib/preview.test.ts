import { expect, it } from "vitest";
import { metadatosPreview, metadatosMarca } from "./preview";

const IMAGEN = { url: "/og-infomate.png", width: 1200, height: 630, alt: "Infomate" };

it("la marca lleva solo Infomate, con la imagen fija y tarjeta grande", () => {
  const m = metadatosMarca();
  expect(m.title).toBe("Infomate");
  expect(m.openGraph).toMatchObject({ title: "Infomate", siteName: "Infomate", type: "website", images: [IMAGEN] });
  expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Infomate", images: [IMAGEN] });
});

it("una Noticia pone su título y su URL pública sobre la misma imagen", () => {
  const m = metadatosPreview({
    titulo: "Un título",
    descripcion: "Un resumen",
    url: "https://ejemplo.test/noticia/tech-1",
  });
  expect(m.title).toBe("Un título");
  expect(m.description).toBe("Un resumen");
  expect(m.openGraph).toMatchObject({
    title: "Un título",
    description: "Un resumen",
    url: "https://ejemplo.test/noticia/tech-1",
    siteName: "Infomate",
    type: "article",
    images: [IMAGEN],
  });
  expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Un título", images: [IMAGEN] });
});

it("sin descripción propia usa la de la marca", () => {
  const m = metadatosPreview({ titulo: "T", descripcion: null, url: "https://x.test/noticia/tech-1" });
  expect(m.description).toBe(metadatosMarca().description);
});

it("no pone la URL en la marca", () => {
  expect(metadatosMarca().openGraph).not.toHaveProperty("url");
});
