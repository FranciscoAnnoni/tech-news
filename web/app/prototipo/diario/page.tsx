// PROTOTIPO — tirar cuando se elija una variante.
// Pregunta: ¿cómo se ve la web de escritorio como un diario de papel sin perder la identidad de Infomate?
// Tres variantes de la portada de la edición, switcheables con `?variant=A|B|C`, en /prototipo/diario.
// Usa los mismos datos que el mazo (obtenerNoticias + tarjetasDelMazo); solo cambia el render.
import { PrototipoSelector } from "@/componentes/PrototipoSelector";
import { tarjetasDelMazo } from "@/lib/mazo";
import { obtenerNoticias } from "@/lib/noticias";
import { VarianteA } from "./VarianteA";
import { VarianteB } from "./VarianteB";
import { VarianteC } from "./VarianteC";
import type { DatosPortada } from "./comun";

const VARIANTES = [
  { clave: "A", nombre: "Sábana clásica" },
  { clave: "B", nombre: "Tabloide Infomate" },
  { clave: "C", nombre: "Papel digital" },
];

function fechaLarga(ahora: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(ahora);
}

export default async function PrototipoDiario({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { variant } = await searchParams;
  const actual = VARIANTES.some((v) => v.clave === variant) ? (variant as string) : "A";
  const ahora = new Date();
  const datos: DatosPortada = {
    tarjetas: tarjetasDelMazo(await obtenerNoticias()),
    fecha: fechaLarga(ahora),
    // Número de edición inventado para el prototipo: días desde el lanzamiento.
    edicion: Math.floor((ahora.getTime() - Date.UTC(2026, 0, 1)) / 86_400_000),
  };
  return (
    <>
      {actual === "A" && <VarianteA {...datos} />}
      {actual === "B" && <VarianteB {...datos} />}
      {actual === "C" && <VarianteC {...datos} />}
      <PrototipoSelector variantes={VARIANTES} actual={actual} />
    </>
  );
}
