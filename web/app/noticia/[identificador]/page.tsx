import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Detalle } from "@/componentes/Detalle";
import estilosDetalle from "@/componentes/Detalle.module.css";
import { NoticiaNoDisponible } from "@/componentes/NoticiaNoDisponible";
import { buscarNoticia } from "@/lib/noticias";
import { aTarjeta } from "@/lib/texto";

/**
 * Sin buscadores, también cuando no está disponible. #7 reemplaza esto por generateMetadata
 * (título para el preview) y debe conservar `robots` y llamar `await connection()` por la fecha.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PaginaNoticia({ params }: { params: Promise<{ identificador: string }> }) {
  // El vencimiento depende de la hora: nunca se prerenderiza ni se guarda en caché.
  await connection();
  const { identificador } = await params;
  const resultado = await buscarNoticia(identificador, new Date());
  if (!resultado.disponible) return <NoticiaNoDisponible />;
  return (
    <Detalle
      tarjeta={aTarjeta(resultado.noticia)}
      variante="pagina"
      cierre={
        <Link className={estilosDetalle.boton} href="/">
          Ver las noticias de hoy
        </Link>
      }
    />
  );
}
