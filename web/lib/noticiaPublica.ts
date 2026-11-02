import { CATEGORIAS, type Noticia } from "./tipos";

/** Cuánto dura un link público desde la publicación de la Noticia. */
export const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

export type ResultadoPublico = { disponible: true; noticia: Noticia } | { disponible: false };

const NO_DISPONIBLE: ResultadoPublico = { disponible: false };

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** IDs numéricos del ejemplo local o UUID del feed publicado. */
export function esIdNoticia(id: unknown): id is number | string {
  return (typeof id === "number" && Number.isSafeInteger(id) && id >= 0)
    || (typeof id === "string" && UUID.test(id));
}

/** La categoría distingue los ids numéricos que se repiten entre categorías. */
export const identificadorDe = ({ categoria, id, edicion }: Pick<Noticia, "categoria" | "id" | "edicion">): string =>
  `${edicion ? `${edicion}-` : ""}${categoria.toLowerCase()}-${id}`;

/** Acepta links fechados y los anteriores sin fecha. Valida antes de construir una ruta de Blob. */
export function leerIdentificador(identificador: string): { edicion?: string; clave: string } | null {
  const partes = /^(?:(\d{4}-\d{2}-\d{2})-)?((?:arg|global|tech)-(.+))$/.exec(identificador);
  if (!partes) return null;
  const [, edicion, clave, id] = partes;
  if (!/^(0|[1-9]\d*)$/.test(id) && !UUID.test(id)) return null;
  if (edicion) {
    const fecha = new Date(`${edicion}T00:00:00Z`);
    if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== edicion) return null;
  }
  return { edicion, clave };
}

/**
 * Decide qué muestra la página pública. `ahora` se inyecta: el módulo no lee el reloj.
 * `publicada` es ISO en UTC (ej. 2026-10-28T15:55:51Z); exactamente 7 días todavía es válido.
 */
export function buscarNoticiaPublica(identificador: string, noticias: Noticia[], ahora: Date): ResultadoPublico {
  const partes = leerIdentificador(identificador);
  if (!partes) return NO_DISPONIBLE;
  const noticia = noticias.find((n) => `${n.categoria.toLowerCase()}-${n.id}` === partes.clave
    && (!partes.edicion || n.edicion === partes.edicion));
  if (!noticia || !CATEGORIAS.includes(noticia.categoria)) return NO_DISPONIBLE;
  const edad = ahora.getTime() - Date.parse(noticia.publicada);
  return edad <= VIGENCIA_MS ? { disponible: true, noticia } : NO_DISPONIBLE;
}
