"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { estaInstalada, suscribirInstalacion } from "@/lib/instalacion";
import { ESTADO_INICIAL, reducirMazo, textoFin } from "@/lib/mazo";
import type { TarjetaNoticia } from "@/lib/tipos";
import { BotonCompartir } from "./BotonCompartir";
import { Detalle } from "./Detalle";
import { Guia } from "./Guia";
import { Tarjeta } from "./Tarjeta";
import estilosDetalle from "./Detalle.module.css";
import estilos from "./Mazo.module.css";

type Capa = { tipo: "detalle"; indice: number } | { tipo: "guia" } | null;

const PROFUNDIDAD = 3;

export function Mazo({ tarjetas }: { tarjetas: TarjetaNoticia[] }) {
  const [estado, despachar] = useReducer(reducirMazo, ESTADO_INICIAL);
  const [capa, setCapa] = useState<Capa>(null);
  const botonDescargar = useRef<HTMLButtonElement>(null);
  // Oculto hasta hidratar: una app ya instalada nunca muestra el botón.
  const instalada = useSyncExternalStore(suscribirInstalacion, estaInstalada, () => true);

  const n = tarjetas.length;
  const { indice } = estado;

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Sin https no hay service worker; la app funciona igual.
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  // Cada capa ocupa una entrada del historial: el botón atrás del celular la cierra.
  const abrirCapa = useCallback((nueva: NonNullable<Capa>) => {
    window.history.pushState({ capa: nueva.tipo }, "");
    setCapa(nueva);
  }, []);
  const cerrarCapa = useCallback(() => window.history.back(), []);

  useEffect(() => {
    if (!capa) return;
    const alVolver = () => {
      setCapa(null);
      if (capa.tipo === "detalle") despachar({ tipo: "avanzar", hasta: capa.indice + 1 });
      else botonDescargar.current?.focus();
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, [capa]);

  // appinstalled llega con la guía abierta.
  useEffect(() => {
    if (instalada && capa?.tipo === "guia") window.history.back();
  }, [instalada, capa]);

  const terminado = indice >= n;
  const visibles = tarjetas.slice(indice, indice + PROFUNDIDAD);

  return (
    <div className={estilos.mazo}>
      <header className={estilos.cabecera}>
        <span>INFOMATE</span>
        {!instalada && (
          <button ref={botonDescargar} className={estilos.descargar} type="button" onClick={() => abrirCapa({ tipo: "guia" })}>
            Descargar
          </button>
        )}
        <span className={estilos.cuenta} data-prueba="cuenta">
          {Math.min(indice + 1, n)}/{n}
        </span>
      </header>

      <div className={estilos.mesa}>
        {terminado ? (
          <div className={estilos.fin} data-prueba="fin">
            <h2>Terminaste.</h2>
            <p>{textoFin(estado)}</p>
            <button type="button" onClick={() => despachar({ tipo: "reiniciar" })}>
              Empezar de nuevo
            </button>
          </div>
        ) : (
          visibles
            .map((tarjeta, k) => (
              <Tarjeta
                key={tarjeta.id}
                tarjeta={tarjeta}
                profundidad={k}
                alMarcar={(direccion) =>
                  despachar({ tipo: "resolver", indice, resolucion: direccion > 0 ? "abierta" : "descartada" })
                }
                alTerminar={(direccion) => {
                  if (direccion > 0) abrirCapa({ tipo: "detalle", indice });
                  else despachar({ tipo: "avanzar", hasta: indice + 1 });
                }}
              />
            ))
            .reverse()
        )}
      </div>

      <footer className={estilos.pista} style={terminado ? { visibility: "hidden" } : undefined}>
        <span>← DESCARTAR</span>
        <span>ABRIR →</span>
      </footer>

      {capa?.tipo === "detalle" && (
        <Detalle
          tarjeta={tarjetas[capa.indice]}
          variante="capa"
          compartir={<BotonCompartir identificador={tarjetas[capa.indice].identificador} titulo={tarjetas[capa.indice].titulo} />}
          cierre={
            <button className={estilosDetalle.boton} type="button" onClick={cerrarCapa}>
              Volver y seguir
            </button>
          }
        />
      )}
      {capa?.tipo === "guia" && <Guia alCerrar={cerrarCapa} />}
    </div>
  );
}
