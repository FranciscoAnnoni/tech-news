import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "El mazo de hoy",
    short_name: "Mazo",
    description: "Lector diario de noticias en tarjetas.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#f4c93c",
    background_color: "#f4c93c",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
