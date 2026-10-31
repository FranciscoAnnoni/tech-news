import { Mazo } from "@/componentes/Mazo";
import { nDesdeParametro, tarjetasDelMazo } from "@/lib/mazo";
import { obtenerNoticias } from "@/lib/noticias";

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { n } = await searchParams;
  return <Mazo tarjetas={tarjetasDelMazo(await obtenerNoticias(), nDesdeParametro(n))} />;
}
