import {
  guardarDonacion, leerDonacion, posicionForzada, reducirDonacion, type AccionDonacion, type EstadoDonacion,
} from "./donacion";
import { diaDeBuenosAires } from "./edicion";

/**
 * Estado de la donación compartido por el Mazo y el Diario. Los dos están montados a la vez en la portada (CSS decide
 * cuál se ve): con un estado cada uno, el último en escribir pisaba al otro en localStorage. Solo corre en el cliente.
 */
let estado: EstadoDonacion | null = null;
let planificada: string | null = null;
const oyentes = new Set<() => void>();

type Almacen = Pick<Storage, "getItem" | "setItem">;

export function despacharDonacion(accion: AccionDonacion, almacen: Almacen = localStorage): void {
  const siguiente = reducirDonacion(estado, accion);
  if (siguiente === estado) return;
  estado = siguiente;
  if (estado) guardarDonacion(almacen, estado);
  oyentes.forEach((oyente) => oyente());
}

/** Decide el plan de la edición una sola vez por carga, aunque lo pidan el Mazo y el Diario. */
export function planificarDonacion(
  firma: string, n: number,
  {
    almacen = localStorage as Almacen, busqueda = window.location.search, ahora = new Date(), azar = Math.random(),
    sorteo = Math.random(),
  }: { almacen?: Almacen; busqueda?: string; ahora?: Date; azar?: number; sorteo?: number } = {},
): void {
  if (planificada === firma) return;
  planificada = firma;
  const hoy = diaDeBuenosAires(ahora);
  // Sin almacenamiento cada visita parecería la primera y la vería siempre: se la trata como vista hoy.
  const previo = leerDonacion(almacen) ?? (sePuedeGuardar(almacen) ? null : { primerDia: hoy, ultimaVista: hoy });
  despacharDonacion({
    tipo: "planificar", previo, firma, n, hoy, azar, sorteo, forzada: posicionForzada(busqueda, n, azar),
  }, almacen);
}

function sePuedeGuardar(almacen: Almacen): boolean {
  try {
    almacen.setItem("infomate:prueba", "1");
    return almacen.getItem("infomate:prueba") === "1";
  } catch {
    return false;
  }
}

export const leerEstadoDonacion = (): EstadoDonacion | null => estado;

export function suscribirDonacion(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Solo para pruebas. */
export function reiniciarDonacionCompartida(): void {
  estado = null;
  planificada = null;
}
