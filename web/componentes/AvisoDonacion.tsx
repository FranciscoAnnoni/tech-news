"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { registrarEvento } from "@/lib/analitica";
import { MONTO_SUGERIDO, URL_MERCADO_PAGO } from "@/lib/donacion";
import { despacharDonacion, planificarDonacion } from "@/lib/donacionCompartida";
import { diaDeBuenosAires } from "@/lib/edicion";
import { documentoVisible, seVeElDiario, suscribirDiario, suscribirVisibilidad } from "@/lib/visibilidad";
import estilos from "./AvisoDonacion.module.css";
import { useDonacion } from "./usarDonacion";

/**
 * Pedido de aporte en el Diario: un cupón recortable, como los de un diario de papel. Todo el cupón lleva a Mercado Pago. Sigue el mismo plan que la tarjeta
 * del Mazo (cada 3 días como mínimo, nunca el primer día, 30 días de pausa si aportó) y comparte su estado: lo que se
 * resuelve acá ya no aparece en el Mazo de esta edición. La ✕ lo cierra hasta la próxima vez que toque.
 */
export function AvisoDonacion({ firma, cantidad }: { firma: string; cantidad: number }) {
  useLayoutEffect(() => planificarDonacion(firma, cantidad), [firma, cantidad]);
  const { donacion, posicion } = useDonacion();
  const diario = useSyncExternalStore(suscribirDiario, seVeElDiario, () => false);
  const alFrente = useSyncExternalStore(suscribirVisibilidad, documentoVisible, () => false);
  const seVe = diario && alFrente;
  const contexto = { posicion: posicion ?? 0, cantidad_tarjetas: cantidad, superficie: "diario" as const };

  useEffect(() => {
    if (!seVe || posicion === null) return;
    // Una vez por día, igual que en el Mazo.
    const hoy = diaDeBuenosAires(new Date());
    if (donacion?.ultimaVista === hoy) return;
    registrarEvento("donacion_vista", { posicion, cantidad_tarjetas: cantidad, superficie: "diario" });
    despacharDonacion({ tipo: "vista", hoy });
  }, [cantidad, donacion?.ultimaVista, posicion, seVe]);

  if (posicion === null) return null;

  const resolver = (apoyo: boolean) => despacharDonacion({ tipo: "resolver", apoyo, hoy: diaDeBuenosAires(new Date()) });

  return (
    <aside className={estilos.cupon} aria-label="Apoyá a Infomate" data-prueba="donacion-diario">
      <span className={estilos.tijera} aria-hidden="true">✂</span>
      <button
        className={estilos.cerrar}
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          registrarEvento("donacion_descartada", contexto);
          resolver(false);
        }}
      >
        ✕
      </button>
      <div className={estilos.vale}>
        <b>{MONTO_SUGERIDO}</b>
        <span>de apoyo</span>
      </div>
      <div>
        <p className={estilos.titulo}>Recortá y bancá a Infomate</p>
        <p className={estilos.texto}>Dos personas, a pulmón, todos los días. Tu aporte paga los servidores.</p>
      </div>
      {/* El ::after del link cubre todo el cupón: cualquier parte lleva a Mercado Pago, menos la ✕. */}
      <a
        className={estilos.apoyar}
        href={URL_MERCADO_PAGO}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          registrarEvento("donacion_abierta", contexto);
          resolver(true);
        }}
      >
        APOYAR
      </a>
    </aside>
  );
}
