"use client";

import { useEffect } from "react";
import { registrarEvento } from "@/lib/analitica";
import { suscribirConfirmacionesInstalacion } from "@/lib/instalacion";

/** Recibe confirmaciones del listener temprano sin inferirlas del modo standalone. */
export function AnaliticaInstalacion() {
  useEffect(() => suscribirConfirmacionesInstalacion(() => {
    registrarEvento("app_instalada", {});
  }), []);
  return null;
}
