/**
 * Modo equipo: marca este navegador como de quienes hacen Infomate para que no vea la tarjeta de donación.
 * Se activa y desactiva con TOQUES toques seguidos en el logo INFOMATE. No es un secreto ni da acceso a nada:
 * solo guarda un booleano en este navegador. La app instalada en iPhone tiene su propio almacenamiento.
 */
const CLAVE = "infomate:equipo";
export const TOQUES = 5;
/** Tiempo máximo entre un toque y el siguiente. */
export const ENTRE_TOQUES_MS = 800;

type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function esEquipo(almacen: Pick<Storage, "getItem">): boolean {
  try {
    return almacen.getItem(CLAVE) === "true";
  } catch {
    return false;
  }
}

/** Invierte el modo y devuelve cómo quedó. Si el almacenamiento falla, no cambia nada. */
export function alternarEquipo(almacen: Almacen): boolean {
  try {
    if (esEquipo(almacen)) almacen.removeItem(CLAVE);
    else almacen.setItem(CLAVE, "true");
  } catch {
    // Almacenamiento bloqueado: queda como estaba.
  }
  avisar();
  return esEquipo(almacen);
}

/** Suma un toque a la racha. Devuelve la racha nueva; al llegar a TOQUES, `completa` y la racha vuelve a cero. */
export function sumarToque(racha: { cantidad: number; ultimo: number }, ahora: number) {
  const cantidad = ahora - racha.ultimo <= ENTRE_TOQUES_MS ? racha.cantidad + 1 : 1;
  return cantidad >= TOQUES ? { cantidad: 0, ultimo: 0, completa: true } : { cantidad, ultimo: ahora, completa: false };
}

const oyentes = new Set<() => void>();
function avisar() {
  oyentes.forEach((oyente) => oyente());
}

/** Para useSyncExternalStore: avisa al cambiar en esta pestaña o en otra. */
export function suscribirEquipo(oyente: () => void) {
  oyentes.add(oyente);
  window.addEventListener("storage", oyente);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", oyente);
  };
}
