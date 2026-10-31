import { MAX_CONTENIDO, type Noticia, type TarjetaNoticia, type Talla } from "./tipos";

/** Sin descripción el título es todo el contenido: puede ocupar más. */
export function tallaDe({ titulo, descripcion }: Noticia): Talla {
  const extra = descripcion ? 0 : 30;
  if (titulo.length > 110 + extra) return "l";
  return titulo.length > 55 + extra ? "m" : "c";
}

export function marcaDe(fuente: string): { letras: string; tono: number } {
  let tono = 0;
  for (const c of fuente) tono = (tono * 31 + c.charCodeAt(0)) % 360;
  return { letras: fuente.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase(), tono };
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** DD/MM/AAAA HH:MM en hora de Buenos Aires, con huso fijo: no depende del servidor ni del navegador. */
export function formatearFecha(publicada: string): string {
  const parte = Object.fromEntries(FORMATO_FECHA.formatToParts(new Date(publicada)).map((p) => [p.type, p.value]));
  return `${parte.day}/${parte.month}/${parte.year} ${parte.hour}:${parte.minute}`;
}

/** Marca con puntos suspensivos el texto que llegó cortado en el límite. */
export const contenidoVisible = (contenido: string | null): string | null =>
  contenido && contenido.length >= MAX_CONTENIDO ? `${contenido}…` : contenido;

/** Los links vienen de fuentes externas: solo se aceptan http(s). */
export const enlaceSeguro = (url: string): string => (/^https?:\/\//i.test(url) ? url : "#");

export function aTarjeta(n: Noticia): TarjetaNoticia {
  return {
    id: n.id,
    titulo: n.titulo,
    descripcion: n.descripcion,
    contenido: contenidoVisible(n.contenido),
    talla: tallaDe(n),
    categoria: n.categoria,
    fuente: n.fuente,
    ...marcaDe(n.fuente),
    fecha: formatearFecha(n.publicada),
    link: enlaceSeguro(n.link),
  };
}
