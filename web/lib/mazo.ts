import { aTarjeta } from "./texto";
import { CATEGORIAS, type Noticia, type TarjetaNoticia } from "./tipos";

export const N_POR_DEFECTO = 10;

export function nDesdeParametro(valor: string | string[] | undefined): number {
  const n = Number.parseInt(Array.isArray(valor) ? valor[0] : (valor ?? ""), 10);
  return n >= 1 ? n : N_POR_DEFECTO;
}

/**
 * El puntaje no es comparable entre categorías: cada una se ordena por el suyo
 * y se toma una nota de cada categoría por turno.
 */
export function seleccionarMazo(noticias: Noticia[], n: number): Noticia[] {
  const listas = CATEGORIAS.map((categoria) =>
    noticias.filter((nota) => nota.categoria === categoria).sort((a, b) => b.puntaje - a.puntaje),
  );
  const mazo: Noticia[] = [];
  const largo = Math.max(...listas.map((l) => l.length));
  for (let i = 0; i < largo; i++) {
    for (const lista of listas) {
      if (lista[i]) mazo.push(lista[i]);
    }
  }
  return mazo.slice(0, n);
}

export const tarjetasDelMazo = (noticias: Noticia[], n: number): TarjetaNoticia[] =>
  seleccionarMazo(noticias, n).map(aTarjeta);

export type Resolucion = "abierta" | "descartada";

export interface EstadoMazo {
  indice: number;
  resoluciones: Record<number, Resolucion>;
}

export const ESTADO_INICIAL: EstadoMazo = { indice: 0, resoluciones: {} };

export type AccionMazo =
  | { tipo: "resolver"; indice: number; resolucion: Resolucion }
  | { tipo: "avanzar"; hasta: number }
  | { tipo: "reiniciar" };

export function reducirMazo(estado: EstadoMazo, accion: AccionMazo): EstadoMazo {
  switch (accion.tipo) {
    case "resolver":
      return { ...estado, resoluciones: { ...estado.resoluciones, [accion.indice]: accion.resolucion } };
    case "avanzar":
      return { ...estado, indice: accion.hasta };
    case "reiniciar":
      return ESTADO_INICIAL;
  }
}

export function textoFin({ resoluciones }: EstadoMazo): string {
  const valores = Object.values(resoluciones);
  const cuenta = (r: Resolucion) => valores.filter((v) => v === r).length;
  return `Abriste ${cuenta("abierta")} y descartaste ${cuenta("descartada")}.`;
}
