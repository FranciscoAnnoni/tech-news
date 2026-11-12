"use client";

import { useSyncExternalStore } from "react";
import { posicionPendiente } from "@/lib/donacion";
import { leerEstadoDonacion, suscribirDonacion } from "@/lib/donacionCompartida";
import { esEquipo, suscribirEquipo } from "@/lib/equipo";
import { sinCambios } from "@/lib/visibilidad";

/**
 * Estado de la donación y si hay que pedirla. El modo equipo la esconde; `?donacion` la fuerza igual (ver posicionForzada).
 * `posicion` es cuántas noticias van antes en el Mazo; null si en esta carga no se pide.
 */
export function useDonacion() {
  const donacion = useSyncExternalStore(suscribirDonacion, leerEstadoDonacion, () => null);
  const equipo = useSyncExternalStore(suscribirEquipo, () => esEquipo(localStorage), () => false);
  const forzada = useSyncExternalStore(sinCambios, () => new URLSearchParams(window.location.search).has("donacion"), () => false);
  return { donacion, posicion: equipo && !forzada ? null : posicionPendiente(donacion) };
}
