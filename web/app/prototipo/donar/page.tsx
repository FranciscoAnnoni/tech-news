// PROTOTIPO — tirar cuando se elija una variante.
// Pregunta: ¿cómo se ve la tarjeta de donación (Matecito) dentro del Mazo, amarilla y sin contar en el contador?
// Tres variantes switcheables con `?variant=A|B|C`, en /prototipo/donar. Arriba va la donación y detrás
// las noticias reales de la edición. Deslizar o tocar no abre Matecito: muestra qué pasaría.
import { PrototipoSelector } from "@/componentes/PrototipoSelector";
import { tarjetasDelMazo } from "@/lib/mazo";
import { obtenerNoticias } from "@/lib/noticias";
import { MesaPrototipo } from "./MesaPrototipo";

const VARIANTES = [
  { clave: "A", nombre: "Como una noticia" },
  { clave: "B", nombre: "Cartel" },
  { clave: "C", nombre: "Carta del equipo" },
];

export default async function PrototipoDonar({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { variant } = await searchParams;
  const actual = VARIANTES.some((v) => v.clave === variant) ? (variant as string) : "A";
  const tarjetas = tarjetasDelMazo(await obtenerNoticias());
  return (
    <>
      <MesaPrototipo variante={actual} tarjetas={tarjetas} />
      <PrototipoSelector variantes={VARIANTES} actual={actual} />
    </>
  );
}
