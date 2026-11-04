/** Las ediciones se cuentan por día de Buenos Aires, no de UTC ni del servidor (Vercel corre en UTC). */
const ZONA = "America/Argentina/Buenos_Aires";

/** Día de la Edición Nº 1. */
export const PRIMERA_EDICION = "2026-11-02";

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;

/** Día (YYYY-MM-DD) de Buenos Aires en el que cae un instante. */
export function diaDeBuenosAires(fecha: Date): string {
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(fecha).map((p) => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

/** Mediodía UTC del día: suma de días de calendario sin saltos por husos. */
function mediodia(dia: string): number | null {
  const partes = DIA.exec(dia);
  if (!partes) return null;
  const [, anio, mes, d] = partes.map(Number);
  return Date.UTC(anio, mes - 1, d, 12);
}

/**
 * Número de la edición: la del 2/11/2026 es la 1 y suma uno por día de calendario de Buenos Aires.
 * Dos corridas del mismo día son la misma edición. Recibe el día de la edición o un instante.
 */
export function numeroDeEdicion(fecha: string | Date): number | null {
  const dia = typeof fecha === "string" ? fecha : diaDeBuenosAires(fecha);
  const desde = mediodia(PRIMERA_EDICION);
  const hasta = mediodia(dia);
  if (desde === null || hasta === null) return null;
  return Math.round((hasta - desde) / MS_POR_DIA) + 1;
}

/** Fecha larga de una edición (YYYY-MM-DD), p. ej. "martes, 3 de noviembre de 2026". */
export function fechaDeEdicion(dia: string): string | null {
  const instante = mediodia(dia);
  if (instante === null) return null;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(instante));
}
