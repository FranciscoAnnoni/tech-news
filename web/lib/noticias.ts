import { readFile } from "node:fs/promises";
import path from "node:path";
import { diaDeBuenosAires } from "./edicion";
import { buscarNoticiaPublica, esIdNoticia, leerIdentificador, type ResultadoPublico } from "./noticiaPublica";
import { CATEGORIAS, type Noticia } from "./tipos";

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

/** El exportador también entrega fechas DD/MM/YYYY HH:mm en hora argentina. */
function fechaPublicacion(valor: unknown): unknown {
  if (typeof valor !== "string") return valor;
  const partes = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(valor);
  if (!partes) return valor;
  const [, dia, mes, anio, hora, minuto] = partes;
  return `${anio}-${mes}-${dia}T${hora}:${minuto}:00-03:00`;
}

function esNoticia(valor: unknown): valor is Noticia {
  return esObjeto(valor)
    && esIdNoticia(valor.id)
    && typeof valor.titulo === "string" && valor.titulo.trim().length > 0
    && (valor.descripcion === null || typeof valor.descripcion === "string")
    && (valor.contenido === null || typeof valor.contenido === "string")
    && CATEGORIAS.some((categoria) => categoria === valor.categoria)
    && typeof valor.link === "string"
    && typeof valor.fuente === "string"
    && typeof valor.publicada === "string" && Number.isFinite(Date.parse(valor.publicada))
    && typeof valor.puntaje === "number" && Number.isFinite(valor.puntaje);
}

/** Espera antes del segundo intento a Blob. */
export const ESPERA_REINTENTO_MS = 400;

/**
 * El Blob es público: no necesita el token de escritura. No congelar el feed en el build.
 * Blob a veces responde 403 o 5xx de forma momentánea (36 veces en producción entre el 2 y el 5/11/2026): un solo
 * reintento corto lo absorbe. Un 404 no se reintenta, porque es una edición que no existe.
 */
async function pedirABlob(url: string): Promise<Response> {
  const respuesta = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (respuesta && (respuesta.ok || respuesta.status === 404)) return respuesta;
  await new Promise((listo) => setTimeout(listo, ESPERA_REINTENTO_MS));
  return fetch(url, { cache: "no-store" });
}

/** Único acceso a Blob, solo en el servidor. La edición omite el archivo mutable hoy.json. */
async function leerNoticias(edicion?: string): Promise<Noticia[]> {
  const storeId = process.env.INFOMATE_STORE_ID?.trim();
  let datos: unknown;
  if (storeId) {
    const store = storeId.replace(/^store_/, "").toLowerCase();
    if (!/^[a-z0-9]+$/.test(store)) throw new Error("INFOMATE_STORE_ID inválido.");
    const url = `https://${store}.public.blob.vercel-storage.com/infomate/${edicion ?? "hoy"}.json`;
    const respuesta = await pedirABlob(url);
    if (edicion && respuesta.status === 404) return [];
    if (!respuesta.ok) throw new Error(`No se pudieron obtener las noticias de Blob (HTTP ${respuesta.status}).`);
    const feed: unknown = await respuesta.json();
    // Last-Modified conserva el día de la edición aunque hoy.json no se actualice al día siguiente.
    const modificada = new Date(respuesta.headers.get("last-modified") ?? "");
    const dia = edicion ?? diaDeBuenosAires(Number.isFinite(modificada.getTime()) ? modificada : new Date());
    // Adaptar el contrato del exportador al modelo de la app.
    datos = Array.isArray(feed)
      ? feed.map((nota: unknown) => {
        if (!esObjeto(nota)) return nota;
        const categoria = CATEGORIAS.find((c) => c.toLowerCase() === nota.categoria);
        return { ...nota, categoria, publicada: fechaPublicacion(nota.fecha_publicacion), edicion: dia };
      }) : feed;
  } else {
    const archivo = path.join(process.cwd(), "datos", "noticias.json");
    datos = JSON.parse(await readFile(archivo, "utf8"));
  }
  const noticias = esObjeto(datos) && typeof datos.generado === "string" ? datos.noticias : datos;
  if (!Array.isArray(noticias) || !noticias.every(esNoticia)) {
    throw new Error("Formato de noticias inválido: se esperaba un feed de noticias compatible.");
  }
  return edicion ? noticias.map((nota) => ({ ...nota, edicion })) : noticias;
}

/** El mazo siempre lee hoy.json; sin Blob configurado usa el ejemplo local. */
export async function obtenerNoticias(): Promise<Noticia[]> {
  return leerNoticias();
}

/** Día YYYY-MM-DD corrido `dias` días de calendario. */
function correrDia(dia: string, dias: number): string {
  const fecha = new Date(`${dia}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/**
 * La página pública y su preview consultan el archivo de la edición incluida en el link.
 * La fecha del link puede no coincidir con el archivo que tiene la noticia: el día de hoy.json sale del
 * Last-Modified que devuelve la CDN de Blob, que es la hora en que la CDN guardó la copia y no la de la subida.
 * Entre la medianoche y la corrida de la mañana, hoy.json todavía tiene la edición anterior pero los links salen
 * con la fecha nueva. Por eso, si la noticia no está en su archivo, se busca en el día anterior y en el siguiente.
 * La vigencia de 7 días sigue contando desde la publicación.
 */
export async function buscarNoticia(identificador: string, ahora: Date): Promise<ResultadoPublico> {
  const partes = leerIdentificador(identificador);
  if (!partes) return { disponible: false };
  const resultado = buscarNoticiaPublica(identificador, await leerNoticias(partes.edicion), ahora);
  if (resultado.disponible || !partes.edicion) return resultado;
  for (const dia of [correrDia(partes.edicion, -1), correrDia(partes.edicion, 1)]) {
    const vecinas = await leerNoticias(dia).catch(() => []);
    const encontrada = buscarNoticiaPublica(`${dia}-${partes.clave}`, vecinas, ahora);
    if (encontrada.disponible) return encontrada;
  }
  return resultado;
}
