import { CATEGORIAS, type Noticia } from "./tipos";

/** Cuánto dura un link público desde la publicación de la Noticia. */
export const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

export type ResultadoPublico = { disponible: true; noticia: Noticia } | { disponible: false };

const NO_DISPONIBLE: ResultadoPublico = { disponible: false };

/** Forma `tech-123`: la categoría es parte del identificador porque los ids se repiten entre categorías. */
export const identificadorDe = ({ categoria, id }: Pick<Noticia, "categoria" | "id">): string =>
  `${categoria.toLowerCase()}-${id}`;

/**
 * Decide qué muestra la página pública. `ahora` se inyecta: el módulo no lee el reloj.
 * `publicada` es ISO en UTC (ej. 2026-10-28T15:55:51Z); exactamente 7 días todavía es válido.
 */
export function buscarNoticiaPublica(identificador: string, noticias: Noticia[], ahora: Date): ResultadoPublico {
  if (!/^[a-z]+-(0|[1-9]\d*)$/.test(identificador)) return NO_DISPONIBLE;
  const noticia = noticias.find((n) => identificadorDe(n) === identificador);
  if (!noticia || !CATEGORIAS.includes(noticia.categoria)) return NO_DISPONIBLE;
  const edad = ahora.getTime() - Date.parse(noticia.publicada);
  return edad <= VIGENCIA_MS ? { disponible: true, noticia } : NO_DISPONIBLE;
}
