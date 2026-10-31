import { readFile } from "node:fs/promises";
import path from "node:path";
import { buscarNoticiaPublica, type ResultadoPublico } from "./noticiaPublica";
import type { DatosNoticias, Noticia } from "./tipos";

/** Único punto de acceso a los datos: una API futura reemplaza solo esta función. */
export async function obtenerNoticias(): Promise<Noticia[]> {
  const archivo = path.join(process.cwd(), "datos", "noticias.json");
  const datos: DatosNoticias = JSON.parse(await readFile(archivo, "utf8"));
  return datos.noticias;
}

/** Búsqueda para la página pública: sigue leyendo por `obtenerNoticias`, así que el reemplazo de la fuente la cubre. */
export async function buscarNoticia(identificador: string, ahora: Date): Promise<ResultadoPublico> {
  return buscarNoticiaPublica(identificador, await obtenerNoticias(), ahora);
}
