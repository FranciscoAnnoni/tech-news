import { Suspense } from "react";
import { PantallaAnalitica } from "@/componentes/Analitica";
import { Cargando } from "@/componentes/Cargando";
import { Diario } from "@/componentes/Diario";
import { ErrorPortada } from "@/componentes/ErrorPortada";
import { Mazo } from "@/componentes/Mazo";
import { PrototipoSelector } from "@/componentes/PrototipoSelector";
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
        <Mazo tarjetas={tarjetas} numeroEdicion={numeroDeEdicion(dia)} />
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
      {/* Si Blob falla después de mandar el loading, el error llega por el stream: sin boundary es "This page couldn't load". */}
      <ErrorPortada>
        <Suspense fallback={<Cargando numero={numeroDeEdicion(new Date())} />}>
          <Portada searchParams={searchParams} />
        </Suspense>
      </ErrorPortada>
      {/* PROTOTIPO: barra para elegir la variante del pedido de aporte. Nunca en producción. */}
      {process.env.VERCEL_ENV !== "production" && (
        <Suspense fallback={null}>
          <PrototipoSelector />
        </Suspense>
      )}
    </>
  );
}
