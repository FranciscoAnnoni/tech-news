import { PantallaAnalitica } from "@/componentes/Analitica";
import { Diario } from "@/componentes/Diario";
import { Mazo } from "@/componentes/Mazo";
import { nDesdeParametro, tarjetasDelMazo } from "@/lib/mazo";
import { obtenerNoticias } from "@/lib/noticias";
import { diaDeBuenosAires, fechaDeEdicion, numeroDeEdicion } from "@/lib/edicion";

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { n } = await searchParams;
  const noticias = await obtenerNoticias();
  const tarjetas = tarjetasDelMazo(noticias, nDesdeParametro(n));
  // La edición es el día del archivo; si no viene (ejemplo local), el día de hoy en Buenos Aires.
  const dia = noticias.find((nota) => nota.edicion)?.edicion ?? diaDeBuenosAires(new Date());
  return (
    <>
      <PantallaAnalitica pantalla="mazo" />
      <div data-portada="mazo">
        <Mazo tarjetas={tarjetas} />
      </div>
      <div data-portada="diario">
        <Diario tarjetas={tarjetas} fecha={fechaDeEdicion(dia)} numero={numeroDeEdicion(dia)} />
      </div>
    </>
  );
}
