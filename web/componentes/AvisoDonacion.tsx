"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { registrarEvento } from "@/lib/analitica";
import { BOTON_DONACION, TEXTO_DONACION, TITULO_DONACION, URL_MERCADO_PAGO } from "@/lib/donacion";
import { despacharDonacion, planificarDonacion } from "@/lib/donacionCompartida";
import { diaDeBuenosAires } from "@/lib/edicion";
import { documentoVisible, seVeElDiario, suscribirDiario, suscribirVisibilidad } from "@/lib/visibilidad";
import estilos from "./AvisoDonacion.module.css";
import { AvisoDiarioPrototipo, useVariante } from "./PrototipoDonacion";
import { useDonacion } from "./usarDonacion";

/**
 * Pedido de aporte en el Diario: un recuadro como los avisos de un diario de papel. Sigue el mismo plan que la tarjeta
 * del Mazo (cada 3 días como mínimo, nunca el primer día, 30 días de pausa si aportó) y comparte su estado: lo que se
 * resuelve acá ya no aparece en el Mazo de esta edición. La ✕ lo cierra hasta la próxima vez que toque.
 */
export function AvisoDonacion({ firma, cantidad }: { firma: string; cantidad: number }) {
  useLayoutEffect(() => planificarDonacion(firma, cantidad), [firma, cantidad]);
  const { donacion, posicion } = useDonacion();
  // PROTOTIPO: ?variant=1..5 cambia el diseño del recuadro.
  const v = useVariante();
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

  if (v) {
    return (
      <AvisoDiarioPrototipo
        v={v}
        aportar={(texto, clase) => (
          <a className={clase} href={URL_MERCADO_PAGO} target="_blank" rel="noopener noreferrer"
            onClick={() => { registrarEvento("donacion_abierta", contexto); resolver(true); }}>{texto}</a>
        )}
        ahoraNo={(texto, clase) => (
          <button className={clase} type="button" aria-label="Cerrar"
            onClick={() => { registrarEvento("donacion_descartada", contexto); resolver(false); }}>{texto}</button>
        )}
      />
    );
  }

  return (
    <aside className={estilos.aviso} aria-label="Apoyá a Infomate" data-prueba="donacion-diario">
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
      <div className={estilos.texto}>
        <p className={estilos.volanta}>Infomate · Apoyo</p>
        <h2 className={estilos.titulo}>{TITULO_DONACION}</h2>
        <p className={estilos.cuerpo}>{TEXTO_DONACION}</p>
      </div>
      <a
        className={estilos.aportar}
        href={URL_MERCADO_PAGO}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          registrarEvento("donacion_abierta", contexto);
          resolver(true);
        }}
      >
        {BOTON_DONACION} →
      </a>
    </aside>
  );
}
