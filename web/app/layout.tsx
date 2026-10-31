import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CAPTURA_INSTALACION } from "@/lib/instalacion";
import { metadatosMarca } from "@/lib/preview";
import { urlBase } from "@/lib/urlPublica";
import "./globals.css";

export const metadata: Metadata = {
  // Una sola base para todas las URLs de metadatos (imagen del preview incluida); sale de la misma variable que los links.
  metadataBase: new URL(urlBase()),
  // Marca por defecto de toda la app. Las páginas que definen `openGraph`/`twitter` lo reemplazan entero (merge superficial).
  ...metadatosMarca(),
  icons: {
    icon: "/iconos/icono-192.png",
    apple: [{ url: "/iconos/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Infomate", statusBarStyle: "default" },
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
