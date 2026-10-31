import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CAPTURA_INSTALACION } from "@/lib/instalacion";
import "./globals.css";

export const metadata: Metadata = {
  title: "El mazo de hoy",
  description: "Lector diario de noticias en tarjetas.",
  icons: {
    icon: "/iconos/icono-192.png",
    apple: [{ url: "/iconos/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Mazo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4c93c",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CAPTURA_INSTALACION }} />
      </head>
      <body>
        <div id="telefono">{children}</div>
      </body>
    </html>
  );
}
