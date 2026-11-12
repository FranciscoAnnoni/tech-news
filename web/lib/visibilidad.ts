import { CONSULTA_DIARIO } from "./portada";

/** Suscripciones para useSyncExternalStore. Solo en el cliente. */
export function suscribirVisibilidad(avisar: () => void) {
  document.addEventListener("visibilitychange", avisar);
  return () => document.removeEventListener("visibilitychange", avisar);
}
export const documentoVisible = () => document.visibilityState === "visible";
export const sinCambios = () => () => {};

// Fuera de los teléfonos la portada muestra el Diario y el Mazo queda oculto por CSS. Misma consulta que globals.css.
export function suscribirDiario(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_DIARIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}
export const seVeElDiario = () => window.matchMedia(CONSULTA_DIARIO).matches;
