"use client";

import { registrarEvento } from "@/lib/analitica";
import { contextoNoticia } from "@/lib/medicionMazo";
import type { TarjetaNoticia } from "@/lib/tipos";

/** Conserva la navegación nativa y mide solo activaciones observables. */
export function EnlaceFuente({ tarjeta, superficie, contexto, className }: {
  tarjeta: TarjetaNoticia;
  superficie: "capa" | "pagina";
  contexto?: () => { recorrido_id: string; posicion: number; cantidad_tarjetas: number };
  className?: string;
}) {
  const registrar = () => registrarEvento("fuente_abierta", { ...contextoNoticia(tarjeta), ...contexto?.(), superficie });
  return (
    <a className={className} href={tarjeta.link} target="_blank" rel="noopener noreferrer"
      onClick={registrar} onAuxClick={(evento) => { if (evento.button === 1) registrar(); }}>
      Leer en {tarjeta.fuente}
    </a>
  );
}
