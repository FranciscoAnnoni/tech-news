// PROTOTIPO — datos compartidos por las variantes (no el layout).
import type { Categoria, TarjetaNoticia } from "@/lib/tipos";

export interface DatosPortada {
  tarjetas: TarjetaNoticia[];
  fecha: string;
  edicion: number;
}

export const SECCION: Record<Categoria, string> = {
  ARG: "Argentina",
  Global: "Mundo",
  Tech: "Tecnología",
};

export const SECCIONES: Categoria[] = ["ARG", "Global", "Tech"];

export const porSeccion = (tarjetas: TarjetaNoticia[], c: Categoria) => tarjetas.filter((t) => t.categoria === c);

/** "DD/MM/AAAA HH:MM" → "HH:MM". */
export const hora = (fecha: string) => fecha.split(" ")[1] ?? fecha;
