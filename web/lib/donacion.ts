import { diasEntre } from "./edicion";

/** Link de pago de Mercado Pago (reutilizable, $2.000) donde la gente aporta. */
export const URL_MERCADO_PAGO = "https://mpago.la/27PuiJ8";
/** Monto que se pide en la tarjeta; tiene que coincidir con el del link de pago. */
export const MONTO_SUGERIDO = "$2.000";

/** Días mínimos entre dos veces que se muestra la tarjeta de donación. */
export const CADA_DIAS = 3;
/** Después de tocar Apoyar, días sin volver a mostrar la tarjeta. */
export const PAUSA_TRAS_DONAR = 30;
/** La tarjeta va después de una noticia al azar entre la 4ª y la 10ª, y nunca al final del mazo. */
export const DESDE = 4;
export const HASTA = 10;

const CLAVE = "infomate:donacion";

type Almacen = Pick<Storage, "getItem" | "setItem">;

/** Lo que recuerda el navegador. Los días son YYYY-MM-DD de Buenos Aires. */
export interface EstadoDonacion {
  /** Primer día que este navegador abrió el Mazo: ese día nunca se muestra. */
  primerDia: string;
  /** Último día en que la tarjeta quedó arriba del Mazo. */
  ultimaVista?: string;
  /** Último día en que tocó Apoyar (tarjeta o cabecera). */
  donoEl?: string;
  /**
   * Plan de la edición actual (misma firma que el progreso). Se decide una vez por edición, así una recarga no
   * la mueve de lugar ni la hace aparecer o desaparecer. `posicion` es cuántas noticias van antes; null si hoy no toca.
   */
  edicion?: { firma: string; posicion: number | null; resuelta: boolean };
}

const esDia = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function leerDonacion(almacen: Almacen): EstadoDonacion | null {
  try {
    const g: unknown = JSON.parse(almacen.getItem(CLAVE) ?? "null");
    if (typeof g !== "object" || g === null) return null;
    const { primerDia, ultimaVista, donoEl, edicion } = g as Record<string, unknown>;
    if (!esDia(primerDia)) return null;
    const estado: EstadoDonacion = { primerDia };
    if (esDia(ultimaVista)) estado.ultimaVista = ultimaVista;
    if (esDia(donoEl)) estado.donoEl = donoEl;
    if (typeof edicion === "object" && edicion !== null) {
      const { firma, posicion, resuelta } = edicion as Record<string, unknown>;
      const posicionValida = posicion === null || (typeof posicion === "number" && Number.isInteger(posicion) && posicion >= 1);
      if (typeof firma === "string" && posicionValida && typeof resuelta === "boolean") {
        estado.edicion = { firma, posicion: posicion as number | null, resuelta };
      }
    }
    return estado;
  } catch {
    return null;
  }
}

export function guardarDonacion(almacen: Almacen, estado: EstadoDonacion): void {
  try {
    almacen.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Almacenamiento bloqueado: cada visita parece la primera y la tarjeta no aparece (ver planDonacion).
  }
}

const pasaron = (desde: string | undefined, hoy: string, dias: number) => {
  if (!desde) return true;
  const d = diasEntre(desde, hoy);
  return d === null || d >= dias;
};

export function tocaHoy(estado: EstadoDonacion, hoy: string): boolean {
  return (
    pasaron(estado.primerDia, hoy, 1) &&
    pasaron(estado.ultimaVista, hoy, CADA_DIAS) &&
    pasaron(estado.donoEl, hoy, PAUSA_TRAS_DONAR)
  );
}

/** Cuántas noticias van antes de la tarjeta. Null si el mazo es muy corto para meterla en el medio. */
export function elegirPosicion(n: number, azar: number): number | null {
  if (n < 2) return null;
  const hasta = Math.min(HASTA, n - 1);
  const desde = Math.min(DESDE, hasta);
  return desde + Math.min(Math.floor(azar * (hasta - desde + 1)), hasta - desde);
}

/**
 * Estado con el plan de esta edición. Si la edición ya tenía plan, lo respeta.
 * Sin estado previo (primera vez o almacenamiento bloqueado) arranca hoy, así que hoy no se muestra.
 */
export function planDonacion(previo: EstadoDonacion | null, firma: string, n: number, hoy: string, azar: number): EstadoDonacion {
  const estado: EstadoDonacion = previo ?? { primerDia: hoy };
  if (estado.edicion?.firma === firma) return estado;
  const posicion = tocaHoy(estado, hoy) ? elegirPosicion(n, azar) : null;
  return { ...estado, edicion: { firma, posicion, resuelta: false } };
}

/** Posición de la tarjeta si todavía está pendiente en esta edición; si no, null. */
export const posicionPendiente = (estado: EstadoDonacion | null): number | null =>
  estado?.edicion && !estado.edicion.resuelta ? estado.edicion.posicion : null;

export const marcarVista = (estado: EstadoDonacion, hoy: string): EstadoDonacion =>
  estado.ultimaVista === hoy ? estado : { ...estado, ultimaVista: hoy };

/** La tarjeta salió del mazo: descartada o con Apoyar. */
export function resolver(estado: EstadoDonacion, apoyo: boolean, hoy: string): EstadoDonacion {
  const siguiente = apoyo ? { ...estado, donoEl: hoy } : estado;
  return siguiente.edicion ? { ...siguiente, edicion: { ...siguiente.edicion, resuelta: true } } : siguiente;
}

export type Lugar = { tipo: "noticia"; indice: number } | { tipo: "donacion" };

/** Las tarjetas que se ven desde `indice`, con la donación metida antes de la noticia `posicion` si sigue pendiente. */
export function pilaVisible(indice: number, n: number, posicion: number | null, profundidad: number): Lugar[] {
  const pila: Lugar[] = [];
  for (let i = indice; i < n && pila.length < profundidad; i++) {
    if (i === posicion) pila.push({ tipo: "donacion" });
    if (pila.length < profundidad) pila.push({ tipo: "noticia", indice: i });
  }
  return pila;
}

/**
 * Para probar: `?donacion` en la URL la muestra en esta carga sin mirar la frecuencia ni el modo equipo, en una
 * posición al azar; `?donacion=N`, después de la noticia N. Devuelve la posición pedida, o undefined si no se pidió.
 * No es secreto: lo peor que hace es mostrarle la tarjeta a quien lo escribe.
 */
export function posicionForzada(busqueda: string, n: number, azar: number): number | null | undefined {
  const parametros = new URLSearchParams(busqueda);
  if (!parametros.has("donacion")) return undefined;
  const pedida = Number.parseInt(parametros.get("donacion") ?? "", 10);
  if (Number.isInteger(pedida) && pedida >= 1 && n >= 2) return Math.min(pedida, n - 1);
  return elegirPosicion(n, azar);
}

export type AccionDonacion =
  | { tipo: "planificar"; previo: EstadoDonacion | null; firma: string; n: number; hoy: string; azar: number; forzada?: number | null }
  | { tipo: "vista"; hoy: string }
  | { tipo: "resolver"; apoyo: boolean; hoy: string };

/** Null hasta que el cliente lee el almacenamiento: el servidor pinta el mazo sin donación. */
export function reducirDonacion(estado: EstadoDonacion | null, accion: AccionDonacion): EstadoDonacion | null {
  if (accion.tipo === "planificar") {
    const plan = planDonacion(accion.previo, accion.firma, accion.n, accion.hoy, accion.azar);
    if (accion.forzada === undefined) return plan;
    return { ...plan, edicion: { firma: accion.firma, posicion: accion.forzada, resuelta: false } };
  }
  if (!estado) return estado;
  return accion.tipo === "vista" ? marcarVista(estado, accion.hoy) : resolver(estado, accion.apoyo, accion.hoy);
}
