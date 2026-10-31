import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BotonCompartir } from "@/componentes/BotonCompartir";
import { Detalle } from "@/componentes/Detalle";
import estilosDetalle from "@/componentes/Detalle.module.css";
import { NoticiaNoDisponible } from "@/componentes/NoticiaNoDisponible";
import { buscarNoticia } from "@/lib/noticias";
import { metadatosMarca, metadatosPreview } from "@/lib/preview";
import { aTarjeta } from "@/lib/texto";
import { urlPublica } from "@/lib/urlPublica";

// Sin buscadores, también cuando no está disponible. `noindex` no impide que WhatsApp o Slack lean el preview.
const SIN_BUSCADORES: Metadata["robots"] = { index: false, follow: false };

/**
 * Preview del link. Disponible: título de la Noticia. No disponible (vencida, desconocida, inválida):
 * solo la marca, sin dato alguno de la Noticia aunque exista. `openGraph` y `twitter` se reemplazan enteros
 * al definirlos acá, por eso cada rama los trae completos.
 */
export async function generateMetadata({ params }: { params: Promise<{ identificador: string }> }): Promise<Metadata> {
  // La vigencia depende de la hora: sin esto el preview de un link vencido podría quedar congelado.
  await connection();
  const { identificador } = await params;
  const resultado = await buscarNoticia(identificador, new Date());
  if (!resultado.disponible) return { ...metadatosMarca(), robots: SIN_BUSCADORES };
  const { titulo, descripcion } = aTarjeta(resultado.noticia);
  return {
    ...metadatosPreview({ titulo, descripcion, url: urlPublica(identificador) }),
    robots: SIN_BUSCADORES,
  };
}

export default async function PaginaNoticia({ params }: { params: Promise<{ identificador: string }> }) {
  // El vencimiento depende de la hora: nunca se prerenderiza ni se guarda en caché.
  await connection();
  const { identificador } = await params;
  const resultado = await buscarNoticia(identificador, new Date());
  if (!resultado.disponible) return <NoticiaNoDisponible />;
  const tarjeta = aTarjeta(resultado.noticia);
  return (
    <Detalle
      tarjeta={tarjeta}
      variante="pagina"
      compartir={<BotonCompartir identificador={tarjeta.identificador} titulo={tarjeta.titulo} />}
      cierre={
        <Link className={estilosDetalle.boton} href="/">
          Ver las noticias de hoy
        </Link>
      }
    />
  );
}
