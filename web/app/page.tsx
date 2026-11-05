import { Suspense } from "react";
import { PantallaAnalitica } from "@/componentes/Analitica";
import { Cargando } from "@/componentes/Cargando";
import { Diario } from "@/componentes/Diario";
import { Mazo } from "@/componentes/Mazo";
import { nDesdeParametro, tarjetasDelMazo } from "@/lib/mazo";
import { obtenerNoticias } from "@/lib/noticias";
import { diaDeBuenosAires, fechaDeEdicion, numeroDeEdicion } from "@/lib/edicion";

type Busqueda = Promise<{ [clave: string]: string | string[] | undefined }>;

/** Lo que espera a las noticias. Separado para que la pantalla de carga salga antes, en el mismo HTML. */
async function Portada({ searchParams }: { searchParams: Busqueda }) {
  const { n } = await searchParams;
  const noticias = await obtenerNoticias();
  const tarjetas = tarjetasDelMazo(noticias, nDesdeParametro(n));
  // La edición es el día del archivo; si no viene (ejemplo local), el día de hoy en Buenos Aires.
  const dia = noticias.find((nota) => nota.edicion)?.edicion ?? diaDeBuenosAires(new Date());
  return (
    <>
      <div data-portada="mazo">
        <Mazo tarjetas={tarjetas} />
      </div>
      <div data-portada="diario">
        <Diario tarjetas={tarjetas} fecha={fechaDeEdicion(dia)} numero={numeroDeEdicion(dia)} />
      </div>
    </>
  );
}

// Solo la portada tiene pantalla de carga: un loading.tsx en app/ envolvería también /noticia/[identificador].
export default function Pagina({ searchParams }: { searchParams: Busqueda }) {
  return (
    <>
      <PantallaAnalitica pantalla="mazo" />
      {/* El número es el de hoy: antes de que salga la edición del día, puede ir uno adelante del que se carga. */}
      <Suspense fallback={<Cargando numero={numeroDeEdicion(new Date())} />}>
        <Portada searchParams={searchParams} />
      </Suspense>
    </>
  );
}
