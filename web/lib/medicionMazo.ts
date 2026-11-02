import { leerIdentificador } from "./noticiaPublica";
import type { EstadoMazo } from "./mazo";
import type { TarjetaNoticia } from "./tipos";

/** Solo metadatos validados; nunca incluir texto de la noticia ni la URL fuente. */
export function contextoNoticia(tarjeta: TarjetaNoticia) {
  const edicion = leerIdentificador(tarjeta.identificador)?.edicion;
  return { identificador: tarjeta.identificador, categoria: tarjeta.categoria, fuente: tarjeta.fuente, ...(edicion ? { edicion } : {}) };
}
export function contextoMazo(tarjeta: TarjetaNoticia, recorrido_id: string, indice: number, cantidad_tarjetas: number) {
  return { ...contextoNoticia(tarjeta), recorrido_id, posicion: indice + 1, cantidad_tarjetas };
}
export function conteosFinales({ resoluciones }: EstadoMazo) {
  const valores = Object.values(resoluciones);
  return { abiertas: valores.filter((valor) => valor === "abierta").length, descartadas: valores.filter((valor) => valor === "descartada").length };
}
/** Dedupe independiente de los efectos de React y del historial del mazo. */
export function crearMedicionMazo(recorrido_id: string) {
  const vistas = new Set<string>();
  let iniciado = false;
  let completado = false;
  return {
    recorrido_id,
    iniciar(): boolean { if (iniciado) return false; iniciado = true; return true; },
    ver(identificador: string): boolean { if (vistas.has(identificador)) return false; vistas.add(identificador); return true; },
    completar(cantidad: number): boolean { if (!cantidad || completado) return false; completado = true; return true; },
  };
}
