import type { EstadoMazo } from "./mazo";

const CLAVE = "infomate:progreso";

type Almacen = Pick<Storage, "getItem" | "setItem">;

/** Identifica la edición por sus noticias: cuando n8n sube otras, la firma cambia y el mazo arranca de cero. */
export const firmaDelMazo = (ids: (number | string)[]): string => ids.join(",");

/** Devuelve el progreso guardado solo si es de esta misma edición. */
export function leerProgreso(almacen: Almacen, firma: string, n: number): EstadoMazo | null {
  try {
    const guardado: unknown = JSON.parse(almacen.getItem(CLAVE) ?? "null");
    if (typeof guardado !== "object" || guardado === null) return null;
    const { firma: suya, indice, resoluciones } = guardado as Record<string, unknown>;
    if (suya !== firma || typeof indice !== "number" || !Number.isInteger(indice) || indice < 0) return null;
    if (typeof resoluciones !== "object" || resoluciones === null) return null;
    return { indice: Math.min(indice, n), resoluciones: resoluciones as EstadoMazo["resoluciones"] };
  } catch {
    return null;
  }
}

export function guardarProgreso(almacen: Almacen, firma: string, estado: EstadoMazo): void {
  try {
    almacen.setItem(CLAVE, JSON.stringify({ firma, ...estado }));
  } catch {
    // Navegación privada o almacenamiento bloqueado: el mazo funciona igual, sin recordar.
  }
}
