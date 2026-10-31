import type { Metadata } from "next";

const NOMBRE = "Infomate";
const DESCRIPCION = "Lector diario de noticias en tarjetas.";

/** Imagen fija de 1200x630, la misma para todas las Noticias. Relativa: la absolutiza `metadataBase` del layout raíz. */
const IMAGEN = { url: "/og-infomate.png", width: 1200, height: 630, alt: NOMBRE };

/** Marca sola, sin datos de ninguna Noticia: home y páginas no disponibles. */
export function metadatosMarca(): Metadata {
  return {
    title: NOMBRE,
    description: DESCRIPCION,
    openGraph: { title: NOMBRE, description: DESCRIPCION, siteName: NOMBRE, type: "website", images: [IMAGEN] },
    twitter: { card: "summary_large_image", title: NOMBRE, description: DESCRIPCION, images: [IMAGEN] },
  };
}

/** Preview de una Noticia disponible. `url` ya es absoluta. */
export function metadatosPreview({
  titulo,
  descripcion,
  url,
}: {
  titulo: string;
  descripcion: string | null;
  url: string;
}): Metadata {
  const resumen = descripcion?.trim() || DESCRIPCION;
  return {
    title: titulo,
    description: resumen,
    openGraph: { title: titulo, description: resumen, url, siteName: NOMBRE, type: "article", images: [IMAGEN] },
    twitter: { card: "summary_large_image", title: titulo, description: resumen, images: [IMAGEN] },
  };
}
