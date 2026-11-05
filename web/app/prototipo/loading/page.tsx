// PROTOTIPO — tirar cuando se elija una variante.
// Pregunta: ¿cómo se ve el loading del mazo que se mezcla sin que los bordes de atrás se vean como un negro doble?
// Tres variantes switcheables con `?variant=A|B|C`, en /prototipo/loading. Acá quedan en loop para mirarlas;
// la real solo se ve mientras carga la portada. Todo es HTML + CSS: tiene que verse antes de que cargue el JS.
import type { CSSProperties } from "react";
import { PrototipoSelector } from "@/componentes/PrototipoSelector";
import { diaDeBuenosAires, numeroDeEdicion } from "@/lib/edicion";
import e from "./loading.module.css";

const VARIANTES = [
  { clave: "A", nombre: "Capas de color" },
  { clave: "B", nombre: "Abanico" },
  { clave: "C", nombre: "Como el Mazo" },
];

const TONOS = ["var(--pastel-arg)", "var(--pastel-global)", "var(--pastel-tech)"];
const CLASE: Record<string, string> = { A: e.capas, B: e.abanico, C: e.comoMazo };

function Mazo({ variante }: { variante: string }) {
  return (
    <div className={`${e.mazo} ${CLASE[variante]}`}>
      {TONOS.map((tono, i) => (
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
        <Mazo variante={actual} />
        <p className={e.marca}>INFOMATE</p>
        <p className={e.edicion}>{numero ? `Edición Nº ${numero}` : "Edición de hoy"}</p>
      </div>
      <PrototipoSelector variantes={VARIANTES} actual={actual} />
    </>
  );
}
