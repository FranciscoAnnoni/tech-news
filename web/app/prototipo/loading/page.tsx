// PROTOTIPO — tirar cuando se elija una variante.
// Pregunta: ¿cómo se ve la pantalla de carga mientras el servidor baja las noticias?
// Tres variantes switcheables con `?variant=A|B|C`, en /prototipo/loading. Acá quedan fijas (en loop) para mirarlas;
// la real solo se ve mientras carga la portada.
import { PrototipoSelector } from "@/componentes/PrototipoSelector";
import { diaDeBuenosAires, numeroDeEdicion } from "@/lib/edicion";
import estilos from "./loading.module.css";

const VARIANTES = [
  { clave: "A", nombre: "Mazo armándose" },
  { clave: "B", nombre: "Ícono que late" },
  { clave: "C", nombre: "Portada impresa" },
];

function VarianteA() {
  return (
    <div className={estilos.pantalla}>
      <header className={estilos.cabeceraA}>
        <span>INFOMATE</span>
      </header>
      <div className={estilos.mesaA}>
        <div className={`${estilos.cartaA} ${estilos.c3}`} />
        <div className={`${estilos.cartaA} ${estilos.c2}`} />
        <div className={`${estilos.cartaA} ${estilos.c1}`}>
          <span className={estilos.rayaA} />
          <span className={`${estilos.rayaA} ${estilos.rayaCorta}`} />
        </div>
      </div>
      <p className={estilos.textoA}>Mezclando las noticias de hoy…</p>
    </div>
  );
}

function VarianteB() {
  return (
    <div className={`${estilos.pantalla} ${estilos.centro}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={estilos.iconoB} src="/iconos/infomate.svg" alt="" width={120} height={120} />
      <p className={estilos.textoB}>INFOMATE</p>
      <span className={estilos.puntosB} aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function VarianteC() {
  const numero = numeroDeEdicion(diaDeBuenosAires(new Date()));
  return (
    <div className={`${estilos.pantalla} ${estilos.centro}`}>
      <div className={estilos.portadaC}>
        <p className={estilos.volantaC}>{numero ? `Edición Nº ${numero}` : "Edición de hoy"}</p>
        <h1 className={estilos.tituloC}>INFOMATE</h1>
        <div className={estilos.barraC}>
          <span />
        </div>
        <p className={estilos.textoC}>Imprimiendo la edición…</p>
      </div>
    </div>
  );
}

export default async function PrototipoLoading({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { variant } = await searchParams;
  const actual = VARIANTES.some((v) => v.clave === variant) ? (variant as string) : "A";
  return (
    <>
      <div role="status" aria-label="Cargando las noticias">
        {actual === "A" && <VarianteA />}
        {actual === "B" && <VarianteB />}
        {actual === "C" && <VarianteC />}
      </div>
      <PrototipoSelector variantes={VARIANTES} actual={actual} />
    </>
  );
}
