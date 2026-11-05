// PROTOTIPO — tirar cuando se elija una variante.
// Pregunta: ¿cómo se ve la pantalla de carga mientras el servidor baja las noticias?
// Tres variantes switcheables con `?variant=A|B|C`, en /prototipo/loading. Acá quedan en loop para mirarlas;
// la real solo se ve mientras carga la portada. Todo es HTML + CSS: tiene que verse antes de que cargue el JS.
import type { CSSProperties } from "react";
import { PrototipoSelector } from "@/componentes/PrototipoSelector";
import { diaDeBuenosAires, numeroDeEdicion } from "@/lib/edicion";
import e from "./loading.module.css";

const VARIANTES = [
  { clave: "A", nombre: "Mazo mezclándose" },
  { clave: "B", nombre: "Diario que corre" },
  { clave: "C", nombre: "Diario que se dobla" },
];

/** A: tres tarjetas chicas con skeleton que se mezclan. */
function VarianteA() {
  const tonos = ["var(--pastel-arg)", "var(--pastel-global)", "var(--pastel-tech)"];
  return (
    <div className={e.mazo}>
      {tonos.map((tono, i) => (
        <div key={i} className={e.carta} style={{ "--i": i, "--tono": tono } as CSSProperties}>
          <span className={e.origen}>
            <i className={e.monograma} />
            <i className={e.lineaFuente} />
          </span>
          <span className={e.titular} />
          <span className={`${e.titular} ${e.corta}`} />
          <span className={e.renglon} />
          <span className={e.renglon} />
          <span className={`${e.renglon} ${e.corta}`} />
        </div>
      ))}
    </div>
  );
}

/** B: recreación del Lottie "News or Document - Scroll" con los colores de Infomate. */
function VarianteB() {
  return (
    <div className={e.lottie} aria-hidden>
      <div className={e.atras} />
      <div className={e.adelante}>
        <div className={e.contenido}>
          <span className={e.cabezal} />
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={e.fila}>
              <i />
              <i />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** C: un diario chico que se dobla al medio y se vuelve a abrir. */
function VarianteC() {
  return (
    <div className={e.diario} aria-hidden>
      <div className={e.pagina}>
        <b className={e.mancheta}>INFOMATE</b>
        <span className={e.linea} />
        <span className={e.linea} />
        <span className={`${e.linea} ${e.corta}`} />
      </div>
      <div className={e.solapa}>
        <div className={`${e.pagina} ${e.cara}`}>
          <span className={e.foto} />
          <span className={e.linea} />
          <span className={`${e.linea} ${e.corta}`} />
        </div>
        <div className={`${e.pagina} ${e.cara} ${e.dorso}`}>
          <b className={e.inicial}>i</b>
        </div>
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
  const numero = numeroDeEdicion(diaDeBuenosAires(new Date()));
  return (
    <>
      <div className={e.pantalla} role="status" aria-label="Cargando las noticias">
        {actual === "A" && <VarianteA />}
        {actual === "B" && <VarianteB />}
        {actual === "C" && <VarianteC />}
        {/* Pie común, con la estética de la portada impresa que te gustó. */}
        <p className={e.marca}>INFOMATE</p>
        <p className={e.edicion}>{numero ? `Edición Nº ${numero}` : "Edición de hoy"}</p>
      </div>
      <PrototipoSelector variantes={VARIANTES} actual={actual} />
    </>
  );
}
