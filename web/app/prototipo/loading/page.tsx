// PROTOTIPO — tirar cuando se elija una variante.
// Pregunta: en el mazo de "capas de color", ¿cuánto se corren las cartas de atrás y con qué borde?
// Cinco variantes switcheables con `?variant=1..5`, en /prototipo/loading. Acá quedan en loop para mirarlas;
// la real solo se ve mientras carga la portada. Todo es HTML + CSS: tiene que verse antes de que cargue el JS.
import type { CSSProperties } from "react";
import { PrototipoSelector } from "@/componentes/PrototipoSelector";
import { diaDeBuenosAires, numeroDeEdicion } from "@/lib/edicion";
import e from "./loading.module.css";

const VARIANTES = [
  { clave: "1", nombre: "Base: 5/10 px, borde negro" },
  { clave: "2", nombre: "Más juntas: 3/6 px" },
  { clave: "3", nombre: "Más separadas: 9/18 px" },
  { clave: "4", nombre: "Sin borde atrás" },
  { clave: "5", nombre: "Hacia abajo, borde suave" },
];

const TONOS = ["var(--pastel-arg)", "var(--pastel-global)", "var(--pastel-tech)"];
const CLASE: Record<string, string> = { "1": e.v1, "2": e.v2, "3": e.v3, "4": e.v4, "5": e.v5 };

function Mazo({ variante }: { variante: string }) {
  return (
    <div className={`${e.mazo} ${e.capas} ${CLASE[variante]}`}>
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
  const actual = VARIANTES.some((v) => v.clave === variant) ? (variant as string) : "1";
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
